import { Test, TestingModule } from '@nestjs/testing';
import { GateService } from './gate.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventService } from 'src/features/event/event.service';
import { Payload } from 'src/utils/payload';
import { Role } from '@prisma/client';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

const mockGate = {
  id: 'gate-uuid-001',
  eventId: 'event-uuid-001',
  name: 'Gate A',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockEvent = {
  id: 'event-uuid-001',
  organizerId: 'org-uuid-001',
};

const mockPrisma = {
  gate: {
    create: jest.fn().mockResolvedValue(mockGate),
    findMany: jest.fn().mockResolvedValue([mockGate]),
    findUnique: jest.fn().mockResolvedValue(mockGate),
    update: jest.fn().mockResolvedValue({ ...mockGate, name: 'Gate B' }),
    delete: jest.fn().mockResolvedValue(mockGate),
  },
  admissionScan: {
    count: jest.fn().mockResolvedValue(0),
  },
};

const mockEventService = {
  findOne: jest.fn().mockResolvedValue(mockEvent),
};

describe('GateService', () => {
  let service: GateService;
  const payload = new Payload('org-uuid-001', 'org', Role.ORGANIZER);
  const otherPayload = new Payload('other-uuid', 'other', Role.ORGANIZER);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GateService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventService, useValue: mockEventService },
      ],
    }).compile();

    service = module.get<GateService>(GateService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a gate if organizer owns the event', async () => {
      const dto = { eventId: 'event-uuid-001', name: 'Gate A' };
      const result = await service.create(dto, payload);

      expect(result).toEqual(mockGate);
      expect(mockPrisma.gate.create).toHaveBeenCalledWith({
        data: { eventId: 'event-uuid-001', name: 'Gate A' },
      });
    });

    it('should throw ForbiddenException if organizer does not own the event', async () => {
      const dto = { eventId: 'event-uuid-001', name: 'Gate A' };

      await expect(service.create(dto, otherPayload)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.gate.create).not.toHaveBeenCalled();
    });
  });

  describe('findByEvent', () => {
    it('should return all gates for an event', async () => {
      const result = await service.findByEvent('event-uuid-001');

      expect(result).toEqual([mockGate]);
      expect(mockPrisma.gate.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event-uuid-001' },
        orderBy: { name: 'asc' },
      });
    });

    it('should throw NotFoundException if event does not exist', async () => {
      mockEventService.findOne.mockRejectedValueOnce(new NotFoundException());

      await expect(service.findByEvent('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return a gate by id', async () => {
      const result = await service.findOne('gate-uuid-001');

      expect(result).toEqual(mockGate);
      expect(mockPrisma.gate.findUnique).toHaveBeenCalledWith({
        where: { id: 'gate-uuid-001' },
      });
    });

    it('should throw NotFoundException if gate not found', async () => {
      mockPrisma.gate.findUnique.mockResolvedValueOnce(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update gate if organizer owns the event', async () => {
      const dto = { name: 'Gate B' };
      const result = await service.update('gate-uuid-001', dto, payload);

      expect(result.name).toBe('Gate B');
      expect(mockPrisma.gate.update).toHaveBeenCalledWith({
        where: { id: 'gate-uuid-001' },
        data: { ...dto },
      });
    });

    it('should throw ForbiddenException if organizer does not own the event', async () => {
      const dto = { name: 'Hijacked' };

      await expect(service.update('gate-uuid-001', dto, otherPayload)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.gate.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if gate does not exist', async () => {
      mockPrisma.gate.findUnique.mockResolvedValueOnce(null);

      await expect(service.update('nonexistent', {}, payload)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete gate if organizer owns the event and no scans exist', async () => {
      mockPrisma.admissionScan.count.mockResolvedValueOnce(0);

      const result = await service.remove('gate-uuid-001', payload);

      expect(result).toEqual(mockGate);
      expect(mockPrisma.gate.delete).toHaveBeenCalledWith({
        where: { id: 'gate-uuid-001' },
      });
    });

    it('should throw ForbiddenException if organizer does not own the event', async () => {
      await expect(service.remove('gate-uuid-001', otherPayload)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.gate.delete).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if gate has admission scans', async () => {
      mockPrisma.admissionScan.count.mockResolvedValueOnce(5);

      await expect(service.remove('gate-uuid-001', payload)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.gate.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if gate does not exist', async () => {
      mockPrisma.gate.findUnique.mockResolvedValueOnce(null);

      await expect(service.remove('nonexistent', payload)).rejects.toThrow(NotFoundException);
    });
  });
});
