import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { EventService } from 'src/features/event_management/event/event.service';

describe('UserService', () => {
  let service: UserService;

  let prisma: {
    user:{
      findUnique: jest.Mock;
      create: jest.Mock;
    },
    gate:{
      findUnique: jest.Mock;
    },
  }

  let authService:{
    compare: jest.Mock,
    createPayload: jest.Mock,
    createToken: jest.Mock,
    hashPassword:jest.Mock,
  }

  let eventService:{
    findOne: jest.Mock;
  }

  beforeEach(async () => {
    prisma = {
      user:{
        findUnique: jest.fn(),
        create: jest.fn()
      },
      gate:{
        findUnique: jest.fn()
      }
    }
    authService = {
      compare: jest.fn(),
      createPayload: jest.fn(),
      createToken: jest.fn(),
      hashPassword: jest.fn()
    }

    eventService = {
      findOne: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide:AuthService,
          useValue:authService,
        },
        {
          provide: EventService,
          useValue:eventService
        },
        {
          provide:PrismaService,
          useValue:prisma
        }
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const user = {
      id: 'user-123',
      email: 'john@xample.com',
      username: 'john',
      password: 'hashed-password',
      role: Role.CUSTOMER,
    };
    const loginDto = {
      email:'john@xample.com',
      password: 'password123'
    }

    it('should login successfully get access token', async () => {
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role
      }

      prisma.user.findUnique.mockResolvedValue(user);

      authService.compare.mockResolvedValue(true);

      authService.createPayload.mockReturnValue(payload);

      authService.createToken.mockResolvedValue(
        'access-token-123',
      );

      const result = await service.login(loginDto as any);

      expect(result).toBe('access-token-123');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where:{
          email:loginDto.email
        }
      })

      expect(authService.compare).toHaveBeenCalledWith(
        loginDto.password,
        user.password
      );

      expect(authService.createPayload).toHaveBeenCalledWith(user);

      expect(authService.createToken).toHaveBeenCalledWith(payload);
    });

    it('should throw UnauthorizedException email not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login(loginDto as any),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Invalid email or password'
        ),
      );
      
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          email: loginDto.email,
        },
      });
      expect(authService.compare).not.toHaveBeenCalled();
      expect(authService.createPayload).not.toHaveBeenCalled();
      expect(authService.createToken).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      const user = {
        id: 'user-123',
        email: 'john@example.com',
        username: 'john',
        password: 'hashed-password',
        role: Role.CUSTOMER,
      };

      prisma.user.findUnique.mockResolvedValue(user);

      authService.compare.mockResolvedValue(false);

      await expect(
        service.login(loginDto as any),
      ).rejects.toThrow(
        new UnauthorizedException(
          'Invalid email or password',
        ),
      );

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: {
          email: loginDto.email,
        },
      });

      expect(authService.compare).toHaveBeenCalledWith(
        loginDto.password,
        user.password,
      );

      // These should never happen because password is wrong
      expect(authService.createPayload).not.toHaveBeenCalled();

      expect(authService.createToken).not.toHaveBeenCalled();
    });
  })

  describe('register public', () => {
    it('should create account', async () => {
      const dto = {
        email: 'john@example.com',
        username: 'john',
        password: 'password123',
        role: Role.CUSTOMER,
      };

      const hashedPassword = 'hashed-password';

      const createdUser = {
        id: 'user-123',
        email: dto.email,
        username: dto.username,
        role: dto.role,
      };

      authService.hashPassword.mockResolvedValue(
        hashedPassword,
      );

      prisma.user.create.mockResolvedValue(
        createdUser,
      );

      const result = await service.create(dto as any);

      expect(result).toEqual(createdUser);

      expect(
        authService.hashPassword,
      ).toHaveBeenCalledWith(
        dto.password,
      );

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: dto.email,
          username: dto.username,
          role: dto.role,
          password: hashedPassword,
        },
        omit: {
          password: true,
        },
      });
    });
  });

  describe('register gate operator', () => {
    const dto = {
      eventId: 'event-123',
      gateId: 'gate-123',
      email: 'operator@example.com',
      username: 'operator',
      password: 'password123',
    };

    it('should throw when gate is not found', async () => {
      eventService.findOne.mockResolvedValue({
        id: dto.eventId,
      });

      prisma.gate.findUnique.mockResolvedValue(null);

      await expect(
        service.createGateOperator(dto as any),
      ).rejects.toThrow(
        new NotFoundException(
          `Gate with ID ${dto.gateId} not found`,
        ),
      );

      expect(
        eventService.findOne,
      ).toHaveBeenCalledWith(dto.eventId);

      expect(
        prisma.gate.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          id: dto.gateId,
        },
      });

      expect(
        authService.hashPassword,
      ).not.toHaveBeenCalled();

      expect(
        prisma.user.create,
      ).not.toHaveBeenCalled();
    });

    it('should throw when gate does not belong to the specified event', async () => {
      eventService.findOne.mockResolvedValue({
        id: dto.eventId,
      });

      prisma.gate.findUnique.mockResolvedValue({
        id: dto.gateId,
        eventId: 'another-event-123',
      });

      await expect(
        service.createGateOperator(dto as any),
      ).rejects.toThrow(
        new BadRequestException(
          'Gate does not belong to the specified Event',
        ),
      );

      expect(
        eventService.findOne,
      ).toHaveBeenCalledWith(dto.eventId);

      expect(
        prisma.gate.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          id: dto.gateId,
        },
      });

      expect(
        authService.hashPassword,
      ).not.toHaveBeenCalled();

      expect(
        prisma.user.create,
      ).not.toHaveBeenCalled();
    });
  });
});
