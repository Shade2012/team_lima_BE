import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

export class SimulatePaymentDto {
  @ApiProperty({ description: 'The Snap Token (Base64) received from Mock PG' })
  @IsString()
  @IsNotEmpty()
  providerTrxId!: string;

  @ApiProperty({ enum: PaymentMethod, description: 'Selected payment method' })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}
