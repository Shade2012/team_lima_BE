import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports:[],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
