import { ApiProperty } from '@nestjs/swagger';
import { RefundStatus, TicketStatus, OrderStatus } from '@prisma/client';

export class RefundEventInfoDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000001' })
  id!: string;

  @ApiProperty({ example: 'Konser Sheila on 7' })
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

export class CreateRefundResponseDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000010' })
  id!: string;

  @ApiProperty({ example: 'Acara bentrok dengan jadwal penting' })
  reason!: string;

  @ApiProperty({ example: 700000, description: 'Estimasi uang yang akan dikembalikan' })
  amount!: number;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000002' })
  ticketId!: string;

  @ApiProperty({ example: 'PENDING', enum: RefundStatus })
  status!: string;

  @ApiProperty({ example: '2026-08-16T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-16T10:00:00.000Z' })
  updatedAt!: string;
}

// Admin Approve Refund
export class ApproveRefundResponseDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000010' })
  id!: string;

  @ApiProperty({ example: 'Acara bentrok dengan jadwal penting' })
  reason!: string;

  @ApiProperty({ example: 700000 })
  amount!: number;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000002' })
  ticketId!: string;

  @ApiProperty({ example: 'APPROVED', enum: RefundStatus })
  status!: string;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000099' })
  adminId!: string;

  @ApiProperty({
    example: 'REF-eyJmb3VuZElkIjoiMDE5MTQ2YTA...==',
    description: 'Resi/Token transfer dari Payment Gateway',
  })
  providerRefundId!: string;

  @ApiProperty({ example: '2026-08-16T10:30:00.000Z' })
  processedAt!: string;

  @ApiProperty({ example: '2026-08-16T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-16T10:30:00.000Z' })
  updatedAt!: string;
}

// Admin Reject Refund
export class RejectRefundResponseDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000010' })
  id!: string;

  @ApiProperty({ example: 'Acara bentrok dengan jadwal penting' })
  reason!: string;

  @ApiProperty({ example: 700000 })
  amount!: number;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000002' })
  ticketId!: string;

  @ApiProperty({ example: 'REJECTED', enum: RefundStatus })
  status!: string;

  @ApiProperty({ example: 'Alasan tidak memenuhi kriteria force majeure' })
  rejectReason!: string;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000099' })
  adminId!: string;

  @ApiProperty({ example: '2026-08-16T10:30:00.000Z' })
  processedAt!: string;

  @ApiProperty({ example: '2026-08-16T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-16T10:30:00.000Z' })
  updatedAt!: string;
}

export class RefundResponseDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000010' })
  id!: string;

  @ApiProperty({ example: 'Acara bentrok dengan jadwal penting' })
  reason!: string;

  @ApiProperty({ example: 700000 })
  amount!: number;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000002' })
  ticketId!: string;

  @ApiProperty({ example: 'APPROVED', enum: RefundStatus })
  status!: string;

  @ApiProperty({ example: null, nullable: true })
  rejectReason?: string | null;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000099', nullable: true })
  adminId?: string | null;

  @ApiProperty({ example: 'REF-eyJmb3VuZElkIjoiMDE5MTQ2YTA...==', nullable: true })
  providerRefundId?: string | null;

  @ApiProperty({ example: '2026-08-16T10:30:00.000Z', nullable: true })
  processedAt?: string | null;

  @ApiProperty({ example: '2026-08-16T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-16T10:30:00.000Z' })
  updatedAt!: string;

  @ApiProperty({ type: RefundTicketInfoDto })
  ticket!: RefundTicketInfoDto;
}
