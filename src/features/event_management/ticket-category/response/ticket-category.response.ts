import { ApiProperty } from '@nestjs/swagger';

export class TicketCategoryResponseDto {
  @ApiProperty({ example: '019146a0-7d1e-7abc-9a12-abcdef123456' })
  id!: string;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000001' })
  eventId!: string;

  @ApiProperty({ example: 'VIP' })
  name!: string;

  @ApiProperty({ example: 500000 })
  price!: number;

  @ApiProperty({ example: 90 })
  totalQuota!: number;

  @ApiProperty({ example: 1 })
  posIndex!: number;

  @ApiProperty({ example: 10, required: false, nullable: true })
  rows!: number | null;

  @ApiProperty({ example: 10, required: false, nullable: true })
  columns!: number | null;

  @ApiProperty({ example: ['A-5', 'A-6'], required: false, type: [String] })
  blockedSeats!: string[];

  @ApiProperty({ example: 90 })
  availableQuota!: number;

  @ApiProperty({ example: true })
  isAvailable!: boolean;

  @ApiProperty({ example: '2026-08-10T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-10T10:00:00.000Z' })
  updatedAt!: string;
}
