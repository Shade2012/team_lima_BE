import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { IsAfter } from 'src/validators/is-after.validator';

export class CreateEventDto {
  @ApiProperty({
    description: 'Event name',
    example: 'Konser Sheila On 7 Jakarta 2026',
  })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Whether this event uses a seated layout',
    example: true,
  })
  @IsNotEmpty()
  @IsBoolean()
  isSeated!: boolean;

  @ApiProperty({
    description: 'Ticket sales start time',
    example: '2026-09-01T10:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  salesStartTime!: Date;

  @ApiProperty({
    description: 'Ticket sales end time',
    example: '2026-09-15T23:59:59.000Z',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  @IsAfter('salesStartTime', {
    message: 'salesEndTime must be after salesStartTime',
  })
  salesEndTime!: Date;

  @ApiProperty({
    description: 'Event date',
    example: '2026-10-01T19:00:00.000Z',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  @IsAfter('salesEndTime', {
    message: 'eventDate must be after salesEndTime',
  })
  @IsAfter('refundEndDate', {
    message: 'eventDate must be after refundEndDate',
  })
  eventDate!: Date;

  @ApiProperty({
    description: 'Refund request deadline',
    example: '2026-09-25T23:59:59.000Z',
  })
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  @IsAfter('salesStartTime', {
    message: 'refundEndDate must be after salesStartTime',
  })
  refundEndDate!: Date;

  @ApiProperty({
    description: 'Refund policy text',
    example: 'Refunds can only be requested up to 7 days before the event.',
  })
  @IsNotEmpty()
  @IsString()
  refundPolicy!: string;

  @ApiProperty({
    description: 'Refund percentage (0-100)',
    example: 80,
    minimum: 0,
    maximum: 100,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  @Max(100)
  refundPercentage!: number;
}
