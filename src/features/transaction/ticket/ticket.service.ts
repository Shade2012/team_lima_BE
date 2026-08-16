import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, TicketStatus } from '@prisma/client';

@Injectable()
export class TicketService {

  constructor(
    private readonly prisma: PrismaService
  ) {}

  create(createTicketDto: CreateTicketDto) {
    return 'This action adds a new ticket';
  }

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

  findAll() {
    return `This action returns all ticket`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ticket`;
  }

  update(id: number, updateTicketDto: UpdateTicketDto) {
    return `This action updates a #${id} ticket`;
  }

  remove(id: number) {
    return `This action removes a #${id} ticket`;
  }
}
