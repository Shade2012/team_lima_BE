import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user.response';
import { Role } from '@prisma/client';

export class GateOperatorResponseDto extends UserResponseDto {
  @ApiProperty({
    example: Role.GATE_OPERATOR,
    enum: Role,
    default: Role.GATE_OPERATOR,
  })
  role: Role = Role.GATE_OPERATOR;
}