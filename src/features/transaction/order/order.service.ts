import { BadRequestException, ConflictException, forwardRef, Inject, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { Payload } from 'src/utils/payload';
import { v7 as uuidv7 } from 'uuid';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/type/commands';
import { Order, OrderStatus, Prisma } from '@prisma/client';
import { EventService } from 'src/features/event_management/event/event.service';
import { PaymentService } from '../payment/payment.service';
import { TicketService } from '../ticket/ticket.service';
import { createReservationFingerprint, createReservationFingerprintData } from 'src/utils/order_fingerprint_helper';
import { OrderWithTickets } from './constant/order-with-ticket';
import { SseService } from '../../sse/sse.service';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  private static readonly RESERVATION_HOLD_SECONDS = 900;

  constructor(
    @InjectQueue('order-expired') private readonly expiryQueue: Queue,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
    private readonly eventService: EventService,
    private readonly ticketService: TicketService,
    private readonly sseService: SseService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
  ) {}

  async findOne(id: string, customerId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!order || order.customer?.id !== customerId) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async findAll(payload: Payload) {
    return this.prisma.order.findMany({
      where: { customerId: payload.sub },
      include: { tickets: { include: { category: true } } },
    });
  }

  async create(eventId: string, dto: CreateOrderDto, payload: Payload, reservationKey?: string) {
    const customerId = payload.sub;
    const { categoryCounts, totalAmount, luaPayload, salesEndTimeSec, uniqueCategoryIds } =
    await this.prepareOrderMetadata(eventId, dto.seats);

    await this.ensureCategoryInventory(eventId, uniqueCategoryIds);

    const fingerprint = createReservationFingerprint(
      createReservationFingerprintData(customerId, eventId, dto.seats),
    );

    const newOrderId = uuidv7();
    const orderKey = reservationKey
      ? `order:idempotent:${reservationKey}`
      : `order:customer:${customerId}:event:${eventId}:${fingerprint}`;

    const rollbackKeys = this.buildHeldReservationKeys(orderKey, uniqueCategoryIds);

    let isReservedInRedis = false;

    try {
      const { statusCode, resultVal, extraInfo } = await this.reserveSeatsInRedis(
        orderKey,
        newOrderId,
        customerId,
        luaPayload,
        uniqueCategoryIds,
        salesEndTimeSec,
      );

      if (statusCode === 2) {
        return this.handleExistingSession(resultVal);
      }

      if (statusCode === 0) {
        this.handleOrderError(resultVal, extraInfo ?? 'Error');
      }

      isReservedInRedis = true;

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
          reservationKey: orderKey,
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

      await this.scheduleExpiry(order.id, eventId, ttlSeconds, categoryCounts);

      const orderWithSeats = await this.prisma.order.findUnique({
        where: { id: order.id },
        include: { tickets: { include: { seat: true } } },
      });

      if (orderWithSeats) {
        this.sseService.emitSeatUpdate(
          eventId,
          orderWithSeats.tickets.map((t) => ({
            seatId: t.seatId,
            seatCode: t.seat?.seatCode ?? null,
            categoryId: t.categoryId,
            status: 'HELD',
          })),
        );
        this.sseService.emitDashboardUpdate(eventId, 'ORDER_CREATED');
      }

      return await this.paymentService.createCheckoutSession(order.id, payload.sub);
    } catch (exception) {
      if (isReservedInRedis) {
        await this.rollbackReservation(rollbackKeys, luaPayload);
      }
      throw exception;
    }
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

    const orderKey = order.reservationKey!;
    const endSalesTimestamp = Math.floor(new Date(order.event.salesEndTime).getTime() / 1000);

    const [status, resultVal] = await this.redis.extendsPaymentPending(
      1,
      orderKey,
      String(endSalesTimestamp),
      String(OrderService.RESERVATION_HOLD_SECONDS),
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

    await this.rescheduleExpiry(orderId, order.eventId, newTtlSeconds);

    return updatedOrder;
  }

  async clear() {
    await this.redis.flushall('ASYNC');
  }

  async validateOrderPaid(orderId: string){
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: {
          select: { id: true, categoryId: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status !== OrderStatus.PAYMENT_PENDING) {
      throw new BadRequestException('Order cannot be paid');
    }
    return order
  }

  async paidOrder(order: OrderWithTickets): Promise<void> {
    const categoryCounts = this.countByCategory(order.tickets, (ticket) => ticket.categoryId);
    const categoryIds = [...categoryCounts.keys()];
    const redisKeys = this.buildFullReservationKeys(order.reservationKey!, categoryIds);

    await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.updateMany({
        where: { id: order.id, status: OrderStatus.PAYMENT_PENDING },
        data: { status: OrderStatus.PAID },
      });

      if (updatedOrder.count === 0) {
        throw new BadRequestException('Order is no longer payment pending');
      }
    });

    const [status, result] = await this.redis.soldSeat(redisKeys.length, ...redisKeys);

    if (Number(status) !== 1) {
      throw new InternalServerErrorException(`Failed to finalize Redis reservation: ${result}`);
    }
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
        tickets: { include: { seat: true } },
      },
    });

    if (!order || !this.isCancellableOrder(order.status)) {
      return false;
    }

    const isSalesEnded = new Date() >= order.event.salesEndTime;
    const ticketStatus = isSalesEnded ? 'EXPIRED' : 'CANCELLED';

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      const result = await tx.order.updateMany({
        where: { id: order.id, status: { in: ['HELD', 'PAYMENT_PENDING'] } },
        data: { status: 'CANCELLED' },
      });

      await this.ticketService.updateStatuses(
        tx,
        ticketStatus,
        order.tickets.map((ticket) => ticket.id),
      );

      return result;
    });

    if (updatedOrder.count === 0) {
      return false;
    }

    const orderKey = order.reservationKey!;

    if (isSalesEnded) {
      await this.redis.del(orderKey);
      this.emitOrderCancelledSse(order, isSalesEnded);
      return true;
    }

    const counts = categoryCounts && Object.keys(categoryCounts).length > 0
      ? new Map(Object.entries(categoryCounts))
      : this.countByCategory(order.tickets, (ticket) => ticket.categoryId);

    const allKeys = this.buildHeldReservationKeys(orderKey, [...counts.keys()]);
    const luaPayload = this.buildLuaPayload(counts);

    try {
      await this.redis.removeSeats(allKeys.length, ...allKeys, luaPayload);
    } catch (redisErr) {
      await this.fallbackRemoveHeldSeats(orderKey, counts);
    }

    this.emitOrderCancelledSse(order, isSalesEnded);

    return true;
  }

  private emitOrderCancelledSse(order: any, isSalesEnded: boolean) {
    this.sseService.emitSeatUpdate(
      order.eventId,
      order.tickets.map((t: any) => ({
        seatId: t.seatId,
        seatCode: t.seat?.seatCode ?? null,
        categoryId: t.categoryId,
        status: 'AVAILABLE',
      }))
    );
    this.sseService.emitDashboardUpdate(
      order.eventId,
      isSalesEnded ? 'ORDER_EXPIRED' : 'ORDER_CANCELLED'
    );
  }

  private async prepareOrderMetadata(eventId: string, seats: Array<{ categoryId: string; seatId?: string }>) {
    const event = await this.eventService.findOne(eventId);
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const salesEndTimeSec = Math.floor(new Date(event.salesEndTime).getTime() / 1000);
    const categoryCounts = this.countByCategory(seats, (seat) => seat.categoryId);
    const uniqueCategoryIds = [...categoryCounts.keys()];

    const findCategory = (categoryId: string) => {
      const category = event.categories.find((cat) => cat.id === categoryId);
      if (!category) {
        throw new BadRequestException(`Category ${categoryId} does not exist for this event`);
      }
      return category;
    };

    const totalAmount = uniqueCategoryIds.reduce((sum, categoryId) => {
      const category = findCategory(categoryId);
      return sum + Number(category.price) * categoryCounts.get(categoryId)!;
    }, 0);

    const luaPayload = this.buildLuaPayload(categoryCounts, (categoryId) => findCategory(categoryId).totalQuota);

    return { categoryCounts, totalAmount, luaPayload, salesEndTimeSec, uniqueCategoryIds };
  }

  private async reserveSeatsInRedis(
    orderKey: string,
    orderId: string,
    customerId: string,
    luaPayloadJson: string,
    uniqueCategoryIds: string[],
    salesEndTimeSec: number,
  ) {
    const keys = this.buildFullReservationKeys(orderKey, uniqueCategoryIds);
    const args = [
      orderId,
      customerId,
      String(salesEndTimeSec),
      String(OrderService.RESERVATION_HOLD_SECONDS),
      luaPayloadJson,
    ];

    const [statusCode, resultVal, extraInfo] = await this.redis.reserveSeats(keys.length, ...keys, ...args);
    return { statusCode, resultVal, extraInfo };
  }

  private async scheduleExpiry(orderId: string, eventId: string, ttlSeconds: number, categoryCounts?: Map<string, number>) {
    await this.expiryQueue.add(
      'order-expired',
      { orderId, eventId, categoryCounts },
      { delay: ttlSeconds * 1000, jobId: `expire-${orderId}` },
    );
  }

  private async rescheduleExpiry(orderId: string, eventId: string, ttlSeconds: number) {
    await this.expiryQueue.remove(`expire-${orderId}`);
    await this.scheduleExpiry(orderId, eventId, ttlSeconds);
  }

  private async fallbackRemoveHeldSeats(orderKey: string, counts: Map<string, number>) {
    const pipeline = this.redis.pipeline();
    for (const [categoryId, qty] of counts) {
      pipeline.decrby(this.heldKey(categoryId), qty);
    }
    pipeline.del(orderKey);
    await pipeline.exec();
  }

  private async handleExistingSession(existingOrderId: string) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id: existingOrderId },
    });

    if (existingOrder && ['HELD', 'PAYMENT_PENDING'].includes(existingOrder.status)) {
      const { orderId, checkoutUrl, providerTrxId } = await this.paymentService.existingCheckoutSession(
        existingOrder.id,
        existingOrder.customerId,
      );
      return {
        providerTrxId,
        orderId: existingOrder.id,
        status: existingOrder.status,
        totalAmount: existingOrder.totalAmount,
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

  private isCancellableOrder(status: OrderStatus): boolean {
    return status === 'HELD' || status === 'PAYMENT_PENDING';
  }

  private countByCategory<T>(items: T[], categoryIdOf: (item: T) => string): Map<string, number> {
    const counts = new Map<string, number>();
    for (const item of items) {
      const categoryId = categoryIdOf(item);
      counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
    }
    return counts;
  }

  private buildLuaPayload(counts: Map<string, number>, quotaOf?: (categoryId: string) => number): string {
    return JSON.stringify(
      [...counts.entries()].map(([id, qty]) => ({
        id,
        qty,
        ...(quotaOf ? { quota: quotaOf(id) } : {}),
      })),
    );
  }

  private heldKey(categoryId: string): string {
    return `category:${categoryId}:held`;
  }

  private soldKey(categoryId: string): string {
    return `category:${categoryId}:sold`;
  }

  private buildHeldReservationKeys(orderKey: string, categoryIds: string[]): string[] {
    return [orderKey, ...categoryIds.map((id) => this.heldKey(id))];
  }

  private buildFullReservationKeys(orderKey: string, categoryIds: string[]): string[] {
    return [
      orderKey,
      ...categoryIds.map((id) => this.heldKey(id)),
      ...categoryIds.map((id) => this.soldKey(id)),
    ];
  }

  async ensureCategoryInventory(eventId: string, categoryIds: string[]): Promise<void> {
    const event = await this.eventService.findOne(eventId);

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }
    const salesEndTimeSec = Math.floor(new Date(event.salesEndTime).getTime() / 1000);
    const nowSec = Math.floor(Date.now() / 1000);
    const ttl = salesEndTimeSec - nowSec;

    if (ttl <= 0) {
      throw new BadRequestException('Sales have ended');
    }

    for (const categoryId of categoryIds) {
      const soldKey = this.soldKey(categoryId);
      const exists = await this.redis.exists(soldKey);

      if (exists) {
        continue;
      }

      const soldQuantity = await this.prisma.ticket.count({
        where: { categoryId, status: 'AVAILABLE' },
      });
      await this.redis.set(soldKey, String(soldQuantity), 'EX', ttl);
    }
  }
}