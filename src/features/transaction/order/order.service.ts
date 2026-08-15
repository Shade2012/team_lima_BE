import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Payload } from 'src/utils/payload';
import { v7 as uuidv7 } from 'uuid';
import { EventService } from 'src/features/event/event.service';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/type/commands';
import { Prisma } from '@prisma/client';

@Injectable()
export class OrderService {

  constructor(
    @InjectQueue('order-expired') private readonly expiryQueue: Queue,
    private readonly redis:RedisService,
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
  ) {}

  async create(eventId: string, dto: CreateOrderDto, payload: Payload, idempotencyKey?: string) {

    const customerId = payload.sub;
    const { categoryCounts, totalAmount, luaPayload, salesEndTimeSec, uniqueCategoryIds } = await this.prepareOrderMetadata(eventId, dto.seats);

    const newOrderId = uuidv7();
    const orderKey = idempotencyKey 
      ? `order:idempotent:${idempotencyKey}`
      : `order:customer:${customerId}:event:${eventId}`;

    const categoryKeys = uniqueCategoryIds.map((catId) => `category:${catId}:held`);
    const allKeys = [orderKey, ...categoryKeys];

    let isReservedInRedis = false;
    
    try {
       // 1. Reserve seats via Lua
      const { statusCode, resultVal, extraInfo } = await this.reserveSeatsInRedis(
        orderKey,
        newOrderId,
        customerId,
        luaPayload,
        uniqueCategoryIds,
        salesEndTimeSec
      );

      // 2. Handle Reused/Existing Session
      if (statusCode === 2) {
        return this.handleExistingSession(resultVal);
      }

      // 3. Handle Errors
      if (statusCode === 0) {
        this.handleOrderError(resultVal, extraInfo ?? "Error");
      }

      isReservedInRedis = true;

      // 4. Create New DB Order
      const ttlSeconds = Number(resultVal);
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      const order = await this.prisma.order.create({
        data: {
          id: newOrderId,
          customerId,
          eventId,
          totalAmount,
          status: 'HELD',
          expiresAt,
          tickets: {
            createMany: {
              data: dto.seats.map((seat) => ({
                categoryId: seat.categoryId,
                seatId: seat.seatId,
                status: 'AVAILABLE',
              })),
            },
          },
        },
      });

    // 5. Schedule Expiry Queue
      await this.expiryQueue.add(
        'order-expired',
        { orderId: order.id, eventId, categoryCounts },
        { delay: ttlSeconds * 1000, jobId: `expire-${order.id}` },
      );

      return {
        orderId: order.id,
        status: order.status,
        expiresAt,
      };
    } catch (exception) {
      if (isReservedInRedis) {
        await this.rollbackReservation(allKeys,  luaPayload);
      }
      throw exception
    }
  }

  async findAll(payload:Payload) {
    await this.redis.flushall();
    const customerId = payload.sub;
    return this.prisma.order.findMany({
      where:{
        customerId:payload.sub
      }
    });
  }

  async findOne(id: number) {
    return `This action returns a #${id} order`;
  }

