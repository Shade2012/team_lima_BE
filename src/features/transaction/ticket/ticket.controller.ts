import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { PayloadJWT } from 'src/decorators/payload_jwt.decorator';
import { Payload } from 'src/utils/payload';
import { UserRoleExt } from 'src/decorators/user_role_ext.decorator';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';
import { ApiSuccessResponse } from 'src/decorators/api-success-response.decorator';
import { TicketResponseDto } from './response/ticket-response';



@ApiTags('Ticket')
@Controller('tickets')
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  // @Post()
  // create(@Body() createTicketDto: CreateTicketDto) {
  //   return this.ticketService.create(createTicketDto);
  // }

  @Get('my-tickets')
  @ApiBearerAuth()
  @UserRoleExt(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get all my active tickets (Customer only)' })
  @ApiSuccessResponse(TicketResponseDto, 200, 'Request successful', true)
  @ApiFailureResponse(401, 'Unauthorized')
  findMyTickets(@PayloadJWT() payload: Payload) {
    return this.ticketService.findMyTickets(payload.sub);
  }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
  //   return this.ticketService.update(+id, updateTicketDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.ticketService.remove(+id);
  // }

  @ApiBearerAuth()
  @UserRoleExt(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get ticket detail by ID (Customer only)' })
  @ApiSuccessResponse(TicketResponseDto)
  @ApiFailureResponse(404, 'Ticket not found')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @PayloadJWT() payload: Payload,
  ) {
    return this.ticketService.findOneTicket(id, payload.sub);
  }
}
