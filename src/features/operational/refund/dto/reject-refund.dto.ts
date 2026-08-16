import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectRefundDto {
  @ApiProperty({ example: 'Bukti tidak valid' })
  @IsNotEmpty()
  @IsString()
  rejectReason!: string;
}
