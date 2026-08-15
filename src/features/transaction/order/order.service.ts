import { BadRequestException, ConflictException, forwardRef, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { Payload } from 'src/utils/payload';
import { v7 as uuidv7 } from 'uuid';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/type/commands';
import { OrderStatus, Prisma } from '@prisma/client';
import { EventService } from 'src/features/event_management/event/event.service';
import { MockPgService } from '../mock-pg/mock-pg.service';
import { PaymentService } from '../payment/payment.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectQueue('order-expired') private readonly expiryQueue: Queue,
    private readonly redis:RedisService,
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
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


      return await this.paymentService.createCheckoutSession(order.id, payload.sub)
    } catch (exception) {
      if (isReservedInRedis) {
        await this.rollbackReservation(allKeys,  luaPayload);
      }
      throw exception
    }
  }

  async findAll(payload:Payload) {
    const orders = this.prisma.order.findMany({
      where:{
        customerId:payload.sub
      },
      include:{
        tickets:{
          include:{
            category:true
          }
        }
      }
    });

    if(!orders){
      throw new NotFoundException("Orders not found")
    }
    return orders
  }

  async markAsPaymentPending(orderId: string, customerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, customerId },
      include: { event: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status !== 'HELD') {
      throw new BadRequestException(`Order cannot move to payment from ${order.status} state`);
    }
    
    const orderKey = `order:customer:${customerId}:event:${order.eventId}`;
    const endSalesTimestamp = Math.floor(new Date(order.event.salesEndTime).getTime() / 1000);
    const extensionSeconds = 900; 

    const [status, resultVal] = await this.redis.extendsPaymentPending(
      1,
      orderKey,
      String(endSalesTimestamp),
      String(extensionSeconds),
    );

    if (status === 0) {
      throw new BadRequestException(`Failed to extend hold: ${resultVal}`);
    }

    const newTtlSeconds = Number(resultVal);
    const newExpiresAt = new Date(Date.now() + newTtlSeconds * 1000);

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAYMENT_PENDING',
        expiresAt: newExpiresAt,
      },
    });

    await this.expiryQueue.remove(`expire-${orderId}`);
    await this.expiryQueue.add(
      'order-expired',
      { orderId, eventId: order.eventId },
      {
        delay: newTtlSeconds * 1000,
        jobId: `expire-${orderId}`,
      },
    );

    return updatedOrder;
  }

  async clear() {
    await this.redis.flushall('ASYNC');
  }

  async findOne(id: string, customerId: string) {
    const order = await this.prisma.order.findUnique({
      where:{
        id
      },
      include:{
        customer:true
      }
    })
    if(!order || order.customer?.id !== customerId){
      throw new NotFoundException('Order not found')
    }
    return order
  }

  async updateOrderStatus(orderId:string, status: OrderStatus){
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: status,
      },
    });
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
      event: { select: { id: true, salesEndTime: true } },
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
      const orderKey = `order:customer:${order.customerId}:event:${order.eventId}`;

      if (!isSalesEnded) {
        const hasCounts = categoryCounts && Object.keys(categoryCounts).length > 0;
        const counts = hasCounts 
          ? categoryCounts 
          : this.buildCategoryCountsFromTickets(order.tickets);

        const uniqueCatIds = Object.keys(counts);
        const categoryKeys = uniqueCatIds.map((catId) => `category:${catId}:held`);
        const allKeys = [orderKey, ...categoryKeys];

        const luaPayload = JSON.stringify(
          uniqueCatIds.map((id) => ({ id, qty: counts[id] }))
        );
        try {
          await this.redis.removeSeats(allKeys.length, ...allKeys, luaPayload);
        } catch (redisErr) {
          const pipeline = this.redis.pipeline();
          for (const [catId, qty] of Object.entries(counts)) {
            pipeline.decrby(`category:${catId}:held`, qty);
          }
          pipeline.del(orderKey);
          await pipeline.exec();
        }
      } else {
        await this.redis.del(orderKey);
      }
      return true;
    }
    return false;
  }

  private async prepareOrderMetadata(eventId: string, seats: Array<{ categoryId: string; seatId: string }>) {
    const event = await this.eventService.findOne(eventId);
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }
    const salesEndTimeSec = Math.floor(new Date(event.salesEndTime).getTime() / 1000);

    const categoryCounts = new Map<string, number>();
    for (const seat of seats) {
      categoryCounts.set(
        seat.categoryId,
        (categoryCounts.get(seat.categoryId) || 0) + 1,
      );
    }

    const uniqueCategoryIds = Array.from(categoryCounts.keys());
    let totalAmount = 0;

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
    luaPayload: JSON.stringify(luaPayloadArray),
    salesEndTimeSec,
      uniqueCategoryIds,
    };
  }

  private async reserveSeatsInRedis(
    orderKey: string,
    orderId: string,
    customerId: string,
    luaPayloadJson: string,
    uniqueCategoryIds: string[],
    salesEndTimeSec: number, // Unix timestamp in seconds
  ) {
    const holdTimeInSeconds = 900; 

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
      const { orderId, checkoutUrl } = await this.paymentService.existingCheckoutSession(existingOrder.id, existingOrder.customerId)
      return {
        orderId: existingOrder.id,
        status: existingOrder.status,
        checkoutUrl: checkoutUrl,
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
