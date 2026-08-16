import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto';
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventService } from 'src/features/event_management/event/event.service';
import { Payload } from 'src/utils/payload';
import { TicketCategory, TicketStatus } from '@prisma/client';
import { TicketCategoryWithCount } from 'src/features/event_management/ticket-category/constant/ticket-category-with-count-type';

@Injectable()
export class TicketCategoryService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
  ) {}

  async create(dto: CreateTicketCategoryDto, payload: Payload): Promise<TicketCategory> {
    const event = await this.eventService.findOne(dto.eventId);

    if (event.organizerId !== payload.sub) {
      throw new ForbiddenException('You do not have permission to add categories to this event');
    }

    return this.prisma.ticketCategory.create({
      data: {
        eventId: dto.eventId,
        name: dto.name,
        price: dto.price,
        totalQuota: dto.totalQuota,
      },
    });
  }

  async findByEvent(eventId: string): Promise<TicketCategory[]> {
    await this.eventService.findOne(eventId);

    return this.prisma.ticketCategory.findMany({
      where: { eventId },
      orderBy: { price: 'desc' },
    });
  }

  async findByIds(ids: string[], eventId:string, statuses?: TicketStatus[]): Promise<TicketCategoryWithCount[]> {
    return this.prisma.ticketCategory.findMany({
      where:{
        id:{
          in:ids
        },
        eventId:eventId
      },
      include:{
        _count:{
          select:{
            tickets:{
              where:{
                ...(statuses && statuses.length > 0 && {
                  status:{
                    in:statuses
                }})
              }
            }
          }
        },
      }
    })
  }

  async findOne(id: string): Promise<TicketCategory> {
    const category = await this.prisma.ticketCategory.findUnique({
      where: { id },
    });
    if (!category) {
      throw new NotFoundException(`Ticket category with id ${id} not found`);
    }
    return category;
  }

  async update(id: string, dto: UpdateTicketCategoryDto, payload: Payload): Promise<TicketCategory> {
    const category = await this.findOne(id);
    const event = await this.eventService.findOne(category.eventId);

    if (event.organizerId !== payload.sub) {
      throw new ForbiddenException('You do not have permission to update this category');
    }

    if (dto.totalQuota !== undefined && dto.totalQuota < category.totalQuota) {
      if (event.isSeated) {
        const existingSeatsCount = await this.prisma.seat.count({
          where: { categoryId: id },
        });
        if (dto.totalQuota < existingSeatsCount) {
          throw new BadRequestException(
            `Cannot reduce totalQuota to ${dto.totalQuota}. There are already ${existingSeatsCount} seats generated.`,
          );
        }
      }
      const activeTicketCount = await this.prisma.ticket.count({
        where: {
          categoryId: id,
          status: { notIn: ['CANCELLED', 'EXPIRED', 'REFUND'] },
        },
      });

      if (dto.totalQuota < activeTicketCount) {
        throw new BadRequestException(
          `Cannot reduce totalQuota to ${dto.totalQuota}. There are ${activeTicketCount} active ticket(s) in this category.`,
        );
      }
    }

    return this.prisma.ticketCategory.update({
      where: { id },
      data: { ...dto },
    });
  }

  async remove(id: string, payload: Payload): Promise<TicketCategory> {
    const category = await this.findOne(id);
    const event = await this.eventService.findOne(category.eventId);

    if (event.organizerId !== payload.sub) {
      throw new ForbiddenException('You do not have permission to delete this category');
    }

    const existingSeatsCount = await this.prisma.seat.count({
      where: { categoryId: id },
    });

    if (existingSeatsCount > 0) {
      throw new BadRequestException(
        `Cannot delete category because it has ${existingSeatsCount} seats generated. Please delete the seats first.`,
      );
    }
    // Cek tiket aktif (AVAILABLE + SEATED) yang masih mengikat kuota
    const activeTicketCount = await this.prisma.ticket.count({
      where: {
        categoryId: id,
        status: { notIn: ['CANCELLED', 'EXPIRED', 'REFUND'] },
      },
    });

    if (activeTicketCount > 0) {
      throw new BadRequestException(
        `Cannot delete category because it has ${activeTicketCount} active ticket(s). Refund or cancel them first.`,
      );
    }
    return this.prisma.ticketCategory.delete({
      where: { id },
    });
  }
}
