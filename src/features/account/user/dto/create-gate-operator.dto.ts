import { ApiProperty } from "@nestjs/swagger";
import { CreateUserDto } from "./create-user.dto";
import { OmitType } from '@nestjs/mapped-types'
import { Expose } from 'class-transformer'
import { IsNotEmpty, IsString } from "class-validator";

export class CreateGateOperatorDto extends OmitType(CreateUserDto,['role']){
    @ApiProperty({
        description: 'Event Id',
        example: '131211-12101-asaokda2',
    })
    @IsNotEmpty()
    @IsString()
    eventId!: string
}