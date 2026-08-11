import { Module } from '@nestjs/common';
import { SeatService } from './seat.service';
import { SeatController } from './seat.controller';
import { EventModule } from 'src/features/event/event.module';
import { TicketCategoryModule } from 'src/features/ticket-category/ticket-category.module';

@Module({
  imports: [EventModule, TicketCategoryModule],
  controllers: [SeatController],
  providers: [SeatService],
  exports: [SeatService],
})
export class SeatModule {}
