import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse, PrimitiveType } from 'src/decorators/api-success-response.decorator';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { Payload } from 'src/utils/payload';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';
import { AdmissionScansService } from './admission-scans.service';
import { ScanDto } from './dto/scans-dto';
import { TotalScansResponse } from './response/total-scans-response';

@ApiTags('Admission Scans')
@Controller('scans')
export class AdmissionScansController {
  constructor(private readonly admissionService: AdmissionScansService) {}

  @Post()
  @ApiBearerAuth()
  @UserRoleExt(Role.GATE_OPERATOR)
  @ApiOperation({ summary: 'Scans a ticket (Gate operator only)' })
  @ApiSuccessResponse(PrimitiveType.STRING,201,'Scans')
  @ApiFailureResponse(404, 'Operator not found')
  @ApiFailureResponse(404, 'Gate id has not been assigned to this operator yet')
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Ticket not found')
  scan(
    @Body() dto: ScanDto,
    @PayloadJWT() payload: Payload,
  ) {
    return this.admissionService.scan(payload, dto);
  }

  @Get()
  @ApiBearerAuth()
  @UserRoleExt(Role.GATE_OPERATOR)
  @ApiOperation({ summary: 'Get total scans admission (Gate operator only)' })
  @ApiSuccessResponse(TotalScansResponse,200,'Get Scans')
  @ApiFailureResponse(404, 'Operator not found')
  @ApiFailureResponse(404, 'Gate id has not been assigned to this operator yet')
  @ApiFailureResponse(403, 'Forbidden')
  getScan(
    @PayloadJWT() payload: Payload,
  ) {
    return this.admissionService.getScans(payload);
  }
}
