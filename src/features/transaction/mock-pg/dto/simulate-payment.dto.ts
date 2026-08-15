import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class SimulatePaymentDto {
  @ApiProperty({ description: 'The Snap Token (Base64) received from Mock PG' })
  @IsString()
  @IsNotEmpty()
  providerTrxId: string;

  @ApiPropertyOptional({ enum: PaymentMethod, description: 'Selected payment method chosen on Snap UI' })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

