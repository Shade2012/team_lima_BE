import { Test, TestingModule } from '@nestjs/testing';
import { SeatController } from './seat.controller';
import { SeatService } from './seat.service';
import { Payload } from 'src/utils/payload';
import { Role } from '@prisma/client';

const mockService = {
  bulkCreate: jest.fn().mockResolvedValue({ seatsCreated: 100 }),
  findByCategory: jest.fn().mockResolvedValue([]),
  findOne: jest.fn().mockResolvedValue({}),
  removeByCategory: jest.fn().mockResolvedValue({ seatsDeleted: 100 }),
};

describe('SeatController', () => {
  let controller: SeatController;
  const payload = new Payload('org-uuid-001', 'org', Role.ORGANIZER, 0, 0);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeatController],
      providers: [
        { provide: SeatService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<SeatController>(SeatController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call bulkCreate', async () => {
    await controller.bulkCreate({ categoryId: 'cat-uuid' }, payload);
    expect(mockService.bulkCreate).toHaveBeenCalledWith({ categoryId: 'cat-uuid' }, payload);
  });
});
