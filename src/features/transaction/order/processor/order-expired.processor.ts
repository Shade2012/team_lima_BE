// src/orders/processors/order-expiry.processor.ts
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { OrderService } from '../order.service';


@Processor('order-expired')
@Injectable()
export class OrderExpiryProcessor extends WorkerHost {
  constructor(private readonly orderService: OrderService) {
    super();
  }

  async process(job: Job<{ orderId: string; categoryCounts: Record<string, number> }>): Promise<void> {
    const { orderId, categoryCounts } = job.data;
    await this.orderService.cancelExpiredOrder(orderId, categoryCounts);
  }
}