import { Test, TestingModule } from '@nestjs/testing';
import { SeatService } from './seat.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventService } from 'src/features/event_management/event/event.service';
import { TicketCategoryService } from 'src/features/event_management/ticket-category/ticket-category.service';
import { Payload } from 'src/utils/payload';
import { Role } from '@prisma/client';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

const mockEvent = {
  id: 'event-uuid-001',
  organizerId: 'org-uuid-001',
  isSeated: true,
};

const mockCategory = {
  id: 'cat-uuid-001',
  eventId: 'event-uuid-001',
  totalQuota: 100,
};

const mockPrisma = {
  seat: {
    count: jest.fn().mockResolvedValue(0),
    createMany: jest.fn().mockResolvedValue({ count: 100 }),
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue({ categoryId: 'cat-uuid-001', seatCode: 'VIP-001' }),
    deleteMany: jest.fn().mockResolvedValue({ count: 100 }),
  },
};

const mockEventService = {
  findOne: jest.fn().mockResolvedValue(mockEvent),
};

const mockCategoryService = {
  findOne: jest.fn().mockResolvedValue(mockCategory),
};

describe('SeatService', () => {
  let service: SeatService;
  const payload = new Payload('org-uuid-001', 'org', Role.ORGANIZER);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventService, useValue: mockEventService },
        { provide: TicketCategoryService, useValue: mockCategoryService },
      ],
    }).compile();

    service = module.get<SeatService>(SeatService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('bulkCreate', () => {
    it('should generate seats successfully', async () => {
      const result = await service.bulkCreate({ categoryId: 'cat-uuid-001', prefix: 'V' }, payload);
      expect(result.seatsCreated).toBe(100);
      expect(mockPrisma.seat.createMany).toHaveBeenCalled();
    });

    it('should throw BadRequestException if quota is full', async () => {
      mockPrisma.seat.count.mockResolvedValueOnce(100); // Already 100 seats
      await expect(service.bulkCreate({ categoryId: 'cat-uuid-001' }, payload)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if event is not seated', async () => {
      mockEventService.findOne.mockResolvedValueOnce({ ...mockEvent, isSeated: false });
      await expect(service.bulkCreate({ categoryId: 'cat-uuid-001' }, payload)).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeByCategory', () => {
    it('should delete all seats for a category', async () => {
      const result = await service.removeByCategory('cat-uuid-001', payload);
      expect(result.seatsDeleted).toBe(100);
      expect(mockPrisma.seat.deleteMany).toHaveBeenCalled();
    });
  });
});
