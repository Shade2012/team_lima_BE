import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive, Max } from 'class-validator';

export class TopUpWalletDto {
  @ApiProperty({ description: 'Nominal top up', minimum: 1, maximum: 10000000 })
  @IsNotEmpty()
  @IsInt()
  @IsPositive()
  @Max(10000000)
  amount!: number;
}
