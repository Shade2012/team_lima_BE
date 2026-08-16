import { Module } from '@nestjs/common';
import { AdmissionScansService } from './admission-scans.service';
import { AdmissionScansController } from './admission-scans.controller';

@Module({
  controllers: [AdmissionScansController],
  providers: [AdmissionScansService],
})
export class AdmissionScansModule {}
