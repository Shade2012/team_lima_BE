import { Test, TestingModule } from '@nestjs/testing';
import { AdmissionScansService } from './admission-scans.service';

import { PrismaService } from 'src/prisma/prisma.service';
import { TicketService } from 'src/features/transaction/ticket/ticket.service';

describe('AdmissionScansService', () => {
  let service: AdmissionScansService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionScansService,
        { provide: PrismaService, useValue: {} },
        { provide: TicketService, useValue: {} },
      ],
    }).compile();

    service = module.get<AdmissionScansService>(AdmissionScansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
