import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SimulatePaymentDto {
  @ApiProperty({ description: 'The Snap Token (Base64) received from Mock PG' })
  @IsString()
  @IsNotEmpty()
  providerTrxId: string;
}
