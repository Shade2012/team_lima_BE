import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { Payload } from 'src/utils/payload';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';
import { ApiSuccessResponse, PrimitiveType } from 'src/decorators/api-success-response.decorator';
import { OrderResponseDto } from './response/order-response.dto';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiBearerAuth()
  @UserRoleExt(Role.CUSTOMER)
  @ApiOperation({summary: 'Create a order return a checkout url' })
  @ApiSuccessResponse(PrimitiveType.STRING, 201,'Checkout url')
  @ApiFailureResponse(400, 'Invalid Request / Quota Full / Category does not belong to this event')
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Event not found')
  @ApiFailureResponse(404, 'Category not found')
  @Post('event/:eventId')
  async create(
    @Param('eventId') eventId: string,
    @Body() createOrderDto: CreateOrderDto,
    @PayloadJWT() payload: Payload
  ) {
    return await this.orderService.create(eventId, createOrderDto, payload);
  }

  @ApiBearerAuth()
  @UserRoleExt(Role.CUSTOMER)
  @ApiOperation({summary: 'See all order' })
  @ApiSuccessResponse(PrimitiveType.STRING, 200,'Get All Order')
  @Get('customer')
  findAll(
    @PayloadJWT() payload:Payload
  ) {
    return this.orderService.findAll(payload);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.orderService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.orderService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.orderService.remove(+id);
  }
}
