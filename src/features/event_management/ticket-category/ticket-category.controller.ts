import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { TicketCategoryService } from './ticket-category.service';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto';
import { UpdateTicketCategoryDto } from './dto/update-ticket-category.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/decorators/api-success-response.decorator';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';
import { TicketCategoryResponseDto } from './response/ticket-category.response';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { Payload } from 'src/utils/payload';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';
import { Public } from 'src/decorators/public.decorator';

@ApiTags('Ticket Category')
@Controller('ticket-categories')
export class TicketCategoryController {
  constructor(private readonly ticketCategoryService: TicketCategoryService) {}

  @Post()
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Create a ticket category for an event (Organizer only)' })
  @ApiSuccessResponse(TicketCategoryResponseDto, 201)
  @ApiFailureResponse(400, 'Invalid request')
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Event not found')
  create(
    @Body() dto: CreateTicketCategoryDto,
    @PayloadJWT() payload: Payload,
  ) {
    return this.ticketCategoryService.create(dto, payload);
  }

  @Get('event/:eventId')
  @Public()
  @ApiOperation({ summary: 'Get all ticket categories for an event' })
  @ApiSuccessResponse(TicketCategoryResponseDto, 200, 'Request successful', true)
  @ApiFailureResponse(404, 'Event not found')
  findByEvent(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.ticketCategoryService.findByEvent(eventId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a ticket category by ID' })
  @ApiSuccessResponse(TicketCategoryResponseDto)
  @ApiFailureResponse(404, 'Category not found')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketCategoryService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Update a ticket category (Organizer owner only)' })
  @ApiSuccessResponse(TicketCategoryResponseDto)
  @ApiFailureResponse(400, 'Cannot reduce quota below existing seats')
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Category not found')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketCategoryDto,
    @PayloadJWT() payload: Payload,
  ) {
    return this.ticketCategoryService.update(id, dto, payload);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Delete a ticket category (Organizer owner only)' })
  @ApiSuccessResponse(TicketCategoryResponseDto)
  @ApiFailureResponse(400, 'Cannot delete category with generated seats')
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Category not found')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @PayloadJWT() payload: Payload,
  ) {
    return this.ticketCategoryService.remove(id, payload);
  }
}
