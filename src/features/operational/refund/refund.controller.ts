import { Controller, Get, Post, Body, Patch, Param, ParseUUIDPipe } from '@nestjs/common';
import { RefundService } from './refund.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RejectRefundDto } from './dto/reject-refund.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/decorators/api-success-response.decorator';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';
import { RefundResponseDto } from './response/refund.response';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { Payload } from 'src/utils/payload';

@ApiTags('Refund')
@Controller('refunds')
export class RefundController {
  constructor(private readonly refundService: RefundService) {}

  @Post()
  @ApiBearerAuth()
  @UserRoleExt(Role.CUSTOMER)
  @ApiOperation({ summary: 'Request a ticket refund (Customer only)' })
  @ApiSuccessResponse(RefundResponseDto, 201)
  @ApiFailureResponse(400, 'Invalid request / Ticket not available')
  @ApiFailureResponse(404, 'Ticket not found')
  requestRefund(
    @Body() dto: CreateRefundDto,
    @PayloadJWT() payload: Payload,
  ) {
    return this.refundService.requestRefund(payload.sub, dto);
  }

  @Get('my-refunds')
  @ApiBearerAuth()
  @UserRoleExt(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get all my refund requests (Customer only)' })
  @ApiSuccessResponse(RefundResponseDto, 200, 'Request successful', true)
  findMyRefunds(@PayloadJWT() payload: Payload) {
    return this.refundService.findMyRefunds(payload.sub);
  }

  @Get()
  @ApiBearerAuth()
  @UserRoleExt(Role.ADMIN, Role.ORGANIZER)
  @ApiOperation({ summary: 'Get all refund requests (Admin: all, Organizer: own events)' })
  @ApiSuccessResponse(RefundResponseDto, 200, 'Request successful', true)
  findAllRefunds(@PayloadJWT() payload: Payload) {
    return this.refundService.findAllRefunds(payload);
  }

  @Patch(':id/approve')
  @ApiBearerAuth()
  @UserRoleExt(Role.ADMIN)
  @ApiOperation({ summary: 'Approve a refund request (Admin only)' })
  @ApiSuccessResponse(RefundResponseDto)
  @ApiFailureResponse(400, 'Refund is not pending / Ticket used')
  @ApiFailureResponse(404, 'Refund not found')
  approveRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @PayloadJWT() payload: Payload,
  ) {
    return this.refundService.approveRefund(id, payload.sub);
  }

  @Patch(':id/reject')
  @ApiBearerAuth()
  @UserRoleExt(Role.ADMIN)
  @ApiOperation({ summary: 'Reject a refund request (Admin only)' })
  @ApiSuccessResponse(RefundResponseDto)
  @ApiFailureResponse(400, 'Refund is not pending')
  @ApiFailureResponse(404, 'Refund not found')
  rejectRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectRefundDto,
    @PayloadJWT() payload: Payload,
  ) {
    return this.refundService.rejectRefund(id, dto.rejectReason, payload.sub);
  }
}
