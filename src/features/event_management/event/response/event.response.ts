import { ApiProperty } from '@nestjs/swagger';

export class EventResponseDto {
  @ApiProperty({ example: '019146a0-7d1e-7abc-9a12-abcdef123456' })
  id!: string;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000001' })
  organizerId!: string;

  @ApiProperty({ example: 'Konser Sheila On 7 Jakarta 2026' })
  name!: string;

  @ApiProperty({ example: 'https://ini_url_image.jpg' })
  imageUrl!: string;

  @ApiProperty({ example: 'Lorem Ipsum' })
  description!: string;

  @ApiProperty({ example: true })
  isSeated!: boolean;

  @ApiProperty({ example: '2026-09-01T10:00:00.000Z' })
  salesStartTime!: string;

  @ApiProperty({ example: '2026-09-15T23:59:59.000Z' })
  salesEndTime!: string;

  @ApiProperty({ example: '2026-10-01T19:00:00.000Z' })
  eventDate!: string;

  @ApiProperty({ example: '2026-09-25T23:59:59.000Z' })
  refundEndDate!: string;

  @ApiProperty({ example: 'Refund hanya dapat dilakukan maksimal 7 hari sebelum event.' })
  refundPolicy!: string;

  @ApiProperty({ example: '2026-08-10T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-10T10:00:00.000Z' })
  updatedAt!: string;
}


