// src/orders/crons/orders-cleanup.cron.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrdersCleanupCron {
  private readonly logger = new Logger(OrdersCleanupCron.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('order-expired') private readonly expiryQueue: Queue,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleStaleHeldOrders() {
    const staleOrders = await this.prisma.order.findMany({
      where: {
        status: { in: ['HELD', 'PAYMENT_PENDING'] },
        expiresAt: { lte: new Date() },
      },
      select: { id: true },
      take: 1000,
    });

    if (staleOrders.length === 0) return;

    const jobs = staleOrders.map((order) => ({
      name: 'order-expired',
      data: { orderId: order.id }, 
      opts: { jobId: `cron-cleanup:${order.id}` }, 
    }));

    await this.expiryQueue.addBulk(jobs);
    this.logger.log(`Cron: Pushed ${jobs.length} stale orders to queue.`);
  }
}