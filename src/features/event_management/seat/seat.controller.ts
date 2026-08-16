import { Controller, Get, Post, Body, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { SeatService } from './seat.service';
import { BulkCreateSeatDto } from './dto/create-seat.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/decorators/api-success-response.decorator';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';
import { SeatResponseDto, BulkCreateSeatResponseDto } from './response/seat.response';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { Payload } from 'src/utils/payload';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';
import { Public } from 'src/decorators/public.decorator';

@ApiTags('Seat')
@Controller('seats')
export class SeatController {
  constructor(private readonly seatService: SeatService) {}

  @Post('bulk')
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Bulk generate seats for a ticket category (Organizer only)' })
  @ApiSuccessResponse(BulkCreateSeatResponseDto, 201)
  @ApiFailureResponse(400, 'Invalid request / non-seated event / quota full')
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Category not found')
  bulkCreate(
    @Body() dto: BulkCreateSeatDto,
    @PayloadJWT() payload: Payload,
  ) {
    return this.seatService.bulkCreate(dto, payload);
  }

  @Get('category/:categoryId')
  @Public()
  @ApiOperation({ summary: 'Get all seats for a ticket category' })
  @ApiSuccessResponse(SeatResponseDto, 200, 'Request successful', true)
  @ApiFailureResponse(404, 'Category not found')
  findByCategory(@Param('categoryId', ParseUUIDPipe) categoryId: string) {
    return this.seatService.findByCategory(categoryId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a seat by ID' })
  @ApiSuccessResponse(SeatResponseDto)
  @ApiFailureResponse(404, 'Seat not found')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.seatService.findOne(id);
  }

  @Delete('category/:categoryId')
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Delete all seats for a category (Organizer only)' })
  @ApiSuccessResponse(BulkCreateSeatResponseDto)
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Category not found')
  removeByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @PayloadJWT() payload: Payload,
  ) {
    return this.seatService.removeByCategory(categoryId, payload);
  }
}
