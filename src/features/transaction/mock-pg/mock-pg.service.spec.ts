import { Test, TestingModule } from '@nestjs/testing';
import { MockPgService } from './mock-pg.service';
import { PaymentService } from '../payment/payment.service';
import { OrderService } from '../order/order.service';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { PaymentMethod, OrderStatus } from '@prisma/client';
import { RedisService } from 'src/redis/type/commands';
import { SseService } from '../../sse/sse.service';
import { PrismaService } from 'src/prisma/prisma.service';

const mockPaymentService = {
  processPaymentSuccess: jest.fn(),
};

const mockOrdersService = {
  validateOrderPaid: jest.fn(),
  paidOrder: jest.fn(),
};

const mockRedisService = {};
const mockSseService = {
  emitSeatUpdate: jest.fn(),
  emitDashboardUpdate: jest.fn(),
};
const mockPrismaService = {
  order: { findUnique: jest.fn() },
};

describe('MockPgService', () => {
  let service: MockPgService;
  let paymentService: typeof mockPaymentService;
  let ordersService: typeof mockOrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MockPgService,
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: OrderService, useValue: mockOrdersService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: SseService, useValue: mockSseService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MockPgService>(MockPgService);
    paymentService = mockPaymentService;
    ordersService = mockOrdersService;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTransaction', () => {
    it('should create an encoded token containing paymentId and orderId', async () => {
      const dto: CreateTransactionDto = {
        paymentId: 'pay-123',
        orderId: 'order-123',
        amount: 100000,
      };

      const result = await service.createTransaction(dto);

      expect(result).toHaveProperty('providerTrxId');
      expect(result).toHaveProperty('checkoutUrl');
      
      const decodedString = Buffer.from(result.providerTrxId, 'base64').toString('utf-8');
      const tokenData = JSON.parse(decodedString);
      
      expect(tokenData).toEqual({
        paymentId: 'pay-123',
        orderId: 'order-123',
      });
      expect(result.checkoutUrl).toBe(`https://mock-pg.team-lima.com/checkout/${result.providerTrxId}`);
    });
  });

  describe('simulatePayment', () => {
    it('should successfully decode token and call internal services (Happy Path)', async () => {
      const tokenPayload = { paymentId: 'pay-123', orderId: 'order-123' };
      const validToken = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

      const dto: SimulatePaymentDto = {
        providerTrxId: validToken,
        paymentMethod: PaymentMethod.OVO,
      };

      paymentService.processPaymentSuccess.mockResolvedValue(undefined);
      ordersService.validateOrderPaid.mockResolvedValue({ id: 'order-123' });
      ordersService.paidOrder.mockResolvedValue(undefined);
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-123',
        eventId: 'event-123',
        tickets: [{ seatId: 'seat-123', categoryId: 'cat-123', seat: { seatCode: 'A1' } }]
      });

      const result = await service.simulatePayment(dto);

      expect(result).toBe(true);

      expect(paymentService.processPaymentSuccess).toHaveBeenCalledWith(
        'pay-123',
        validToken,
        PaymentMethod.OVO,
      );
      expect(ordersService.paidOrder).toHaveBeenCalledWith({ id: 'order-123' });
    });

    it('should throw BadRequestException if token is invalid or missing IDs', async () => {
      const invalidToken = 'not-a-base64-json';
      const dto: SimulatePaymentDto = {
        providerTrxId: invalidToken,
        paymentMethod: PaymentMethod.OVO,
      };

      await expect(service.simulatePayment(dto)).rejects.toThrow(BadRequestException);

      // valid base64 tapi miss IDs
      const missingIdsPayload = { someOtherField: '123' };
      const missingIdsToken = Buffer.from(JSON.stringify(missingIdsPayload)).toString('base64');
      const dto2: SimulatePaymentDto = {
        providerTrxId: missingIdsToken,
        paymentMethod: PaymentMethod.OVO,
      };

      await expect(service.simulatePayment(dto2)).rejects.toThrow(BadRequestException);

      expect(paymentService.processPaymentSuccess).not.toHaveBeenCalled();
      expect(ordersService.validateOrderPaid).not.toHaveBeenCalled();
      expect(ordersService.paidOrder).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException if an internal service fails', async () => {
      const tokenPayload = { paymentId: 'pay-123', orderId: 'order-123' };
      const validToken = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
      const dto: SimulatePaymentDto = {
        providerTrxId: validToken,
        paymentMethod: PaymentMethod.OVO,
      };

      paymentService.processPaymentSuccess.mockRejectedValue(new Error('DB Error'));

      await expect(service.simulatePayment(dto)).rejects.toThrow('DB Error');
    });
  });
});
