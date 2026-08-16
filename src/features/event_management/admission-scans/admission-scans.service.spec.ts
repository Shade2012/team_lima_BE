import { Test, TestingModule } from '@nestjs/testing';
import { AdmissionScansService } from './admission-scans.service';

describe('AdmissionScansService', () => {
  let service: AdmissionScansService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdmissionScansService],
    }).compile();

    service = module.get<AdmissionScansService>(AdmissionScansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
