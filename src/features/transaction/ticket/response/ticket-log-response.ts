
import { ApiProperty } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';

export class TicketLogResponse {
  @ApiProperty({
    example: '01a0047f-e156-770f-95f8-5a96749114a3',
  })
  id!: string;

  @ApiProperty({
    example: '01a0047f-e150-751b-b3d3-9d071a3ed6bb',
  })
  ticketId!: string;

  @ApiProperty({
    example: '01a0033c-e82f-73d0-aa59-772b34c5208b',
    nullable: true,
  })
  changedById!: string | null;

  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.AVAILABLE,
  })
  previousStatus!: TicketStatus;

  @ApiProperty({
    enum: TicketStatus,
    example: TicketStatus.AVAILABLE,
  })
  newStatus!: TicketStatus;

  @ApiProperty({
    example: 'Ticket reserved by customer',
    nullable: true,
  })
  reason!: string | null;

  @ApiProperty({
    example: '2026-08-15T08:18:04.754Z',
  })
  createdAt!: Date;
}