  update(id: number, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  async remove(id: number) {
    return `This action removes a #${id} order`;
  }

  async rollbackReservation(keys: string[], categoriesJson: string) {
    try {
      await this.redis.removeSeats(keys.length, ...keys, categoriesJson);
    } catch (rollbackError) {
      console.error('Failed to clear Redis reservation cache:', rollbackError);
    }
  }

  async cancelExpiredOrder(orderId: string, categoryCounts?: Record<string, number>): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        event: { select: { id:true, salesEndTime: true } },
        tickets: true,
      },
    });

    if (!order || !['HELD', 'PAYMENT_PENDING'].includes(order.status)) {
      return false; 
    }

    const isSalesEnded = new Date() >= order.event.salesEndTime;
    const orderStatus = 'CANCELLED';
    const ticketStatus = isSalesEnded ? 'EXPIRED' : 'CANCELLED';

    const [updatedOrder] = await this.prisma.$transaction([
      this.prisma.order.updateMany({
        where: {
          id: order.id,
          status: { in: ['HELD', 'PAYMENT_PENDING'] },
        },
        data: { status: orderStatus },
      }),
      this.prisma.ticket.updateMany({
        where: { orderId: order.id },
        data: { status: ticketStatus },
      }),
    ]);

    if (updatedOrder.count > 0) {
      const pipeline = this.redis.pipeline();

      if (!isSalesEnded) {
        const counts = categoryCounts || this.buildCategoryCountsFromTickets(order.tickets);
        for (const [catId, qty] of Object.entries(counts)) {
          pipeline.decrby(`category:${catId}:held`, qty);
        }
      }

      const orderKey = `order:customer:${order.customerId}:event:${order.eventId}`;
      pipeline.del(orderKey);
      
      await pipeline.exec();
      return true;
    }

    return false;
  }

  private async prepareOrderMetadata(eventId: string, seats: Array<{ categoryId: string; seatId: string }>) {
    const event = await this.eventService.findOne(eventId);
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Calculate Unix timestamp in seconds
    const salesEndTimeSec = Math.floor(new Date(event.salesEndTime).getTime() / 1000);

    // Count seats per category
    const categoryCounts = new Map<string, number>();
    for (const seat of seats) {
      categoryCounts.set(
        seat.categoryId,
        (categoryCounts.get(seat.categoryId) || 0) + 1,
      );
    }

    const uniqueCategoryIds = Array.from(categoryCounts.keys());
    let totalAmount = 0;

    // Build category payload matching Lua array ordering
    const luaPayloadArray = uniqueCategoryIds.map((catId) => {
    const category = event.categories.find((cat) => cat.id === catId);
      
    if (!category) {
      throw new BadRequestException(`Category ${catId} does not exist for this event`);
    }

    const qty = categoryCounts.get(catId)!;
    totalAmount += Number(category.price) * qty;

    return {
      id: catId,
      qty,
      quota: category.totalQuota,
    };
  });

  return {
    categoryCounts,
    totalAmount,
    luaPayload: JSON.stringify(luaPayloadArray), // Stringified once here
    salesEndTimeSec,
      uniqueCategoryIds,
    };
  }

  private async reserveSeatsInRedis(
    orderKey: string,
    orderId: string,
    customerId: string,
    luaPayloadJson: string, // Already stringified JSON string
    uniqueCategoryIds: string[], // Pass unique category IDs directly
    salesEndTimeSec: number, // Unix timestamp in seconds
  ) {
    const holdTimeInSeconds = 900; // 15 minutes hold

    // 1. Construct KEYS: [orderKey, category:cat1:held, category:cat2:held...]
    const keys = [
      orderKey,
      ...uniqueCategoryIds.map((catId) => `category:${catId}:held`),
    ];

    // 2. Construct ARGV matching Lua script expectations
    const args = [
      orderId,
      customerId,
      String(salesEndTimeSec),
      String(holdTimeInSeconds),
      luaPayloadJson, // Pass directly without re-stringifying
    ];

    // 3. Execute Redis Lua Script
      const [statusCode, resultVal, extraInfo] = await this.redis.reserveSeats(
        keys.length,
        ...keys,
        ...args,
      );

      return { statusCode, resultVal, extraInfo };
  }

  private async handleExistingSession(existingOrderId: string) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id: existingOrderId },
    });

    if (existingOrder && ['HELD', 'PAYMENT_PENDING'].includes(existingOrder.status)) {
      return {
        orderId: existingOrder.id,
        status: existingOrder.status,
        // checkoutUrl: paymentSession.checkoutUrl,
        expiresAt: existingOrder.expiresAt,
        isReusedSession: true,
      };
    }

    throw new ConflictException('Previous session has expired or been cancelled.');
  }

  private handleOrderError(resultVal: string, extraInfo: string) {
    if (resultVal === 'QUOTA_EXCEEDED') {
      throw new ConflictException(`Quota exceeded for category: ${extraInfo}`);
    }
    throw new BadRequestException(`Order failed: ${resultVal}`);
  }

  private buildCategoryCountsFromTickets(tickets: Array<{ categoryId: string }>) {
    const counts: Record<string, number> = {};
    for (const ticket of tickets) {
      counts[ticket.categoryId] = (counts[ticket.categoryId] || 0) + 1;
    }
    return counts;
  }
}
