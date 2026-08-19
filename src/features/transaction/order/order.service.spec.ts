import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { OrderService } from './order.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventService } from 'src/features/event_management/event/event.service';
import { PaymentService } from '../payment/payment.service';
import { RedisService } from 'src/redis/type/commands';
import { TicketService } from '../ticket/ticket.service';
import { SseService } from '../../sse/sse.service';
import { WalletService } from '../wallet/wallet.service';


// Adjust this token if your queue name is different
const ORDER_EXPIRY_QUEUE = 'order-expired';

describe('OrderService', () => {
  let service: OrderService;

  let prisma: {
    order: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
  };

  let eventService: {
    findOne: jest.Mock;
  };

  let paymentService: {
    createCheckoutSession: jest.Mock;
    existingCheckoutSession: jest.Mock;
  };

  let redis: {
    exists: jest.Mock;
    reserveSeats: jest.Mock;
    removeSeats: jest.Mock;
  };

  let expiryQueue: {
    add: jest.Mock;
  };

  let walletService: {
    findOne: jest.Mock;
  };

  let sseService: {
    findOne: jest.Mock;
    emitSeatUpdate: jest.Mock;
    emitDashboardUpdate: jest.Mock;
  };

  let ticketService: {
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      order: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    eventService = {
      findOne: jest.fn(),
    };

    paymentService = {
      createCheckoutSession: jest.fn(),
      existingCheckoutSession: jest.fn(),
    };
    
    ticketService = {};

    walletService = {};

    sseService = {
      emitSeatUpdate: jest.fn(),
      emitDashboardUpdate: jest.fn(),
    };

    redis = {
      exists: jest.fn().mockResolvedValue(true),
      reserveSeats: jest.fn(),
      removeSeats: jest.fn(),
    };

    expiryQueue = {
      add: jest.fn(),
    };
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: getQueueToken(ORDER_EXPIRY_QUEUE),
          useValue: expiryQueue
        },
        {
          provide: RedisService,
          useValue: redis,
        },
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: EventService,
          useValue: eventService,
        },
        {
          provide: TicketService,
          useValue: ticketService,
        },
        {
          provide: SseService,
          useValue: sseService,
        },
        {
          provide: PaymentService,
          useValue: paymentService,
        },
        {
          provide: WalletService,
          useValue: walletService,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const eventId = '019ff387-745c-76cf-8f69-f5acdd2eba8d';

    const customerId =
      '01a0036a-c18c-76c8-964a-6ed77ab97df7';

    const categoryId =
      '019ff38e-03ce-75da-a173-f43d6fc74d85';

    const seatId =
      '019ff398-be9d-73ec-af8b-54b743ab2a9a';

    const payload = {
      sub: customerId,
    };

    const dto = {
      seats: [
        {
          categoryId,
          seatId,
        },
      ],
    };

    const event = {
      id: eventId,

      salesEndTime: new Date(
        Date.now() + 60 * 60 * 1000,
      ),

      categories: [
        {
          id: categoryId,
          price: 100000,
          totalQuota: 100,
        },
      ],
    };

    beforeEach(() => {
      
      eventService.findOne.mockResolvedValue(event);

      prisma.order.findUnique.mockResolvedValue({
        id: 'order-123',
        customerId,
        eventId,
        totalAmount: 100000,
        status: 'HELD',
        reservationKey: 'some-key',
        tickets: [
          {
            id: 'ticket-123',
            seat: {
              id: seatId,
            },
          },
        ],
      })
    });

    it('should create an order successfully', async () => {
      redis.reserveSeats.mockResolvedValue([
        1,
        '900',
      ]);

      prisma.order.create.mockResolvedValue({
        id: 'order-123',
        customerId,
        eventId,
        totalAmount: 100000,
        status: 'HELD',
        reservationKey: 'some-key',
      });

      expiryQueue.add.mockResolvedValue({});

      paymentService.createCheckoutSession.mockResolvedValue({
        checkoutUrl:
          'http://localhost:3000/payment/order-123',
      });

      paymentService.existingCheckoutSession.mockResolvedValue({
        orderId: 'existing-order-123',
        checkoutUrl: 'http://localhost:3000/payment/existing-order-123',
        providerTrxId: 'provider-trx-123',
      });

      const result = await service.create(
        eventId,
        dto as any,
        payload as any,
      );

      expect(result).toEqual({
        checkoutUrl:
          'http://localhost:3000/payment/order-123',
      });

      expect(eventService.findOne).toHaveBeenCalledWith(
        eventId,
      );

      expect(redis.reserveSeats).toHaveBeenCalledTimes(1);

      expect(prisma.order.create).toHaveBeenCalledTimes(1);

      expect(expiryQueue.add).toHaveBeenCalledTimes(1);

      expect(
        paymentService.createCheckoutSession,
      ).toHaveBeenCalledWith(
        'order-123',
        customerId,
      );
    });

    it('should throw when event does not exist', async () => {
      eventService.findOne.mockResolvedValue(null);

      await expect(
        service.create(
          eventId,
          dto as any,
          payload as any,
        ),
      ).rejects.toThrow(
        new NotFoundException(
          `Event ${eventId} not found`,
        ),
      );

      expect(redis.reserveSeats).not.toHaveBeenCalled();

      expect(prisma.order.create).not.toHaveBeenCalled();

      expect(
        paymentService.createCheckoutSession,
      ).not.toHaveBeenCalled();
    });

    it('should reject when quota is exceeded', async () => {
      redis.reserveSeats.mockResolvedValue([
        0,
        'QUOTA_EXCEEDED',
        categoryId,
      ]);

      await expect(
        service.create(
          eventId,
          dto as any,
          payload as any,
        ),
      ).rejects.toThrow();

      expect(redis.reserveSeats).toHaveBeenCalledTimes(1);

      expect(prisma.order.create).not.toHaveBeenCalled();

      expect(expiryQueue.add).not.toHaveBeenCalled();

      expect(
        paymentService.createCheckoutSession,
      ).not.toHaveBeenCalled();
    });

    it('should return existing reservation when Redis finds one', async () => {
      redis.reserveSeats.mockResolvedValue([
        2,
        'existing-order-123',
        '700',
      ]);

      paymentService.existingCheckoutSession.mockResolvedValue({
        orderId: 'existing-order-123',
        checkoutUrl:'http://localhost:3000/payment/existing-order-123',
        providerTrxId: 'provider-trx-123',
      });

      const result = await service.create(
        eventId,
        dto as any,
        payload as any,
      );

      expect(result).toEqual({
        providerTrxId: 'provider-trx-123',
        orderId: 'order-123',
        status: 'HELD',
        totalAmount: 100000,
        checkoutUrl:'http://localhost:3000/payment/existing-order-123',
        expiresAt: undefined,
        isReusedSession: true,
      });

      expect(redis.reserveSeats).toHaveBeenCalledTimes(1);

      // Existing reservation means we should NOT create
      // another database order.
      expect(prisma.order.create).not.toHaveBeenCalled();

      expect(expiryQueue.add).not.toHaveBeenCalled();
    });

    it('should reject when sales have ended', async () => {
      redis.reserveSeats.mockResolvedValue([
        0,
        'SALES_ENDED',
      ]);

      await expect(
        service.create(
          eventId,
          dto as any,
          payload as any,
        ),
      ).rejects.toThrow();

      expect(prisma.order.create).not.toHaveBeenCalled();

      expect(
        paymentService.createCheckoutSession,
      ).not.toHaveBeenCalled();
    });

    it('should release Redis reservation when database creation fails', async () => {
      redis.reserveSeats.mockResolvedValue([
        1,
        '900',
      ]);

      prisma.order.create.mockRejectedValue(
        new Error('Database error'),
      );

      redis.removeSeats.mockResolvedValue([
        1,
        'RELEASED_SUCCESSFULLY',
      ]);

      await expect(
        service.create(
          eventId,
          dto as any,
          payload as any,
        ),
      ).rejects.toThrow('Database error');

      expect(redis.reserveSeats).toHaveBeenCalledTimes(1);

      expect(redis.removeSeats).toHaveBeenCalledTimes(1);

      expect(
        paymentService.createCheckoutSession,
      ).not.toHaveBeenCalled();
    });
  });
});