import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class BulkCreateSeatDto {
  @ApiProperty({
    description: 'Ticket category ID to generate seats for',
    example: '019146a0-7d1e-7abc-9a12-abcdef123456',
  })
  @IsNotEmpty()
  @IsUUID()
  categoryId!: string;

  @ApiProperty({
    description: 'Prefix for seat codes (e.g., "A", "VIP"). Codes will be generated as PREFIX-001, PREFIX-002, etc.',
    example: 'VIP',
    required: false,
    default: 'SEAT',
  })
  @IsOptional()
  @IsString()
  prefix?: string;
}
