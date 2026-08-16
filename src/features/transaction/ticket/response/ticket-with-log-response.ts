import { ApiProperty } from "@nestjs/swagger";
import { TicketLogResponse } from "./ticket-log-response";
import { TicketResponseDto } from "./ticket-response";

export class TicketWithLogResponseDto extends TicketResponseDto {
    @ApiProperty({ example: TicketLogResponse })
    logs!: TicketLogResponse[]
}