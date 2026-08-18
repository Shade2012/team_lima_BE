import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';
import { WalletTransactionType } from '@prisma/client';

describe('WalletService', () => {
  let service: WalletService;
  let prisma: PrismaService;

  const mockPrismaService = {
    wallet: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    walletTransaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    prisma = module.get<PrismaService>(PrismaService);
    
    jest.clearAllMocks();
  });

  describe('getWallet', () => {
    it('should return existing wallet', async () => {
      const mockWallet = { id: '1', userId: 'user-1', balance: 1000 };
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);

      const result = await service.getWallet('user-1');
      expect(result).toEqual(mockWallet);
      expect(mockPrismaService.wallet.create).not.toHaveBeenCalled();
    });

    it('should create and return new wallet if not exists', async () => {
      mockPrismaService.wallet.findUnique.mockResolvedValue(null);
      const newWallet = { id: '2', userId: 'user-2', balance: 0 };
      mockPrismaService.wallet.create.mockResolvedValue(newWallet);

      const result = await service.getWallet('user-2');
      expect(result).toEqual(newWallet);
      expect(mockPrismaService.wallet.create).toHaveBeenCalledWith({
        data: { userId: 'user-2', balance: 0 },
      });
    });
  });

  describe('topUp', () => {
    it('should successfully top up', async () => {
      const mockWallet = { id: '1', userId: 'user-1', balance: 1000 };
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);
      const updatedWallet = { ...mockWallet, balance: 11000 };
      mockPrismaService.wallet.update.mockResolvedValue(updatedWallet);

      const result = await service.topUp('user-1', 10000);
      expect(result).toEqual(updatedWallet);
      expect(mockPrismaService.wallet.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { balance: 11000 },
      });
      expect(mockPrismaService.walletTransaction.create).toHaveBeenCalledWith({
        data: {
          walletId: '1',
          amount: 10000,
          type: WalletTransactionType.TOP_UP,
          note: 'Top up from external source',
        },
      });
    });

    it('should throw error if top up exceeds max balance', async () => {
      const mockWallet = { id: '1', userId: 'user-1', balance: 5000000 };
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(service.topUp('user-1', 6000000)).rejects.toThrow(BadRequestException);
    });
  });

  describe('pay', () => {
    it('should deduct balance and create payment transaction', async () => {
      const mockWallet = { id: '1', userId: 'user-1', balance: 5000 };
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);
      const updatedWallet = { ...mockWallet, balance: 2000 };
      mockPrismaService.wallet.update.mockResolvedValue(updatedWallet);

      const result = await service.pay('user-1', 3000, 'order-1');
      expect(result).toEqual(updatedWallet);
      expect(mockPrismaService.walletTransaction.create).toHaveBeenCalledWith({
        data: {
          walletId: '1',
          amount: 3000,
          type: WalletTransactionType.PAYMENT,
          refId: 'order-1',
          note: 'Payment for order order-1',
        },
      });
    });

    it('should throw error if balance insufficient', async () => {
      const mockWallet = { id: '1', userId: 'user-1', balance: 1000 };
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockWallet);

      await expect(service.pay('user-1', 3000, 'order-1')).rejects.toThrow(BadRequestException);
    });
  });
});
