import { Test, TestingModule } from '@nestjs/testing';
import { EventService } from './event.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Payload } from 'src/utils/payload';
import { Role } from '@prisma/client';

const mockEvent = {
  id: '019146a0-7d1e-7abc-9a12-abcdef123456',
  organizerId: 'organizer-uuid-001',
  name: 'Test Concert',
  isSeated: true,
  salesStartTime: new Date('2026-09-01T10:00:00.000Z'),
  salesEndTime: new Date('2026-09-15T23:59:59.000Z'),
  eventDate: new Date('2026-10-01T19:00:00.000Z'),
  refundEndDate: new Date('2026-09-25T23:59:59.000Z'),
  refundPolicy: 'Refunds allowed up to 7 days before event.',
  refundPercentage: 80,
  createdAt: new Date('2026-08-10T10:00:00.000Z'),
  updatedAt: new Date('2026-08-10T10:00:00.000Z'),
};

const mockPrismaService = {
  event: {
    create: jest.fn().mockResolvedValue(mockEvent),
    findMany: jest.fn().mockResolvedValue([mockEvent]),
    findUnique: jest.fn().mockResolvedValue(mockEvent),
    update: jest.fn().mockResolvedValue({ ...mockEvent, name: 'Updated Concert' }),
    delete: jest.fn().mockResolvedValue(mockEvent),
  },
};

describe('EventService', () => {
  let service: EventService;
  let prisma: typeof mockPrismaService;

  const organizerPayload = new Payload('organizer-uuid-001', 'organizer1', Role.ORGANIZER);
  const otherPayload = new Payload('other-uuid-999', 'other_user', Role.ORGANIZER);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    prisma = mockPrismaService;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an event with organizerId from payload', async () => {
      const dto = {
        name: 'Test Concert',
        isSeated: true,
        salesStartTime: new Date('2026-09-01T10:00:00.000Z'),
        salesEndTime: new Date('2026-09-15T23:59:59.000Z'),
        eventDate: new Date('2026-10-01T19:00:00.000Z'),
        refundEndDate: new Date('2026-09-25T23:59:59.000Z'),
        refundPolicy: 'Refunds allowed up to 7 days before event.',
        refundPercentage: 80,
      };

      const result = await service.create(dto, organizerPayload);

      expect(result).toEqual(mockEvent);
      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          organizerId: 'organizer-uuid-001',
          ...dto,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return all events ordered by eventDate', async () => {
      const result = await service.findAll();

      expect(result).toEqual([mockEvent]);
      expect(prisma.event.findMany).toHaveBeenCalledWith({
        orderBy: { eventDate: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return an event by id', async () => {
      const result = await service.findOne(mockEvent.id);

      expect(result).toEqual(mockEvent);
      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: mockEvent.id },
      });
    });

    it('should throw NotFoundException if event not found', async () => {
      prisma.event.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByOrganizer', () => {
    it('should return events by organizerId', async () => {
      const result = await service.findByOrganizer('organizer-uuid-001');

      expect(result).toEqual([mockEvent]);
      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: { organizerId: 'organizer-uuid-001' },
        orderBy: { eventDate: 'asc' },
      });
    });
  });

  describe('update', () => {
    it('should update event if user is the owner', async () => {
      const dto = { name: 'Updated Concert' };

      const result = await service.update(mockEvent.id, dto, organizerPayload);

      expect(result.name).toBe('Updated Concert');
      expect(prisma.event.update).toHaveBeenCalledWith({
        where: { id: mockEvent.id },
        data: { ...dto },
      });
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      const dto = { name: 'Hijacked' };

      await expect(service.update(mockEvent.id, dto, otherPayload)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.event.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if event does not exist', async () => {
      prisma.event.findUnique.mockResolvedValueOnce(null);

      await expect(service.update('nonexistent-id', {}, organizerPayload)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete event if user is the owner', async () => {
      const result = await service.remove(mockEvent.id, organizerPayload);

      expect(result).toEqual(mockEvent);
      expect(prisma.event.delete).toHaveBeenCalledWith({
        where: { id: mockEvent.id },
      });
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      await expect(service.remove(mockEvent.id, otherPayload)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.event.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if event does not exist', async () => {
      prisma.event.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove('nonexistent-id', organizerPayload)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
