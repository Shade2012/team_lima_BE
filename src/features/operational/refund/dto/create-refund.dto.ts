import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateRefundDto {
  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000001' })
  @IsNotEmpty()
  @IsUUID()
  ticketId!: string;

  @ApiProperty({ example: 'Saya tidak dapat hadir karena ada kepentingan mendadak' })
  @IsNotEmpty()
  @IsString()
  reason!: string;
}
