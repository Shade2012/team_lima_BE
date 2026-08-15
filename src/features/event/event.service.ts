import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Payload } from 'src/utils/payload';
import { Event } from '@prisma/client';
import { EventWithCategories } from './type/event-with-categories';

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

  async findOne(id: string): Promise<EventWithCategories> {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include:{
        categories:true
      }
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
}
