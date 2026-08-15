import { Test, TestingModule } from '@nestjs/testing';
import { EventController } from './event.controller';
import { EventService } from './event.service';
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

const mockEventStats = {
  eventId: mockEvent.id,
  eventName: mockEvent.name,
  totalQuota: 200,
  totalTicketsSold: 50,
  grossRevenue: 5000000,
  totalRefundAmount: 0,
  netRevenue: 5000000,
  percentageSold: 25,
  categories: [],
};

const mockEventService = {
  create: jest.fn().mockResolvedValue(mockEvent),
  findAll: jest.fn().mockResolvedValue([mockEvent]),
  findOne: jest.fn().mockResolvedValue(mockEvent),
  findByOrganizer: jest.fn().mockResolvedValue([mockEvent]),
  update: jest.fn().mockResolvedValue({ ...mockEvent, name: 'Updated Concert' }),
  remove: jest.fn().mockResolvedValue(mockEvent),
  getEventStatistics: jest.fn().mockResolvedValue(mockEventStats),
};

describe('EventController', () => {
  let controller: EventController;
  let service: typeof mockEventService;

  const payload = new Payload('organizer-uuid-001', 'organizer1', Role.ORGANIZER, 123456, 123456);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        { provide: EventService, useValue: mockEventService },
      ],
    }).compile();

    controller = module.get<EventController>(EventController);
    service = mockEventService;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and payload', async () => {
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

      const result = await controller.create(dto, payload);

      expect(result).toEqual(mockEvent);
      expect(service.create).toHaveBeenCalledWith(dto, payload);
    });
  });

  describe('findAll', () => {
    it('should return all events', async () => {
      const result = await controller.findAll();

      expect(result).toEqual([mockEvent]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return event by id', async () => {
      const result = await controller.findOne(mockEvent.id);

      expect(result).toEqual(mockEvent);
      expect(service.findOne).toHaveBeenCalledWith(mockEvent.id);
    });
  });

  describe('findMyEvents', () => {
    it('should return events for the logged-in organizer', async () => {
      const result = await controller.findMyEvents(payload);

      expect(result).toEqual([mockEvent]);
      expect(service.findByOrganizer).toHaveBeenCalledWith(payload.sub);
    });
  });

  describe('getEventStatistics', () => {
    it('should call service.getEventStatistics with id and payload', async () => {
      const result = await controller.getEventStatistics(mockEvent.id, payload);

      expect(result).toEqual(mockEventStats);
      expect(service.getEventStatistics).toHaveBeenCalledWith(mockEvent.id, payload);
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto, and payload', async () => {
      const dto = { name: 'Updated Concert' };

      const result = await controller.update(mockEvent.id, dto, payload);

      expect(result.name).toBe('Updated Concert');
      expect(service.update).toHaveBeenCalledWith(mockEvent.id, dto, payload);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and payload', async () => {
      const result = await controller.remove(mockEvent.id, payload);

      expect(result).toEqual(mockEvent);
      expect(service.remove).toHaveBeenCalledWith(mockEvent.id, payload);
    });
  });
});

