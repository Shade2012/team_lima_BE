import { Test, TestingModule } from '@nestjs/testing';
import { TicketCategoryController } from './ticket-category.controller';
import { TicketCategoryService } from './ticket-category.service';
import { Payload } from 'src/utils/payload';
import { Role } from '@prisma/client';

const mockCategory = {
  id: 'cat-uuid-001',
  eventId: 'event-uuid-001',
  name: 'VIP',
  price: 500000,
  totalQuota: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockService = {
  create: jest.fn().mockResolvedValue(mockCategory),
  findByEvent: jest.fn().mockResolvedValue([mockCategory]),
  findOne: jest.fn().mockResolvedValue(mockCategory),
  update: jest.fn().mockResolvedValue(mockCategory),
  remove: jest.fn().mockResolvedValue(mockCategory),
};

describe('TicketCategoryController', () => {
  let controller: TicketCategoryController;
  const payload = new Payload('org-uuid-001', 'org', Role.ORGANIZER, 0, 0);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketCategoryController],
      providers: [
        { provide: TicketCategoryService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<TicketCategoryController>(TicketCategoryController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call create', async () => {
    const dto = { eventId: 'event', name: 'VIP', price: 10, totalQuota: 10 };
    await controller.create(dto, payload);
    expect(mockService.create).toHaveBeenCalledWith(dto, payload);
  });

  it('should call update', async () => {
    await controller.update('cat-uuid', { totalQuota: 50 }, payload);
    expect(mockService.update).toHaveBeenCalledWith('cat-uuid', { totalQuota: 50 }, payload);
  });
});
