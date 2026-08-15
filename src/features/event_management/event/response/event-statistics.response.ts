import { ApiProperty } from '@nestjs/swagger';

export class CategoryStatisticsResponseDto {
  @ApiProperty({ example: '019146a0-7d1e-7abc-9a12-abcdef123456' })
  categoryId!: string;

  @ApiProperty({ example: 'VIP' })
  categoryName!: string;

  @ApiProperty({ example: 500000 })
  price!: number;

  @ApiProperty({ example: 100 })
  totalQuota!: number;

  @ApiProperty({ example: 75 })
  ticketsSold!: number;

  @ApiProperty({ example: 37500000 })
  grossRevenue!: number;

  @ApiProperty({ example: 2 })
  refundCount!: number;

  @ApiProperty({ example: 1000000 })
  totalRefundAmount!: number;

  @ApiProperty({ example: 2.67 })
  refundPercentage!: number;
}

export class EventStatisticsResponseDto {
  @ApiProperty({ example: '019146a0-7d1e-7abc-9a12-abcdef123456' })
  eventId!: string;

  @ApiProperty({ example: 'Konser Sheila On 7 Jakarta 2026' })
  eventName!: string;

  @ApiProperty({ example: 500 })
  totalQuota!: number;

  @ApiProperty({ example: 350 })
  totalTicketsSold!: number;

  @ApiProperty({ example: 175000000 })
  grossRevenue!: number;

  @ApiProperty({ example: 10 })
  totalRefundCount!: number;

  @ApiProperty({ example: 5000000 })
  totalRefundAmount!: number;

  @ApiProperty({ example: 170000000 })
  netRevenue!: number;

  @ApiProperty({ example: 70 })
  percentageSold!: number;

  @ApiProperty({ example: 2.86 })
  refundPercentage!: number;

  @ApiProperty({ type: [CategoryStatisticsResponseDto] })
  categories!: CategoryStatisticsResponseDto[];
}

