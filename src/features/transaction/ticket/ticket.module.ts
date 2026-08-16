import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { GateModule } from 'src/features/event_management/gate/gate.module';

@Module({
  imports:[GateModule],
  controllers: [TicketController],
  providers: [TicketService],
  exports:[TicketService]
})
export class TicketModule {}
