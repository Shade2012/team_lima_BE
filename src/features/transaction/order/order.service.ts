import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Payload } from 'src/utils/payload';
import { REDIS_CLIENT } from 'src/redis/redis.provider';
import Redis from 'ioredis';
import { v7 as uuidv7 } from 'uuid';
import { EventService } from 'src/features/event/event.service';
import { TicketCategoryService } from 'src/features/ticket-category/ticket-category.service';
import { TicketCategory } from '@prisma/client';

@Injectable()
export class OrderService {

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis:Redis,
    private readonly eventService: EventService,
    private readonly ticketCategoryService: TicketCategoryService
  ) {}

  async create(eventId:string, createOrderDto: CreateOrderDto, payload:Payload) {
    const customerId = payload.sub
    


    const reservationId = uuidv7();


    return 'This action adds a new order';
  }

  private async reservationData(reservationId: string, payload:Payload, eventId: string, ticketCategories: TicketCategory[], dto: CreateOrderDto){

    const tickets = dto.seats ?? [];

    if (tickets.length === 0) {
      throw new BadRequestException('No tickets provided');
    }

    const categories = new Map(
      ticketCategories.map((item) => [
          item.id,
          item.totalQuota,
        ])
    );

    for (const ticket of tickets) {
      categories.set(
        ticket.categoryId,
        (categories.get(ticket.categoryId) ?? 0) + 1,
      );
    }

    const event = await this.eventService.findOne(eventId)

    if (!event) {
      throw new NotFoundException('Event not found');
    }


    // 4. Get categories
    // const categoryIds = [
    //   ...quantityByCategory.keys(),
    // ];

    // const categories =
    //   await this.ticketCategoryService.findByIds(
    //     categoryIds,
    //   );

    // // 5. Validate categories
    // for (const categoryId of categoryIds) {
    //   const category = categories.find(
    //     category => category.id === categoryId,
    //   );

    //   if (!category) {
    //     throw new NotFoundException(
    //       `Category ${categoryId} not found`,
    //     );
    //   }

    //   if (category.eventId != eventId) {
    //     throw new BadRequestException(
    //       `Category ${categoryId} does not belong to this event`,
    //     );
    //   }
    // }

    const customerId = payload.sub
    const endSales = Math.floor(event.salesEndTime.getTime() / 1000)
    const holdTime = 900
    return {
      reservationId,
      customerId,
      eventId,
      endSales,
      holdTime,
      categories: [
        {
          // categor
        }
      ]
    }
  }

  findAll() {
    return `This action returns all order`;
  }

  findOne(id: number) {
    return `This action returns a #${id} order`;
  }

  update(id: number, updateOrderDto: UpdateOrderDto) {
    return `This action updates a #${id} order`;
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
