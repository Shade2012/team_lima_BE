import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsNotEmpty, ValidateNested } from "class-validator";
import { CreateTicketDto } from "../../ticket/dto/create-ticket.dto";

export class CreateOrderDto {
    @ApiProperty({
        description: 'List of tickets to create',
        type: [CreateTicketDto]
    })
    @IsArray()
    @IsNotEmpty()
    @ValidateNested({each:true})
    seats!: CreateTicketDto[];
}
