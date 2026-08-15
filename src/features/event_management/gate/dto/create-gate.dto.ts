import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateGateDto {
  @ApiProperty({
    description: 'Event ID this gate belongs to',
    example: '019146a0-7d1e-7abc-9a12-abcdef123456',
  })
  @IsNotEmpty()
  @IsUUID()
  eventId!: string;

  @ApiProperty({
    description: 'Gate name (e.g., "Gate A", "Pintu Utara")',
    example: 'Gate A',
  })
  @IsNotEmpty()
  @IsString()
  name!: string;
}
