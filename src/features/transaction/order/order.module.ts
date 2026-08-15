import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { EventModule } from 'src/features/event_management/event/event.module';
import { TicketCategoryModule } from 'src/features/event_management/ticket-category/ticket-category.module';
import { SeatModule } from 'src/features/event_management/seat/seat.module';
import { RedisIoModule } from 'src/redis/redis.module';
import { OrdersCleanupCron } from './jobs/order-cleanup-cron';
import { OrderExpiryProcessor } from './processor/order-expired.processor';
import { BullModule } from '@nestjs/bullmq';

@Module({
  controllers: [OrderController],
  providers: [
    OrderService,
    OrdersCleanupCron,
    OrderExpiryProcessor
  ],
  imports:[EventModule, TicketCategoryModule, SeatModule, RedisIoModule,
    BullModule.registerQueue({
      name:'order-expired'
    })
  ]
})
export class OrderModule {}
