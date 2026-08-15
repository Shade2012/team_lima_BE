import { IsUUID, IsNumber, IsNotEmpty, IsEnum } from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({ description: 'The unique Payment ID from the database' })
  @IsUUID()
  @IsNotEmpty()
  paymentId!: string;

  @ApiProperty({ description: 'The unique Order ID from the database' })
  @IsUUID()
  @IsNotEmpty()
  orderId!: string;

  @ApiProperty({ description: 'Total amount to pay' })
  @IsNumber()
  @IsNotEmpty()
  amount!: number;
}
