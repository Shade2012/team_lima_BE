import { ApiProperty } from '@nestjs/swagger';

export class TicketEventInfoDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000001' })
  id!: string;

  @ApiProperty({ example: 'Konser Sheila on 7' })
  name!: string;

  @ApiProperty({ example: '2026-08-10T10:00:00.000Z' })
  eventDate!: string;

  @ApiProperty({ example: true })
  isSeated!: boolean;
}

export class TicketCategoryInfoDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000002' })
  id!: string;

  @ApiProperty({ example: 'VIP' })
  name!: string;

  @ApiProperty({ example: 1000000 })
  price!: number;

  @ApiProperty({ type: TicketEventInfoDto })
  event!: TicketEventInfoDto;
}

export class TicketSeatInfoDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000003' })
  id!: string;

  @ApiProperty({ example: 'VIP-001' })
  seatCode!: string;
}

export class TicketResponseDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000010' })
  id!: string;

  @ApiProperty({ example: 'AVAILABLE' })
  status!: string;

  @ApiProperty({ type: TicketCategoryInfoDto })
  category!: TicketCategoryInfoDto;

  @ApiProperty({ type: TicketSeatInfoDto, required: false })
  seat?: TicketSeatInfoDto;

  @ApiProperty({ example: '2026-08-16T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-16T10:00:00.000Z' })
  updatedAt!: string;
}
