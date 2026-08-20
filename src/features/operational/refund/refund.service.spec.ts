import { Test, TestingModule } from '@nestjs/testing';
import { RefundService } from './refund.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { MockPgService } from '../../transaction/mock-pg/mock-pg.service';
import { RedisService } from 'src/redis/type/commands';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus, RefundStatus, TicketStatus, Role } from '@prisma/client';
import { WalletService } from 'src/features/transaction/wallet/wallet.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { TicketService } from '../../transaction/ticket/ticket.service';

const mockPrismaService = {
  ticket: {
    findUnique: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  refund: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  order: {
    update: jest.fn(),
  },
  $transaction: jest.fn((cb) => cb(mockPrismaService)),
};

const mockMockPgService = {
  processRefund: jest.fn(),
};

const mockRedisService = {
  decrby: jest.fn(),
};

const mockWalletService = {
  refundToWallet: jest.fn().mockResolvedValue(true),
};

const mockTicketService = {
  updateStatus: jest.fn(),
};

describe('RefundService', () => {
  let service: RefundService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MockPgService, useValue: mockMockPgService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: WalletService, useValue: mockWalletService },
        { provide: TicketService, useValue: mockTicketService },
      ],
    }).compile();

    service = module.get<RefundService>(RefundService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestRefund', () => {
    it('should create a refund request if ticket is valid', async () => {
      const dto: CreateRefundDto = { ticketId: 'ticket-1', reason: 'sick' };
      
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        status: TicketStatus.AVAILABLE,
        order: { customerId: 'cust-1', status: OrderStatus.PAID },
        category: { price: 100000, event: { refundEndDate: new Date(Date.now() + 86400000), refundPercentage: 50 } },
      });
      mockPrismaService.refund.findUnique.mockResolvedValue(null);
      mockPrismaService.refund.create.mockResolvedValue({ id: 'refund-1' });

      const result = await service.requestRefund('cust-1', dto);

      expect(result).toEqual({ id: 'refund-1' });
      expect(mockPrismaService.refund.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket-1',
          reason: 'sick',
          amount: 50000,
          status: RefundStatus.PENDING,
        },
      });
    });

    it('should throw ForbiddenException if user does not own the ticket', async () => {
      const dto: CreateRefundDto = { ticketId: 'ticket-1', reason: 'sick' };
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 'ticket-1',
        order: { customerId: 'other-cust' },
      });

      await expect(service.requestRefund('cust-1', dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('approveRefund', () => {
    it('should approve refund, update ticket, order, and redis', async () => {
      mockPrismaService.refund.findUnique.mockResolvedValue({
        id: 'refund-1',
        status: RefundStatus.PENDING,
        amount: 50000,
        ticketId: 'ticket-1',
        ticket: { status: TicketStatus.AVAILABLE, orderId: 'order-1', categoryId: 'cat-1', order: { customerId: 'cust-1' } },
      });
      
      mockPrismaService.refund.update.mockResolvedValue({ id: 'refund-1', status: RefundStatus.APPROVED });
      mockPrismaService.ticket.count.mockResolvedValue(0); // 0 active tickets left -> FULL_REFUND

      const result = await service.approveRefund('refund-1', 'admin-1');

      expect(result.status).toBe(RefundStatus.APPROVED);
      expect(mockWalletService.refundToWallet).toHaveBeenCalled();
      expect(mockPrismaService.refund.update).toHaveBeenCalled();
      expect(mockTicketService.updateStatus).toHaveBeenCalledWith(
        mockPrismaService,
        TicketStatus.REFUND,
        'ticket-1',
        'admin-1'
      );
      expect(mockPrismaService.order.update).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        data: { status: OrderStatus.FULL_REFUND },
      });
      expect(mockRedisService.decrby).toHaveBeenCalledWith('category:cat-1:sold', 1);
    });

    it('should throw BadRequestException if refund is not PENDING', async () => {
      mockPrismaService.refund.findUnique.mockResolvedValue({
        id: 'refund-1',
        status: RefundStatus.APPROVED,
      });

      await expect(service.approveRefund('refund-1', 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectRefund', () => {
    it('should reject a pending refund', async () => {
      mockPrismaService.refund.findUnique.mockResolvedValue({
        id: 'refund-1',
        status: RefundStatus.PENDING,
      });
      mockPrismaService.refund.update.mockResolvedValue({ id: 'refund-1', status: RefundStatus.REJECTED });

      const result = await service.rejectRefund('refund-1', 'reject reason', 'admin-1');

      expect(result.status).toBe(RefundStatus.REJECTED);
      expect(mockPrismaService.refund.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ status: RefundStatus.REJECTED, rejectReason: 'reject reason' }),
      }));
    });
  });
});
