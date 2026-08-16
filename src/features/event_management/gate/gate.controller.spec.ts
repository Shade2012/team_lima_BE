import { Test, TestingModule } from '@nestjs/testing';
import { GateController } from './gate.controller';
import { GateService } from './gate.service';
import { Payload } from 'src/utils/payload';
import { Role } from '@prisma/client';

const mockGate = {
  id: 'gate-uuid-001',
  eventId: 'event-uuid-001',
  name: 'Gate A',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockService = {
  create: jest.fn().mockResolvedValue(mockGate),
  findByEvent: jest.fn().mockResolvedValue([mockGate]),
  findOne: jest.fn().mockResolvedValue(mockGate),
  update: jest.fn().mockResolvedValue({ ...mockGate, name: 'Gate B' }),
  remove: jest.fn().mockResolvedValue(mockGate),
};

describe('GateController', () => {
  let controller: GateController;
  const payload = new Payload('org-uuid-001', 'org', Role.ORGANIZER, 123, 456);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GateController],
      providers: [
        { provide: GateService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<GateController>(GateController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with dto and payload', async () => {
      const dto = { eventId: 'event-uuid-001', name: 'Gate A' };
      const result = await controller.create(dto, payload);

      expect(result).toEqual(mockGate);
      expect(mockService.create).toHaveBeenCalledWith(dto, payload);
    });
  });

  describe('findByEvent', () => {
    it('should return all gates for an event', async () => {
      const result = await controller.findByEvent('event-uuid-001');

      expect(result).toEqual([mockGate]);
      expect(mockService.findByEvent).toHaveBeenCalledWith('event-uuid-001');
    });
  });

  describe('findOne', () => {
    it('should return a gate by id', async () => {
      const result = await controller.findOne('gate-uuid-001');

      expect(result).toEqual(mockGate);
      expect(mockService.findOne).toHaveBeenCalledWith('gate-uuid-001');
    });
  });

  describe('update', () => {
    it('should call service.update with id, dto, and payload', async () => {
      const dto = { name: 'Gate B' };
      const result = await controller.update('gate-uuid-001', dto, payload);

      expect(result.name).toBe('Gate B');
      expect(mockService.update).toHaveBeenCalledWith('gate-uuid-001', dto, payload);
    });
  });

  describe('remove', () => {
    it('should call service.remove with id and payload', async () => {
      const result = await controller.remove('gate-uuid-001', payload);

      expect(result).toEqual(mockGate);
      expect(mockService.remove).toHaveBeenCalledWith('gate-uuid-001', payload);
    });
  });
});
