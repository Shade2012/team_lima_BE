import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { BulkCreateSeatDto } from './dto/create-seat.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventService } from 'src/features/event_management/event/event.service';
import { TicketCategoryService } from 'src/features/event_management/ticket-category/ticket-category.service';
import { Payload } from 'src/utils/payload';
import { Seat } from '@prisma/client';

@Injectable()
export class SeatService {
  constructor(
    private prisma: PrismaService,
    private eventService: EventService,
    private ticketCategoryService: TicketCategoryService,
  ) {}

  async bulkCreate(dto: BulkCreateSeatDto, payload: Payload) {
    const category = await this.ticketCategoryService.findOne(dto.categoryId);
    const event = await this.eventService.findOne(category.eventId);

    if (event.organizerId !== payload.sub) {
      throw new ForbiddenException('You do not have permission to manage seats for this event');
    }

    if (!event.isSeated) {
      throw new BadRequestException('Cannot create seats for a non-seated event');
    }

    const existingCount = await this.prisma.seat.count({
      where: { categoryId: dto.categoryId },
    });

    const toCreate = category.totalQuota - existingCount;

    if (toCreate <= 0) {
      throw new BadRequestException(
        `All ${category.totalQuota} seats have already been created for this category`,
      );
    }

    const prefix = dto.prefix ? `${dto.prefix}-` : '';
    const columns = category.columns || 1; 
    const blockedSeats = category.blockedSeats || [];

    const seatData: { categoryId: string; seatCode: string }[] = [];
    let createdCount = 0;
    let gridIndex = 0;
    let validSeatCounter = 0;

    while (validSeatCounter < existingCount) {
      const rowIndex = Math.floor(gridIndex / columns);
      const colIndex = (gridIndex % columns) + 1;
      
      let rowStr = '';
      let temp = rowIndex;
      while (temp >= 0) {
        rowStr = String.fromCharCode(65 + (temp % 26)) + rowStr;
        temp = Math.floor(temp / 26) - 1;
      }

      const coreCode = `${rowStr}-${colIndex}`;
      if (!blockedSeats.includes(coreCode)) {
        validSeatCounter++;
      }
      gridIndex++;
    }

    // Generate remaining seats
    while (createdCount < toCreate) {
      const rowIndex = Math.floor(gridIndex / columns);
      const colIndex = (gridIndex % columns) + 1;

      let rowStr = '';
      let temp = rowIndex;
      while (temp >= 0) {
        rowStr = String.fromCharCode(65 + (temp % 26)) + rowStr;
        temp = Math.floor(temp / 26) - 1;
      }

      const coreCode = `${rowStr}-${colIndex}`;
      
      if (!blockedSeats.includes(coreCode)) {
        seatData.push({
          categoryId: dto.categoryId,
          seatCode: `${prefix}${coreCode}`,
        });
        createdCount++;
      }
      
      gridIndex++;

      if (category.rows && gridIndex > (category.rows * columns) * 2) {
        break; // safety fallback
      }
    }

    const result = await this.prisma.seat.createMany({
      data: seatData,
    });

    return {
      seatsCreated: result.count,
      totalQuota: category.totalQuota,
      prefix,
      firstSeatCode: seatData[0].seatCode,
      lastSeatCode: seatData[seatData.length - 1].seatCode,
    };
  }

  async findByCategory(categoryId: string) {
    await this.ticketCategoryService.findOne(categoryId);

    const seats = await this.prisma.seat.findMany({
      where: { categoryId },
      orderBy: { seatCode: 'asc' },
    });

    const activeTickets = await this.prisma.ticket.findMany({
      where: {
        categoryId,
        status: { notIn: ['CANCELLED', 'EXPIRED', 'REFUND'] },
        order: {
          OR: [
            { status: 'PAID' },
            {
              status: { in: ['HELD', 'PAYMENT_PENDING'] },
              expiresAt: { gt: new Date() },
            },
          ],
        },
        seatId: { not: null },
      },
      include: {
        order: { select: { status: true } },
      },
    });

    const activeSeatMap = new Map(activeTickets.map((t) => [t.seatId, t]));

    return seats.map((seat) => {
      const parts = seat.seatCode.split('-');
      const column = parseInt(parts.pop() || '0', 10);
      const row = parts.pop() || '';

      const activeTicket = activeSeatMap.get(seat.id);
      let status = 'AVAILABLE';
      if (activeTicket) {
        status = activeTicket.order.status === 'PAID' ? 'BOOKED' : 'HELD';
      }

      return {
        id: seat.id,
        categoryId: seat.categoryId,
        seatCode: seat.seatCode,
        row,
        column,
        status,
        createdAt: seat.createdAt,
      };
    });
  }

  async findOne(id: string): Promise<Seat> {
    const seat = await this.prisma.seat.findUnique({
      where: { id },
    });
    if (!seat) {
      throw new NotFoundException(`Seat with id ${id} not found`);
    }
    return seat;
  }

  async removeByCategory(categoryId: string, payload: Payload) {
    const category = await this.ticketCategoryService.findOne(categoryId);
    const event = await this.eventService.findOne(category.eventId);

    if (event.organizerId !== payload.sub) {
      throw new ForbiddenException('You do not have permission to delete seats for this event');
    }

    const result = await this.prisma.seat.deleteMany({
      where: { categoryId },
    });

    return { seatsDeleted: result.count };
  }

  async validateSeatsExistInCategory(
    seats: { seatId: string; categoryId: string }[],
  ): Promise<void> {
    const seatIds = seats.map((s) => s.seatId).filter(Boolean);
    if (seatIds.length === 0) return; 
    const validSeats = await this.prisma.seat.findMany({
      where: {
        id: { in: seatIds },
      },
      select: {
        id: true,
        categoryId: true,
      },
    });

    const validSeatMap = new Map(validSeats.map((s) => [s.id, s.categoryId]));

    for (const seat of seats) {
      if (!seat.seatId) continue;

      const actualCategoryId = validSeatMap.get(seat.seatId);

      if (!actualCategoryId) {
        throw new NotFoundException(`Seat ${seat.seatId} does not exist`);
      }

      if (actualCategoryId !== seat.categoryId) {
        throw new BadRequestException(
          `Seat ${seat.seatId} does not belong to category ${seat.categoryId}`,
        );
      }
    }
  }
}
