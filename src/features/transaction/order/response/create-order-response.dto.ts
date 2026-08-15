import { ApiProperty } from "@nestjs/swagger";
import { TicketResponseDto } from "../../ticket/response/ticket-response";

export class CreateOrderResponseDto {
  @ApiProperty({ example: '01a0047f-e150-751b-b3d3-9d071a3ed6bb' })
  orderId!: string;

  @ApiProperty({ example: '01a0036a-c18c-76c8-964a-6ed77ab97df7' })
  checkoutUrl!: string;

  @ApiProperty({ example: 500000 })
  totalAmount!: number;

  @ApiProperty({ example: "eyJwYXltZW50SWQiOiIwMWEwMDVhMi1kYzQxLTcwYWMtYjAwYS0yNDUxMDUyYWUwYmIiLCJvcmRlcklkIjoiMDFhMDA1YTItZGJlNS03MzExLWJmOTItNTI0YzQ1NWE0YWNhIn0=" })
  providerTrxId!: string;
}