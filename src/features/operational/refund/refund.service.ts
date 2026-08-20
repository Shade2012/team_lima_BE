import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RejectRefundDto } from './dto/reject-refund.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { MockPgService } from '../../transaction/mock-pg/mock-pg.service';
import { RefundStatus, TicketStatus, OrderStatus, Role } from '@prisma/client';
import { RedisService } from 'src/redis/type/commands';
import { Payload } from 'src/utils/payload';
import { WalletService } from '../../transaction/wallet/wallet.service';

import { TicketService } from '../../transaction/ticket/ticket.service';

@Injectable()
export class RefundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mockPgService: MockPgService,
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
    private readonly ticketService: TicketService,
  ) {}

  async requestRefund(customerId: string, dto: CreateRefundDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: dto.ticketId },
      include: {
        order: true,
        category: { include: { event: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (ticket.order.customerId !== customerId) {
      throw new ForbiddenException('You do not own this ticket');
    }

    if (ticket.order.status !== OrderStatus.PAID && ticket.order.status !== OrderStatus.PARTIAL_REFUND) {
      throw new BadRequestException('Order is not paid, cannot refund');
    }

    if (ticket.status !== TicketStatus.AVAILABLE) {
      throw new BadRequestException('Ticket is not available for refund (already used or refunded)');
    }

    const event = ticket.category.event;
    if (new Date() > event.refundEndDate) {
      throw new BadRequestException('Refund period has ended for this event');
    }

    const existingRefund = await this.prisma.refund.findUnique({
      where: { ticketId: dto.ticketId },
    });

    if (existingRefund) {
      throw new BadRequestException('A refund request for this ticket has already been submitted');
    }

    const amount = Math.floor(ticket.category.price * (event.refundPercentage / 100));

    return this.prisma.refund.create({
      data: {
        ticketId: dto.ticketId,
        reason: dto.reason,
        amount,
        status: RefundStatus.PENDING,
      },
    });
  }

  async findMyRefunds(customerId: string) {
    return this.prisma.refund.findMany({
      where: {
        ticket: {
          order: {
            customerId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        ticket: {
          include: {
            category: {
              include: {
                event: {
                  select: {
                    id: true,
                    name: true,
                    eventDate: true,
                  },
                },
              },
            },
            seat: true,
          },
        },
      },
    });
  }

  async findAllRefunds(payload: Payload) {
    const whereClause = payload.role === Role.ADMIN
      ? {}
      : {
          ticket: {
            category: {
              event: {
                organizerId: payload.sub,
              },
            },
          },
        };

    return this.prisma.refund.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        ticket: {
          include: {
            category: {
              include: {
                event: {
                  select: {
                    id: true,
                    name: true,
                    eventDate: true,
                  },
                },
              },
            },
            order: {
              select: {
                id: true,
                customerId: true,
                status: true,
              },
            },
            seat: true,
          },
        },
      },
    });
  }

  async approveRefund(refundId: string, adminId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
      include: { ticket: { include: { order: true } } },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException(`Refund is already ${refund.status}`);
    }

    if (refund.ticket.status !== TicketStatus.AVAILABLE) {
      throw new BadRequestException('Ticket is no longer available (might have been used). Cannot approve refund.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedRefund = await tx.refund.update({
        where: { id: refundId, status: RefundStatus.PENDING },
        data: {
          status: RefundStatus.APPROVED,
          adminId,
          providerRefundId: `WALLET-REF-${refund.id}`,
          processedAt: new Date(),
        },
      });

      await this.ticketService.updateStatus(
        tx,
        TicketStatus.REFUND,
        refund.ticketId,
        adminId,
      );

      await this.walletService.refundToWallet(
        refund.ticket.order.customerId,
        refund.amount,
        refund.id,
        tx,
      );

      const orderId = refund.ticket.orderId;
      const activeTickets = await tx.ticket.count({
        where: {
          orderId,
          status: { not: TicketStatus.REFUND },
        },
      });

      const newOrderStatus = activeTickets === 0 ? OrderStatus.FULL_REFUND : OrderStatus.PARTIAL_REFUND;

      await tx.order.update({
        where: { id: orderId },
        data: { status: newOrderStatus },
      });

      await this.redis.decrby(`category:${refund.ticket.categoryId}:sold`, 1);

      return updatedRefund;
    });
  }

  async rejectRefund(refundId: string, rejectReason: string, adminId: string) {
    const refund = await this.prisma.refund.findUnique({
      where: { id: refundId },
    });

    if (!refund) {
      throw new NotFoundException('Refund request not found');
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BadRequestException(`Refund is already ${refund.status}`);
    }

    return this.prisma.refund.update({
      where: { id: refundId, status: RefundStatus.PENDING },
      data: {
        status: RefundStatus.REJECTED,
        rejectReason,
        adminId,
        processedAt: new Date(),
      },
    });
  }
}
