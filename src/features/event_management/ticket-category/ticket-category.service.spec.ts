import { Test, TestingModule } from '@nestjs/testing';
import { TicketCategoryService } from './ticket-category.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventService } from 'src/features/event_management/event/event.service';
import { Payload } from 'src/utils/payload';
import { Role } from '@prisma/client';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

const mockCategory = {
  id: 'cat-uuid-001',
  eventId: 'event-uuid-001',
  name: 'VIP',
  price: 500000,
  totalQuota: 100,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEvent = {
  id: 'event-uuid-001',
  organizerId: 'org-uuid-001',
  isSeated: true,
};

const mockPrisma = {
  ticketCategory: {
    create: jest.fn().mockResolvedValue(mockCategory),
    findMany: jest.fn().mockResolvedValue([mockCategory]),
    findUnique: jest.fn().mockResolvedValue(mockCategory),
    update: jest.fn().mockResolvedValue(mockCategory),
    delete: jest.fn().mockResolvedValue(mockCategory),
  },
  seat: {
    count: jest.fn().mockResolvedValue(0),
  },
  ticket: {
    count: jest.fn().mockResolvedValue(0),
  },
};

const mockEventService = {
  findOne: jest.fn().mockResolvedValue(mockEvent),
};

describe('TicketCategoryService', () => {
  let service: TicketCategoryService;
  const payload = new Payload('org-uuid-001', 'org', Role.ORGANIZER);
  const otherPayload = new Payload('other-uuid', 'other', Role.ORGANIZER);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketCategoryService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventService, useValue: mockEventService },
      ],
    }).compile();

    service = module.get<TicketCategoryService>(TicketCategoryService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create category if organizer owns event', async () => {
      const dto = { eventId: 'event-uuid-001', name: 'VIP', price: 500000, rows: 10, columns: 10 };
      const result = await service.create(dto, payload);
      expect(result).toEqual(mockCategory);
    });

    it('should throw ForbiddenException if organizer does not own event', async () => {
      await expect(service.create({ eventId: 'event-uuid-001', name: 'VIP', price: 500000, rows: 10, columns: 10 }, otherPayload)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should throw BadRequestException if reducing quota below existing seats', async () => {
      mockPrisma.seat.count.mockResolvedValueOnce(80); // 80 seats exist
      const dto = { totalQuota: 50 }; // Trying to reduce to 50
      await expect(service.update('cat-uuid-001', dto, payload)).rejects.toThrow(BadRequestException);
    });

    it('should allow update if quota is safe', async () => {
      mockPrisma.seat.count.mockResolvedValueOnce(40); // 40 seats exist
      const dto = { totalQuota: 50 }; // Reducing to 50, which is safe
      await service.update('cat-uuid-001', dto, payload);
      expect(mockPrisma.ticketCategory.update).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException if category has generated seats', async () => {
      mockPrisma.seat.count.mockResolvedValueOnce(10); // 10 seats exist
      await expect(service.remove('cat-uuid-001', payload)).rejects.toThrow(BadRequestException);
    });

    it('should delete category if safe', async () => {
      mockPrisma.seat.count.mockResolvedValueOnce(0); // 0 seats exist
      await service.remove('cat-uuid-001', payload);
      expect(mockPrisma.ticketCategory.delete).toHaveBeenCalled();
    });
  });
});
