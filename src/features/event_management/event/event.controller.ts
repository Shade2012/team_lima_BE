import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/decorators/api-success-response.decorator';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';
import { EventResponseDto } from './response/event.response';
import {
  EventStatisticsResponseDto,
  OrganizerSummaryResponseDto,
} from './response/event-statistics.response';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { Payload } from 'src/utils/payload';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';
import { Public } from 'src/decorators/public.decorator';

@ApiTags('Event')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Create a new event (Organizer only)' })
  @ApiSuccessResponse(EventResponseDto, 201)
  @ApiFailureResponse(400, 'Invalid request')
  @ApiFailureResponse(401, 'Unauthorized')
  create(
    @Body() createEventDto: CreateEventDto,
    @PayloadJWT() payload: Payload,
  ) {
    return this.eventService.create(createEventDto, payload);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all events' })
  @ApiSuccessResponse(EventResponseDto)
  findAll() {
    return this.eventService.findAll();
  }

  @Get('organizer/me')
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Get events owned by the logged-in organizer' })
  @ApiSuccessResponse(EventResponseDto)
  findMyEvents(@PayloadJWT() payload: Payload) {
    return this.eventService.findByOrganizer(payload.sub);
  }

  @Get('organizer/summary')
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Get aggregated summary and revenue across all organizer events (Organizer only)' })
  @ApiSuccessResponse(OrganizerSummaryResponseDto)
  @ApiFailureResponse(401, 'Unauthorized')
  @ApiFailureResponse(403, 'Forbidden')
  getOrganizerSummary(@PayloadJWT() payload: Payload) {
    return this.eventService.getOrganizerSummary(payload);
  }

  @Get(':id/statistics')
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Get event revenue and ticket sales statistics (Organizer only)' })
  @ApiSuccessResponse(EventStatisticsResponseDto)
  @ApiFailureResponse(401, 'Unauthorized')
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Event not found')
  getEventStatistics(
    @Param('id', ParseUUIDPipe) id: string,
    @PayloadJWT() payload: Payload,
  ) {
    return this.eventService.getEventStatistics(id, payload);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get event details by ID' })
  @ApiSuccessResponse(EventResponseDto)
  @ApiFailureResponse(404, 'Event not found')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Update event (Organizer owner only)' })
  @ApiSuccessResponse(EventResponseDto)
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Event not found')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEventDto: UpdateEventDto,
    @PayloadJWT() payload: Payload,
  ) {
    return this.eventService.update(id, updateEventDto, payload);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Delete event (Organizer owner only)' })
  @ApiSuccessResponse(EventResponseDto)
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Event not found')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @PayloadJWT() payload: Payload,
  ) {
    return this.eventService.remove(id, payload);
  }
}
