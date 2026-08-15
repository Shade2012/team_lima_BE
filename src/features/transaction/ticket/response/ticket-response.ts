import { ApiProperty } from "@nestjs/swagger";
import { TicketCategoryResponseDto } from "src/features/event_management/ticket-category/response/ticket-category.response";

export class TicketResponseDto {
  @ApiProperty({ example: '01a0047f-e156-770f-95f8-5a96749114a3' })
  id!: string;

  @ApiProperty({ example: '01a0047f-e150-751b-b3d3-9d071a3ed6bb' })
  orderId!: string;

  @ApiProperty({ example: '019ff38e-3af7-766d-aa0d-976e8519ef2b' })
  categoryId!: string;

  @ApiProperty({ example: '01a0033c-e82f-73d0-aa59-772b34c5208b' })
  seatId!: string;

  @ApiProperty({ example: 'AVAILABLE' })
  status!: string;

  @ApiProperty({ example: '2026-08-15T08:18:04.754Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-08-15T08:18:04.754Z' })
  updatedAt!: Date;

  @ApiProperty({ type: () => TicketCategoryResponseDto })
  category!: TicketCategoryResponseDto;
}