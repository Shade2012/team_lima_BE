import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class TicketService {
  constructor(private readonly prisma: PrismaService) {}

  async findMyTickets(customerId: string) {
    return this.prisma.ticket.findMany({
      where: {
        order: {
          customerId,
          status: { in: ['PAID', 'PARTIAL_REFUND'] },
        },
        status: 'AVAILABLE',
      },
      include: {
        category: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                eventDate: true,
                isSeated: true,
              },
            },
          },
        },
        seat: true,
        order: { select: { id: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneTicket(ticketId: string, customerId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: {
          include: {
            event: {
              select: {
                id: true,
                name: true,
                eventDate: true,
                isSeated: true,
              },
            },
          },
        },
        seat: true,
        order: { select: { id: true, customerId: true, status: true } },
        scan: true,
        refund: true,
      },
    });

    if (!ticket || ticket.order.customerId !== customerId) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }
}
