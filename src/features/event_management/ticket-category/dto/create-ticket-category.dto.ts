import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min, IsArray } from 'class-validator';

export class CreateTicketCategoryDto {
  @ApiProperty({
    description: 'Event ID this category belongs to',
    example: '019146a0-7d1e-7abc-9a12-abcdef123456',
  })
  @IsNotEmpty()
  @IsUUID()
  eventId!: string;

  @ApiProperty({
    description: 'Category name (e.g., VIP, CAT 1, General Admission)',
    example: 'VIP',
  })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Ticket price in the smallest currency unit (e.g., IDR)',
    example: 500000,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  price!: number;

  @ApiProperty({
    description: 'Total ticket quota for this category (required for non-seated events)',
    example: 90,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalQuota?: number;

  @ApiProperty({
    description: 'Position index for ordering in UI (stage layout order)',
    example: 1,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  posIndex?: number;

  @ApiProperty({
    description: 'Number of rows (for seated events)',
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  rows?: number;

  @ApiProperty({
    description: 'Number of columns (for seated events)',
    example: 9,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  columns?: number;

  @ApiProperty({
    description: 'Array of blocked seat coordinates (e.g. ["1-5", "A-12"])',
    example: ['1-5', '1-6'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedSeats?: string[];
}
