import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { Payload } from 'src/utils/payload';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';
import { ApiSuccessResponse } from 'src/decorators/api-success-response.decorator';
import { TicketResponseDto } from './response/ticket-response';
import { TicketWithLogResponseDto } from './response/ticket-with-log-response';

@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  // @Post()
  // create(@Body() createTicketDto: CreateTicketDto) {
  //   return this.ticketService.create(createTicketDto);
  // }

  @UserRoleExt(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({summary: 'Get all tickets based on role (Customer / Admin)' })
  @ApiSuccessResponse(TicketResponseDto, 200,'Get all tickets',true)
  @ApiSuccessResponse(TicketWithLogResponseDto, 200,'Get all tickets with logs',true)
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Ticket not found')
  @Get()
  findAll(
    @PayloadJWT() payload:Payload
  ) {
    return this.ticketService.findAll(payload);
  }

  @UserRoleExt(Role.CUSTOMER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({summary: 'Get tickets by id based on role (Customer / Admin)' })
  @ApiSuccessResponse(TicketResponseDto, 200,'Get ticket by id')
  @ApiSuccessResponse(TicketWithLogResponseDto, 200,'Get ticket by id with logs')
  @ApiFailureResponse(403, 'Forbidden')
  @ApiFailureResponse(404, 'Ticket not found')
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @PayloadJWT() payload:Payload
  ) {
    return this.ticketService.findOne(id, payload);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
  //   return this.ticketService.update(+id, updateTicketDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.ticketService.remove(+id);
  // }
}
