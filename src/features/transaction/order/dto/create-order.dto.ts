import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsOptional, ValidateNested } from "class-validator";
import { CreateTicketDto } from "../../ticket/dto/create-ticket.dto";
import { Type } from "class-transformer";
import { IsUniqueSeats } from "src/validators/is-unique-seat-validator";
import { PaymentMethod } from "@prisma/client";

export class CreateOrderDto {
    @ApiProperty({
        description: 'List of tickets to create',
        type: [CreateTicketDto]
    })
    @IsNotEmpty()
    @IsArray()
    @ArrayMinSize(1)
    @IsUniqueSeats({ message: 'Duplicate seats cannot be selected in the same order' })
    @ValidateNested({each:true})
    @Type(() => CreateTicketDto)
    seats!: CreateTicketDto[];

    @ApiProperty({ 
        enum: PaymentMethod, 
        required: false, 
        description: 'Optional payment method. If VELOCE_PAY, pay directly from wallet.',
        example: PaymentMethod.VELOCE_PAY
    })
    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;
}
