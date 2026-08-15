import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Payload } from 'src/utils/payload';
import { Event, OrderStatus, TicketStatus } from '@prisma/client';
import {
  CategoryStatisticsResponseDto,
  EventStatisticsResponseDto,
} from './response/event-statistics.response';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEventDto, payload: Payload): Promise<Event> {
    return this.prisma.event.create({
      data: {
        organizerId: payload.sub,
        name: dto.name,
        isSeated: dto.isSeated,
        salesStartTime: dto.salesStartTime,
        salesEndTime: dto.salesEndTime,
        eventDate: dto.eventDate,
        refundEndDate: dto.refundEndDate,
        refundPolicy: dto.refundPolicy,
        refundPercentage: dto.refundPercentage,
      },
    });
  }

  async findAll(): Promise<Event[]> {
    return this.prisma.event.findMany({
      orderBy: { eventDate: 'asc' },
    });
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });
    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    return event;
  }

  async findByOrganizer(organizerId: string): Promise<Event[]> {
    return this.prisma.event.findMany({
      where: { organizerId },
      orderBy: { eventDate: 'asc' },
    });
  }

  async update(id: string, dto: UpdateEventDto, payload: Payload): Promise<Event> {
    const event = await this.findOne(id);

    if (event.organizerId !== payload.sub) {
      throw new ForbiddenException('You do not have permission to update this event');
    }

    const salesStartTime = dto.salesStartTime ? new Date(dto.salesStartTime) : new Date(event.salesStartTime);
    const salesEndTime = dto.salesEndTime ? new Date(dto.salesEndTime) : new Date(event.salesEndTime);
    const eventDate = dto.eventDate ? new Date(dto.eventDate) : new Date(event.eventDate);
    const refundEndDate = dto.refundEndDate ? new Date(dto.refundEndDate) : new Date(event.refundEndDate);

    if (salesEndTime.getTime() <= salesStartTime.getTime()) {
      throw new BadRequestException('salesEndTime must be after salesStartTime');
    }
    if (eventDate.getTime() <= salesEndTime.getTime()) {
      throw new BadRequestException('eventDate must be after salesEndTime');
    }
    if (eventDate.getTime() <= refundEndDate.getTime()) {
      throw new BadRequestException('eventDate must be after refundEndDate');
    }
    if (refundEndDate.getTime() <= salesStartTime.getTime()) {
      throw new BadRequestException('refundEndDate must be after salesStartTime');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async remove(id: string, payload: Payload): Promise<Event> {
    const event = await this.findOne(id);

    if (event.organizerId !== payload.sub) {
      throw new ForbiddenException('You do not have permission to delete this event');
    }

    return this.prisma.event.delete({
      where: { id },
    });
  }

  async getEventStatistics(id: string, payload: Payload): Promise<EventStatisticsResponseDto> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            tickets: {
              include: {
                order: true,
                refund: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }

    if (event.organizerId !== payload.sub) {
      throw new ForbiddenException('You do not have permission to view statistics for this event');
    }

    return this.calculateEventStatistics(event);
  }

  private calculateEventStatistics(event: any): EventStatisticsResponseDto {
    let totalRefundAmount = 0;

    const categories: CategoryStatisticsResponseDto[] = (event.categories || []).map((cat: any) => {
      let catTicketsSold = 0;

      for (const ticket of cat.tickets || []) {
        if (ticket.order?.status === OrderStatus.PAID && ticket.status !== TicketStatus.REFUND) {
          catTicketsSold += 1;
        }

        if (ticket.refund?.amount) {
          totalRefundAmount += ticket.refund.amount;
        }
      }

      const grossRevenue = catTicketsSold * cat.price;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        price: cat.price,
        totalQuota: cat.totalQuota,
        ticketsSold: catTicketsSold,
        grossRevenue,
      };
    });

    const totalQuota = categories.reduce((sum, c) => sum + c.totalQuota, 0);
    const totalTicketsSold = categories.reduce((sum, c) => sum + c.ticketsSold, 0);
    const grossRevenue = categories.reduce((sum, c) => sum + c.grossRevenue, 0);
    const netRevenue = grossRevenue - totalRefundAmount;
    const percentageSold = totalQuota > 0 ? Math.round(((totalTicketsSold / totalQuota) * 100) * 100) / 100 : 0;

    return {
      eventId: event.id,
      eventName: event.name,
      totalQuota,
      totalTicketsSold,
      grossRevenue,
      totalRefundAmount,
      netRevenue,
      percentageSold,
      categories,
    };
  }
}

