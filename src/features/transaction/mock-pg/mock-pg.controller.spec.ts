import { Test, TestingModule } from '@nestjs/testing';
import { MockPgController } from './mock-pg.controller';
import { MockPgService } from './mock-pg.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { PaymentMethod } from '@prisma/client';

const mockMockPgService = {
  createTransaction: jest.fn(),
  simulatePayment: jest.fn(),
};

describe('MockPgController', () => {
  let controller: MockPgController;
  let service: typeof mockMockPgService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MockPgController],
      providers: [
        { provide: MockPgService, useValue: mockMockPgService },
      ],
    }).compile();

    controller = module.get<MockPgController>(MockPgController);
    service = mockMockPgService;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTransaction', () => {
    it('should call service.createTransaction and return transaction response', async () => {
      const dto: CreateTransactionDto = {
        paymentId: 'pay-123',
        orderId: 'order-123',
        amount: 100000,
      };

      const mockResponse = {
        providerTrxId: 'encoded-token-123',
        checkoutUrl: 'https://mock-pg.team-lima.com/checkout/encoded-token-123',
      };

      service.createTransaction.mockResolvedValue(mockResponse);

      const result = await controller.createTransaction(dto);

      expect(result).toEqual(mockResponse);
      expect(service.createTransaction).toHaveBeenCalledWith(dto);
    });
  });

  describe('simulatePayment', () => {
    it('should call service.simulatePayment and return success response', async () => {
      const dto: SimulatePaymentDto = {
        providerTrxId: 'encoded-token-123',
        paymentMethod: PaymentMethod.OVO,
      };

      const mockResponse = true;

      service.simulatePayment.mockResolvedValue(mockResponse);

      const result = await controller.simulatePayment(dto);

      expect(result).toEqual(mockResponse);
      expect(service.simulatePayment).toHaveBeenCalledWith(dto);
    });
  });
});
