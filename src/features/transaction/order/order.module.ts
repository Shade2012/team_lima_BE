import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { EventModule } from 'src/features/event/event.module';
import { TicketCategoryModule } from 'src/features/ticket-category/ticket-category.module';

@Module({
  controllers: [OrderController],
  providers: [OrderService],
  imports:[EventModule, TicketCategoryModule]
})
export class OrderModule {}
