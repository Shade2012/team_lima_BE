import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TicketResponseDto } from "../../ticket/response/ticket-response";
import { PaymentResponseDto } from "../../payment/response/payment-response.dto";

export class OrderResponseDto {
  @ApiProperty({ example: '01a0047f-e150-751b-b3d3-9d071a3ed6bb' })
  id!: string;

  @ApiProperty({ example: '01a0036a-c18c-76c8-964a-6ed77ab97df7' })
  customerId!: string;

  @ApiProperty({ example: '019ff387-745c-76cf-8f69-f5acdd2eba8d' })
  eventId!: string;

  @ApiProperty({ example: 500000 })
  totalAmount!: number;

  @ApiProperty({
    example: 'PAYMENT_PENDING',
    enum: ['HELD', 'PAYMENT_PENDING', 'PAID', 'CANCELLED', 'EXPIRED'],
  })
  status!: string;

  @ApiProperty({ example: '2026-08-15T08:48:04.818Z' })
  expiresAt!: Date;

  @ApiProperty({ example: '2026-08-15T08:18:04.754Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-15T08:18:04.818Z' })
  updatedAt!: Date;

  @ApiProperty({ type: [TicketResponseDto] })
  tickets!: TicketResponseDto[];

  @ApiPropertyOptional({ type: [PaymentResponseDto] })
  payments?: PaymentResponseDto[];
}