import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { Payload } from 'src/utils/payload';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';
import { ApiSuccessResponse, PrimitiveType } from 'src/decorators/api-success-response.decorator';
import { OrderResponseDto } from './response/order-response.dto';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';
import { CreateOrderResponseDto } from './response/create-order-response.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiBearerAuth()
  @UserRoleExt(Role.CUSTOMER)
  @ApiOperation({summary: 'Create a order return a checkout url' })
  @ApiSuccessResponse(CreateOrderResponseDto, 201,'Checkout url')
  @ApiFailureResponse(400, 'Invalid Request / Quota Full / Category does not belong to this event')
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Event not found')
  @ApiFailureResponse(404, 'One or more tickets not found')
  @ApiFailureResponse(404, 'Category not found')
  @ApiFailureResponse(429, 'Too many requests. Rate limit exceeded')
  @Post('event/:eventId')
  @Throttle({
    default:{
      limit: 10,
      ttl: 60_000
    }
  })
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
  @ApiSuccessResponse(OrderResponseDto, 200,'Get All Order',true)
  @ApiFailureResponse(404,'Order not found')
  @Get('customer')
  findAll(
    @PayloadJWT() payload:Payload
  ) {
    return this.orderService.findAll(payload);
  }

  @ApiBearerAuth()
  @UserRoleExt(Role.CUSTOMER)
  @ApiOperation({summary: 'See order by id' })
  @ApiSuccessResponse(OrderResponseDto, 200,'Get Order By Id')
  @Get('customer/:id')
  findOne(
    @Param('id') id: string,
    @PayloadJWT() payload:Payload
  ) {
    return this.orderService.findOne(id, payload.sub);
  }

  @ApiExcludeEndpoint()
  @UserRoleExt(Role.CUSTOMER)
  @Get('clear')
  clear(
  ) {
    return this.orderService.clear();
  }
}
