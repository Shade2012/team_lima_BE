import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class PaymentResponseDto {
  @ApiProperty({ example: '01a0047f-e150-751b-b3d3-9d071a3ed6cc' })
  id!: string;

  @ApiProperty({ example: '01a0047f-e150-751b-b3d3-9d071a3ed6bb' })
  orderId!: string;

  @ApiPropertyOptional({ example: 'TRX-ABC-123', description: 'Transaction ID from Payment Gateway (if applicable)' })
  providerTrxId?: string;

  @ApiProperty({ example: 500000 })
  amount!: number;

  @ApiPropertyOptional({ example: 'VELOCE_PAY', description: 'Payment method used' })
  method?: string;

  @ApiProperty({
    example: 'SUCCESS',
    enum: ['PENDING', 'SUCCESS', 'FAILED'],
  })
  status!: string;

  @ApiPropertyOptional({ example: '2026-08-15T08:18:04.754Z' })
  paidAt?: Date;

  @ApiProperty({ example: '2026-08-15T08:18:04.754Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-15T08:18:04.818Z' })
  updatedAt!: Date;
}
