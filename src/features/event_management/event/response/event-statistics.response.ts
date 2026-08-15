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

  @ApiProperty({ example: 5000000 })
  totalRefundAmount!: number;

  @ApiProperty({ example: 170000000 })
  netRevenue!: number;

  @ApiProperty({ example: 70 })
  percentageSold!: number;

  @ApiProperty({ type: [CategoryStatisticsResponseDto] })
  categories!: CategoryStatisticsResponseDto[];
}

export class OrganizerSummaryResponseDto {
  @ApiProperty({ example: 3 })
  totalEvents!: number;

  @ApiProperty({ example: 1200 })
  totalTicketsSold!: number;

  @ApiProperty({ example: 600000000 })
  totalGrossRevenue!: number;

  @ApiProperty({ example: 580000000 })
  totalNetRevenue!: number;

  @ApiProperty({ type: [EventStatisticsResponseDto] })
  events!: EventStatisticsResponseDto[];
}
