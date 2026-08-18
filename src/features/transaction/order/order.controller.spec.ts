import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

describe('OrderController', () => {
  let controller: OrderController;

  let orderService: {
    create: jest.Mock;
  };

  beforeEach(async () => {
    orderService = {
      create: jest.fn(),
    };

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [OrderController],
        providers: [
          {
            provide: OrderService,
            useValue: orderService,
          },
        ],
      }).compile();

    controller = module.get<OrderController>(
      OrderController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});