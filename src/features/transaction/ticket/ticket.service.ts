import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Gate, OrderStatus, Prisma, Role, TicketStatus } from '@prisma/client';
import { GateService } from 'src/features/event_management/gate/gate.service';

@Injectable()
export class TicketService {

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateService: GateService
  ) {}

  async updateStatus(
    tx: Prisma.TransactionClient,
    newStatus: TicketStatus,
    ticketId: string,
    userId?: string,
  ) {
    const ticket = await tx.ticket.findUnique({
      where: {
        id: ticketId,
      },
      select: {
        status: true,
      },
    });

    if(!ticket){
      throw new NotFoundException("Ticket not found")
    }

    return tx.ticket.update({
      where: {
        id: ticketId,
      },
      data: {
        status: newStatus,
        logs: {
          create: {
            previousStatus: ticket.status,
            newStatus,
            changedById: userId,
          },
        },
      },
    });
  }

  async updateStatuses(
    tx: Prisma.TransactionClient,
    newStatus: TicketStatus,
    ticketIds: string[],
  ) {
    const tickets = await tx.ticket.findMany({
      where: {
        id: {
          in: ticketIds,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (tickets.length !== ticketIds.length) {
      throw new NotFoundException('One or more tickets not found');
    }

    await tx.ticket.updateMany({
      where: {
        id: {
          in: ticketIds,
        },
      },
      data: {
        status: newStatus,
      },
    });

    await tx.ticketLog.createMany({
      data: tickets.map((ticket) => ({
        ticketId: ticket.id,
        previousStatus: ticket.status,
        newStatus,
      })),
    });

    return tickets;
  }

  async validateTicketScans(id: string){
    const ticket = await this.prisma.ticket.findUnique({
      where:{
        id
      },
      include:{
        order:true
      }
    })

    if(!ticket){
      throw new NotFoundException("Ticket not found")
    }

    const validOrderStatuses: OrderStatus[] = [OrderStatus.PAID, OrderStatus.PARTIAL_REFUND];
  
    if (!validOrderStatuses.includes(ticket.order.status)) {
      throw new ConflictException(`Ticket must be paid (current status: ${ticket.order.status})`);
    }

    if(ticket.status === TicketStatus.SEATED){
      throw new ConflictException('Ticket has already been scanned');
    }

    if(ticket.status !== TicketStatus.AVAILABLE){
      throw new ConflictException(`Ticket is no longer available (current status: ${ticket.status})`);
    }

    return ticket
  }

  async getTotalTicketByGateId(gateId: string){
    const gate = await this.gateService.findOne(gateId)
    return await this.prisma.ticket.count({
      where:{
        category:{
          eventId:gate.eventId
        },
        status:{
          in: [TicketStatus.SEATED, TicketStatus.EXPIRED]
        }
      }
    })
  }

  // create(createTicketDto: CreateTicketDto) {
  //   return 'This action adds a new ticket';
  // }

  // update(id: number, updateTicketDto: UpdateTicketDto) {
  //   return `This action updates a #${id} ticket`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} ticket`;
  // }

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
