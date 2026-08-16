import { Module } from '@nestjs/common';
import { GateService } from './gate.service';
import { GateController } from './gate.controller';
import { EventModule } from 'src/features/event_management/event/event.module';
import { TicketModule } from 'src/features/transaction/ticket/ticket.module';
import { AdmissionScansModule } from '../admission-scans/admission-scans.module';

@Module({
  imports: [EventModule, TicketModule, AdmissionScansModule],
  controllers: [GateController],
  providers: [GateService],
  exports: [GateService],
})
export class GateModule {}
