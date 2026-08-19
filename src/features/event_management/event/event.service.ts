import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Payload } from 'src/utils/payload';
import { EventWithCategories } from './type/event-with-categories';
import { Event, OrderStatus, TicketStatus } from '@prisma/client';
import {
  CategoryStatisticsResponseDto,
  EventStatisticsResponseDto,
} from './response/event-statistics.response';
import { R2StorageService } from 'src/r2/r2-storage/r2-storage.service';
import { extname } from 'path';
import { randomBytes } from 'crypto';
import { EventWithImage } from './type/event-with-image';

@Injectable()
export class EventService {
  constructor(
    private prisma: PrismaService,
    private r2StorageService: R2StorageService
  ) {}

  async create(dto: CreateEventDto, payload: Payload, file: Express.Multer.File): Promise<Event> {

    if(!file){
      throw new BadRequestException([
        {
            "field": "image",
            "error": "image is required"
        }
      ])
    }
    try {
      const key = await this.r2StorageService.setImage(file,'events')
      const event = await this.prisma.event.create({
        data: {
          organizerId: payload.sub,
          name: dto.name,
          description: dto.description,
          imageKey: key,
          salesStartTime: dto.salesStartTime,
          salesEndTime: dto.salesEndTime,
          eventDate: dto.eventDate,
          refundEndDate: dto.refundEndDate,
          refundPolicy: dto.refundPolicy,
          refundPercentage: dto.refundPercentage,
        },
      });

      return event
    } catch (error) {
      throw new BadRequestException('Failed to upload file to cloud storage.');
    }
  }

  async findAll(): Promise<Event[]> {
    return this.prisma.event.findMany({
      orderBy: { eventDate: 'asc' },
    });
  }

  async findOne(id: string): Promise<EventWithCategories> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include:{
        categories:{
          include:{
            tickets:true
          }
        }
      }
    });
    if (!event) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    return event;
  }

  async findByOrganizer(organizerId: string): Promise<Omit<Event, 'refundPercentage'>[]> {
    return this.prisma.event.findMany({
      where: { organizerId },
      select: {
        id: true,
        organizerId: true,
        description:true,
        imageKey:true,
        name: true,
        salesStartTime: true,
        salesEndTime: true,
        eventDate: true,
        refundEndDate: true,
        refundPolicy: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { eventDate: 'asc' },
    });
  }

  async update(id: string, dto: UpdateEventDto, payload: Payload, image?: Express.Multer.File): Promise<Event> {
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

    const criticalFields: (keyof UpdateEventDto)[] = ['salesEndTime', 'eventDate', 'refundEndDate', 'refundPercentage'];
    const hasCriticalChange = criticalFields.some(field => dto[field] !== undefined);

    if (hasCriticalChange) {
      const paidOrderCount = await this.prisma.order.count({
        where: {
          eventId: id,
          status: { in: ['PAID', 'PARTIAL_REFUND'] },
        },
      });

      if (paidOrderCount > 0) {
        throw new BadRequestException(
          `Cannot modify critical event settings after tickets have been sold. ` +
          `There are ${paidOrderCount} paid order(s) for this event.`
        );
      }
    }
    
    const oldImageKey = event.imageKey;
    let imageKey = event.imageKey;

    if(image){
      imageKey = await this.r2StorageService.setImage(image,'events')
    }

    const result = this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        imageKey
      },
    });

    if(oldImageKey && imageKey != oldImageKey){
      await this.r2StorageService.deleteObject(oldImageKey)
    }
    return result
  }

  async remove(id: string, payload: Payload): Promise<Event> {
    const event = await this.findOne(id);

    if (event.organizerId !== payload.sub) {
      throw new ForbiddenException('You do not have permission to delete this event');
    }

    const result = this.prisma.event.delete({
      where: { id },
    });

    if(event.imageKey){
      await this.r2StorageService.deleteObject(event.imageKey)
    }
    
    return result
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
      let catRefundCount = 0;
      let catRefundAmount = 0;

      for (const ticket of cat.tickets || []) {
        if (ticket.order?.status === OrderStatus.PAID && ticket.status !== TicketStatus.REFUND) {
          catTicketsSold += 1;
        }

        if (ticket.refund?.amount) {
          totalRefundAmount += ticket.refund.amount;
          catRefundAmount += ticket.refund.amount;
          catRefundCount += 1;
        }
      }

      const grossRevenue = catTicketsSold * cat.price;
      const catRefundPercentage =
        grossRevenue > 0
          ? Math.round(((catRefundAmount / grossRevenue) * 100) * 100) / 100
          : 0;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        price: cat.price,
        totalQuota: cat.totalQuota,
        ticketsSold: catTicketsSold,
        grossRevenue,
        refundCount: catRefundCount,
        totalRefundAmount: catRefundAmount,
        refundPercentage: catRefundPercentage,
      };
    });

    const totalQuota = categories.reduce((sum, c) => sum + c.totalQuota, 0);
    const totalTicketsSold = categories.reduce((sum, c) => sum + c.ticketsSold, 0);
    const totalRefundCount = categories.reduce((sum, c) => sum + c.refundCount, 0);
    const grossRevenue = categories.reduce((sum, c) => sum + c.grossRevenue, 0);
    const netRevenue = grossRevenue - totalRefundAmount;
    const percentageSold =
      totalQuota > 0 ? Math.round(((totalTicketsSold / totalQuota) * 100) * 100) / 100 : 0;
    const refundPercentage =
      grossRevenue > 0
        ? Math.round(((totalRefundAmount / grossRevenue) * 100) * 100) / 100
        : 0;

    return {
      eventId: event.id,
      eventName: event.name,
      totalQuota,
      totalTicketsSold,
      grossRevenue,
      totalRefundCount,
      totalRefundAmount,
      netRevenue,
      percentageSold,
      refundPercentage,
      categories,
    };
  }

  toEventResponse(event: EventWithImage) {
    const { imageKey, ...rest } = event;

    return {
      ...rest,
      imageUrl: imageKey
        ? this.r2StorageService.getPublicUrl(imageKey)
        : null,
    };
  }
  
  toEventResponses(events: EventWithImage[]) {
    return events.map((event) =>
      this.toEventResponse(event),
    );
  }
}
