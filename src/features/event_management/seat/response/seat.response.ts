import { ApiProperty } from '@nestjs/swagger';

export class SeatResponseDto {
  @ApiProperty({ example: '019146a0-7d1e-7abc-9a12-abcdef123456' })
  id!: string;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000001' })
  categoryId!: string;

  @ApiProperty({ example: 'VIP-A-1' })
  seatCode!: string;

  @ApiProperty({ example: 'A', required: false, nullable: true })
  row?: string;

  @ApiProperty({ example: 1, required: false, nullable: true })
  column?: number;

  @ApiProperty({ example: 'AVAILABLE', enum: ['AVAILABLE', 'HELD', 'BOOKED'] })
  status!: string;

  @ApiProperty({ example: '2026-08-10T10:00:00.000Z' })
  createdAt!: string;
}

export class BulkCreateSeatResponseDto {
  @ApiProperty({ example: 100 })
  seatsCreated!: number;

  @ApiProperty({ example: 100 })
  totalQuota!: number;

  @ApiProperty({ example: 'VIP' })
  prefix!: string;

  @ApiProperty({ example: 'VIP-001' })
  firstSeatCode!: string;

  @ApiProperty({ example: 'VIP-100' })
  lastSeatCode!: string;
}
