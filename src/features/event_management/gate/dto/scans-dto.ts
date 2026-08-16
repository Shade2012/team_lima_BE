import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsUUID } from "class-validator";

export class ScanDto {
    @ApiProperty({
        description: 'Ticket ID to scan',
        example: '019ff387-745c-76cf-8f69-f5acdd2eba8',
    })
    @IsNotEmpty()
    @IsUUID('7',{
        message: 'ticketId must be a valid UUID v7',
    })
    ticketId!:string
}