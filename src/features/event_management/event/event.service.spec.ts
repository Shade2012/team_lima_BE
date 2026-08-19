import { Test, TestingModule } from '@nestjs/testing';
import { EventService } from './event.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Payload } from 'src/utils/payload';
import { R2StorageService } from 'src/r2/r2-storage/r2-storage.service';
import { Role, OrderStatus, TicketStatus } from '@prisma/client';

const mockEvent = {
  id: '019146a0-7d1e-7abc-9a12-abcdef123456',
  organizerId: 'organizer-uuid-001',
  name: 'Test Concert',
  description: 'Event Description',
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
    update: jest.fn().mockResolvedValue({ ...mockEvent, name: 'Updated Concert', description: 'Updated Description' }),
    delete: jest.fn().mockResolvedValue(mockEvent),
  },
};

const mockR2StorageService = {
  setImage: jest.fn().mockResolvedValue('mock-image-key.jpg'),
};

describe('EventService', () => {
  let service: EventService;
  let prisma: typeof mockPrismaService;

  const organizerPayload = new Payload('organizer-uuid-001', 'organizer1', Role.ORGANIZER, 123456, 123456);
  const otherPayload = new Payload('other-uuid-999', 'other_user', Role.ORGANIZER, 123456, 123456);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: R2StorageService, useValue: mockR2StorageService },
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
        description: 'Test Concert',
        salesStartTime: new Date('2026-09-01T10:00:00.000Z'),
        salesEndTime: new Date('2026-09-15T23:59:59.000Z'),
        eventDate: new Date('2026-10-01T19:00:00.000Z'),
        refundEndDate: new Date('2026-09-25T23:59:59.000Z'),
        refundPolicy: 'Refunds allowed up to 7 days before event.',
        refundPercentage: 80,
      };

      const mockFile = {} as Express.Multer.File;
      const result = await service.create(dto, organizerPayload, mockFile);

      expect(result).toEqual(mockEvent);
      expect(prisma.event.create).toHaveBeenCalledWith({
        data: {
          organizerId: 'organizer-uuid-001',
          imageKey: 'mock-image-key.jpg',
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
        include: {
          categories: {
            include: {
              tickets: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if event not found', async () => {
      prisma.event.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByOrganizer', () => {
    it('should return events by organizerId without refundPercentage', async () => {
      const { refundPercentage, ...mockOrganizerEvent } = mockEvent;
      prisma.event.findMany.mockResolvedValueOnce([mockOrganizerEvent]);

      const result = await service.findByOrganizer('organizer-uuid-001');

      expect(result).toEqual([mockOrganizerEvent]);
      expect(prisma.event.findMany).toHaveBeenCalledWith({
        where: { organizerId: 'organizer-uuid-001' },
        select: {
          id: true,
          organizerId: true,
          name: true,
          imageKey: true,
          description: true,
          salesStartTime: true,
          salesEndTime: true,
          eventDate: true,
          refundEndDate: true,
          refundPolicy: true,
          createdAt: true,
          updatedAt: true,
        },
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

    it('should throw BadRequestException if salesEndTime is before salesStartTime', async () => {
      const dto = { salesEndTime: new Date('2026-08-01T00:00:00.000Z') };

      await expect(service.update(mockEvent.id, dto, organizerPayload)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if eventDate is before salesEndTime', async () => {
      const dto = { eventDate: new Date('2026-09-10T00:00:00.000Z') };

      await expect(service.update(mockEvent.id, dto, organizerPayload)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if eventDate is before refundEndDate', async () => {
      const dto = { eventDate: new Date('2026-09-20T00:00:00.000Z') };

      await expect(service.update(mockEvent.id, dto, organizerPayload)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if refundEndDate is before salesStartTime', async () => {
      const dto = { refundEndDate: new Date('2026-08-01T00:00:00.000Z') };

      await expect(service.update(mockEvent.id, dto, organizerPayload)).rejects.toThrow(
        BadRequestException,
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

  describe('getEventStatistics', () => {
    const mockEventWithDetails = {
      ...mockEvent,
      categories: [
        {
          id: 'cat-vip',
          name: 'VIP',
          price: 100000,
          totalQuota: 100,
          tickets: [
            {
              id: 'ticket-1',
              status: TicketStatus.AVAILABLE,
              order: { status: OrderStatus.PAID },
              refund: null,
            },
            {
              id: 'ticket-2',
              status: TicketStatus.SEATED,
              order: { status: OrderStatus.PAID },
              refund: null,
            },
            {
              id: 'ticket-3',
              status: TicketStatus.REFUND,
              order: { status: OrderStatus.PAID },
              refund: { amount: 80000 },
            },
            {
              id: 'ticket-4',
              status: TicketStatus.AVAILABLE,
              order: { status: OrderStatus.PAYMENT_PENDING },
              refund: null,
            },
          ],
        },
        {
          id: 'cat-reg',
          name: 'Regular',
          price: 50000,
          totalQuota: 100,
          tickets: [
            {
              id: 'ticket-5',
              status: TicketStatus.AVAILABLE,
              order: { status: OrderStatus.PAID },
              refund: null,
            },
          ],
        },
      ],
    };

    it('should successfully calculate total tickets sold and revenue with category breakdown', async () => {
      prisma.event.findUnique.mockResolvedValueOnce(mockEventWithDetails);

      const result = await service.getEventStatistics(mockEvent.id, organizerPayload);

      expect(result).toEqual({
        eventId: mockEvent.id,
        eventName: mockEvent.name,
        totalQuota: 200,
        totalTicketsSold: 3,
        grossRevenue: 250000,
        totalRefundCount: 1,
        totalRefundAmount: 80000,
        netRevenue: 170000,
        percentageSold: 1.5,
        refundPercentage: 32,
        categories: [
          {
            categoryId: 'cat-vip',
            categoryName: 'VIP',
            price: 100000,
            totalQuota: 100,
            ticketsSold: 2,
            grossRevenue: 200000,
            refundCount: 1,
            totalRefundAmount: 80000,
            refundPercentage: 40,
          },
          {
            categoryId: 'cat-reg',
            categoryName: 'Regular',
            price: 50000,
            totalQuota: 100,
            ticketsSold: 1,
            grossRevenue: 50000,
            refundCount: 0,
            totalRefundAmount: 0,
            refundPercentage: 0,
          },
        ],
      });
      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: mockEvent.id },
        include: {
          categories: {
            include: {
              tickets: {
                include: {
                  order: true,
                  refund: true,
                },
              },
            },
          },
        },
      });
    });

    it('should throw NotFoundException if event does not exist', async () => {
      prisma.event.findUnique.mockResolvedValueOnce(null);

      await expect(service.getEventStatistics('nonexistent-id', organizerPayload)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if organizer is not the owner', async () => {
      await expect(
        service.getEventStatistics(mockEvent.id, otherPayload),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
