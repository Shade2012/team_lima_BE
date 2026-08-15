import { ApiProperty } from "@nestjs/swagger";
import { Order, OrderStatus } from "@prisma/client";

// model Ticket {
//   id         String          @id @default(uuid(7)) @db.Uuid
//   orderId    String          @map("order_id") @db.Uuid
  
//   categoryId String          @map("category_id") @db.Uuid
//   seatId     String?         @map("seat_id") @db.Uuid
//   status     TicketStatus    @default(AVAILABLE)
//   createdAt  DateTime        @default(now()) @map("created_at")
//   updatedAt  DateTime        @updatedAt @map("updated_at")

//   order      Order           @relation(name: "OrderToTicket", fields: [orderId], references: [id])
//   category   TicketCategory  @relation(name: "TicketToTicketCategory", fields: [categoryId], references: [id])
//   seat       Seat?           @relation(name: "SeatToTicket", fields: [seatId], references: [id])
//   logs       TicketLog[]     @relation(name: "TicketToTicketLog")
//   scan       AdmissionScan?  @relation(name: "AdmissionScanToTicket")
  
//   refund     Refund?         @relation(name: "RefundToTicket") 

//   @@index([orderId])
//   @@index([categoryId, status])
//   @@index([seatId, status])
//   @@map("tickets")
// }

export class OrderResponseDto {
  @ApiProperty({ example: '019146a0-7d1e-7abc-9a12-abcdef123456' })
  id!: string;

  @ApiProperty({ example: OrderStatus.PAYMENT_PENDING })
  status!: OrderStatus

  @ApiProperty({ example: 100000 })
  totalAmount!: number

  @ApiProperty({ example: "2026-08-12T20:59:00.000Z" })
  expiredAt!: Date

  @ApiProperty({ example: "2026-08-12T20:59:00.000Z" })
  updateAt!: Date

  @ApiProperty({ example: "2026-08-12T20:59:00.000Z" })
  createdAt!: Date
}