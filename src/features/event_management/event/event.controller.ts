import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/decorators/api-success-response.decorator';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';
import { EventResponseDto } from './response/event.response';
import { EventStatisticsResponseDto } from './response/event-statistics.response';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { Payload } from 'src/utils/payload';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';
import { Public } from 'src/decorators/public.decorator';
import { memoryStorage } from 'multer';
import { ImageUploadDefaultInterceptor } from 'src/interceptors/image-upload-default.interceptor';

const MAX_FILE_SIZE = 5 * 1024 * 1024

@ApiTags('Event')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @ApiBearerAuth()
  @UseInterceptors(ImageUploadDefaultInterceptor())
  @UserRoleExt(Role.ORGANIZER)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new event (Organizer only)' })
  @ApiSuccessResponse(EventResponseDto, 201)
  @ApiFailureResponse(400, 'Invalid request')
  @ApiFailureResponse(401, 'Unauthorized')
  async create(
    @Body() createEventDto: CreateEventDto,
    @UploadedFile() image: Express.Multer.File,
    @PayloadJWT() payload: Payload,
  ) {
    return this.eventService.toEventResponse(await this.eventService.create(createEventDto, payload, image))
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all events' })
  @ApiSuccessResponse(EventResponseDto, 200, 'Request successful', true)
  async findAll() {
    const events = await this.eventService.findAll();
    return this.eventService.toEventResponses(events)
  }

  @Get('organizer/me')
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Get events owned by the logged-in organizer' })
  @ApiSuccessResponse(EventResponseDto, 200, 'Request successful', true)
  async findMyEvents(@PayloadJWT() payload: Payload) {
    const events = await this.eventService.findByOrganizer(
      payload.sub,
    );
    return this.eventService.toEventResponses(events);
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
  @ApiConsumes('multipart/form-data')
  @UserRoleExt(Role.ORGANIZER)
  @UseInterceptors(ImageUploadDefaultInterceptor())
  @ApiOperation({ summary: 'Update event (Organizer owner only)' })
  @ApiSuccessResponse(EventResponseDto)
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Event not found')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEventDto: UpdateEventDto,
    @UploadedFile() image: Express.Multer.File,
    @PayloadJWT() payload: Payload,
  ) {
    const event = await this.eventService.update(id, updateEventDto, payload, image);
    return this.eventService.toEventResponse(event)
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
