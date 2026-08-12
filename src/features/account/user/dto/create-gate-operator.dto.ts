import { ApiProperty } from "@nestjs/swagger";
import { CreateUserDto } from "./create-user.dto";
import { IsEnum, IsNotEmpty, IsString, IsUUID } from "class-validator";
import { Role } from "@prisma/client";
// import { OmitType } from "@nestjs/mapped-types";
import { OmitType } from "@nestjs/swagger";

export class CreateGateOperatorDto extends OmitType(CreateUserDto,['role']){    
  @ApiProperty({
    description: 'Unique event id for the gate operator',
    example: '12121019-sadsadadawks',
    required: false,
  })
  @IsNotEmpty({ message: 'eventId is required' })
  @IsUUID('7', {
    message: 'eventId must be a valid UUID v7',
  })
  eventId!: string;
}