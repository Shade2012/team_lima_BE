import { Module } from '@nestjs/common';
import { AdmissionScansService } from './admission-scans.service';
import { AdmissionScansController } from './admission-scans.controller';
import { TicketModule } from 'src/features/transaction/ticket/ticket.module';

@Module({
  imports: [TicketModule],
  controllers:[AdmissionScansController],
  providers: [AdmissionScansService],
  exports: [AdmissionScansService]
})
export class AdmissionScansModule {}
