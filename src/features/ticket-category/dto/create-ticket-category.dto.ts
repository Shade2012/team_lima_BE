import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

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
    description: 'Total ticket quota for this category',
    example: 100,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  totalQuota!: number;
}
