import { Test, TestingModule } from '@nestjs/testing';
import { AdmissionScansService } from './admission-scans.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TicketService } from 'src/features/transaction/ticket/ticket.service';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, TicketStatus } from '@prisma/client';

describe('AdmissionScansService', () => {
  let service: AdmissionScansService;

  let prisma: {
    $transaction: jest.Mock;
    user: {
      findUnique: jest.Mock;
    };
  };

  let ticketService: {
    validateTicketScans: jest.Mock;
    updateStatus: jest.Mock;
  };

  const payload = {
    sub: 'operator-123',
  };

  const dto = {
    ticketId: 'ticket-123',
  };

  const operator = {
    id: 'operator-123',
    email: 'operator@example.com',
    role: 'GATE_OPERATOR',
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    ticketService = {
      updateStatus: jest.fn(),
      validateTicketScans: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdmissionScansService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: TicketService,
          useValue: ticketService,
        },
      ],
    }).compile();

    service = module.get<AdmissionScansService>(
      AdmissionScansService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('scan', () => {
    it('should scan successfully', async () => {
      jest
        .spyOn(service, 'validateOperator')
        .mockResolvedValue(operator as any);

      jest
        .spyOn(service, 'createScan')
        .mockResolvedValue(undefined);

      ticketService.validateTicketScans.mockResolvedValue({
        id: dto.ticketId,
        status: TicketStatus.AVAILABLE,
        order: {
          status: OrderStatus.PAID,
        },
      });

      ticketService.updateStatus.mockResolvedValue(undefined);

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback(prisma);
      });

      const result = await service.scan(payload as any, dto as any);
      
      expect(result).toBe('Success scans');

      expect(service.validateOperator).toHaveBeenCalledWith(
        payload.sub,
      );

      expect(
        ticketService.validateTicketScans,
      ).toHaveBeenCalledWith(dto.ticketId);

      expect(service.createScan).toHaveBeenCalledWith(
        prisma,
        operator,
        dto.ticketId,
      );

      expect(ticketService.updateStatus).toHaveBeenCalledWith(
        prisma,
        TicketStatus.SEATED,
        dto.ticketId,
        operator.id,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw when ticket must be paid', async () => {
      jest
        .spyOn(service, 'validateOperator')
        .mockResolvedValue(operator as any);

      ticketService.validateTicketScans.mockRejectedValue(
        new ConflictException(
          `Ticket must be paid (current status: ${OrderStatus.PENDING})`,
        ),
      );

      await expect(
        service.scan(payload as any, dto as any),
      ).rejects.toThrow(
        new ConflictException(
          `Ticket must be paid (current status: ${OrderStatus.PENDING})`,
        ),
      );

      expect(
        ticketService.validateTicketScans,
      ).toHaveBeenCalledWith(dto.ticketId);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw when ticket has already been scanned', async () => {
      jest
        .spyOn(service, 'validateOperator')
        .mockResolvedValue(operator as any);

      ticketService.validateTicketScans.mockRejectedValue(
        new ConflictException(
          'Ticket has already been scanned',
        ),
      );

      await expect(
        service.scan(payload as any, dto as any),
      ).rejects.toThrow(
        new ConflictException(
          'Ticket has already been scanned',
        ),
      );

      expect(
        ticketService.validateTicketScans,
      ).toHaveBeenCalledWith(dto.ticketId);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw when ticket is no longer available', async () => {
      jest
        .spyOn(service, 'validateOperator')
        .mockResolvedValue(operator as any);

      ticketService.validateTicketScans.mockRejectedValue(
        new ConflictException(
          `Ticket is no longer available (current status: ${TicketStatus.CANCELLED})`,
        ),
      );

      await expect(
        service.scan(payload as any, dto as any),
      ).rejects.toThrow(
        new ConflictException(
          `Ticket is no longer available (current status: ${TicketStatus.CANCELLED})`,
        ),
      );

      expect(
        ticketService.validateTicketScans,
      ).toHaveBeenCalledWith(dto.ticketId);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});