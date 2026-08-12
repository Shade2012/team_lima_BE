import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { BullModule } from '@nestjs/bullmq';
import { TICKET_QUEUE } from './constants/ticket.constant';

@Module({
  imports:[
    BullModule.registerQueue({
      name:TICKET_QUEUE
    })
  ],
  controllers: [TicketController],
  providers: [TicketService],
})
export class TicketModule {}
