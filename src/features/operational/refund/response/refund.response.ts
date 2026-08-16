import { ApiProperty } from '@nestjs/swagger';
import { RefundStatus, TicketStatus, OrderStatus } from '@prisma/client';

export class RefundEventInfoDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000001' })
  id!: string;

  @ApiProperty({ example: 'Konser Blackpink Born Pink World Tour' })
  name!: string;

  @ApiProperty({ example: '2026-08-10T19:00:00.000Z' })
  eventDate!: string;
}

export class RefundCategoryInfoDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000002' })
  id!: string;

  @ApiProperty({ example: 'VIP' })
  name!: string;

  @ApiProperty({ example: 1000000 })
  price!: number;

  @ApiProperty({ type: RefundEventInfoDto, required: false })
  event?: RefundEventInfoDto;
}

export class RefundSeatInfoDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000003' })
  id!: string;

  @ApiProperty({ example: 'VIP-005' })
  seatCode!: string;
}

export class RefundOrderInfoDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000004' })
  id!: string;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000005' })
  customerId!: string;

  @ApiProperty({ example: 'PAID', enum: OrderStatus })
  status!: string;
}

export class RefundTicketInfoDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000002' })
  id!: string;

  @ApiProperty({ example: 'AVAILABLE', enum: TicketStatus })
  status!: string;

  @ApiProperty({ type: RefundCategoryInfoDto, required: false })
  category?: RefundCategoryInfoDto;

  @ApiProperty({ type: RefundSeatInfoDto, required: false })
  seat?: RefundSeatInfoDto;

  @ApiProperty({ type: RefundOrderInfoDto, required: false })
  order?: RefundOrderInfoDto;
}

export class RefundResponseDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000010' })
  id!: string;

  @ApiProperty({ example: 'Acara bentrok dengan jadwal penting' })
  reason!: string;

  @ApiProperty({ example: 700000, description: 'Nominal refund yang dikembalikan ke customer' })
  amount!: number;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000002' })
  ticketId!: string;

  @ApiProperty({ example: 'PENDING', enum: RefundStatus })
  status!: string;

  @ApiProperty({ example: 'Alasan tidak memenuhi kriteria force majeure', required: false, nullable: true })
  rejectReason?: string | null;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000099', required: false, nullable: true })
  adminId?: string | null;

  @ApiProperty({
    example: 'REF-eyJmb3VuZElkIjoiMDE5MTQ2YTA...==',
    description: 'Resi/Token transaksi pengembalian dari Payment Gateway',
    required: false,
    nullable: true,
  })
  providerRefundId?: string | null;

  @ApiProperty({ example: '2026-08-16T10:30:00.000Z', required: false, nullable: true })
  processedAt?: string | null;

  @ApiProperty({ example: '2026-08-16T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-16T10:00:00.000Z' })
  updatedAt!: string;

  @ApiProperty({ type: RefundTicketInfoDto, required: false })
  ticket?: RefundTicketInfoDto;
}
