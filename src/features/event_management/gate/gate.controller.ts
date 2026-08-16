import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { GateService } from './gate.service';
import { CreateGateDto } from './dto/create-gate.dto';
import { UpdateGateDto } from './dto/update-gate.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/decorators/api-success-response.decorator';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';
import { GateResponseDto, GateDetailResponseDto, AssignedGateResponseDto } from './response/gate.response';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { Payload } from 'src/utils/payload';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';
import { Public } from 'src/decorators/public.decorator';

@ApiTags('Gate')
@Controller('gates')
export class GateController {
  constructor(private readonly gateService: GateService) {}

  @Post()
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Create a gate for an event (Organizer only)' })
  @ApiSuccessResponse(GateResponseDto, 201)
  @ApiFailureResponse(400, 'Invalid request')
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Event not found')
  create(
    @Body() dto: CreateGateDto,
    @PayloadJWT() payload: Payload,
  ) {
    return this.gateService.create(dto, payload);
  }

  @Get('event/:eventId')
  @Public()
  @ApiOperation({ summary: 'Get all gates for an event' })
  @ApiSuccessResponse(GateResponseDto, 200, 'Request successful', true)
  @ApiFailureResponse(404, 'Event not found')
  findByEvent(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.gateService.findByEvent(eventId);
  }

  @ApiBearerAuth()
  @UserRoleExt(Role.GATE_OPERATOR)
  @ApiOperation({ summary: 'Get assigned gate and event details for the logged-in operator' })
  @ApiSuccessResponse(AssignedGateResponseDto, 200, 'Assigned Gate Retrieved')
  @ApiFailureResponse(404, 'Operator is not assigned to any gate')
  @Get('operator/assigned')
  async getAssignedGate(@PayloadJWT() payload: Payload) {
    return await this.gateService.findAssignedGate(payload.sub);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a gate by ID' })
  @ApiSuccessResponse(GateDetailResponseDto)
  @ApiFailureResponse(404, 'Gate not found')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.gateService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Update a gate (Organizer owner only)' })
  @ApiSuccessResponse(GateResponseDto)
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Gate not found')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGateDto,
    @PayloadJWT() payload: Payload,
  ) {
    return this.gateService.update(id, dto, payload);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UserRoleExt(Role.ORGANIZER)
  @ApiOperation({ summary: 'Delete a gate (Organizer owner only)' })
  @ApiSuccessResponse(GateResponseDto)
  @ApiFailureResponse(400, 'Cannot delete gate with admission scans')
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Gate not found')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @PayloadJWT() payload: Payload,
  ) {
    return this.gateService.remove(id, payload);
  }
}
