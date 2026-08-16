import { ApiProperty } from '@nestjs/swagger';

export class GateOperatorResponseDto {
  @ApiProperty({ example: '019146a0-7d1e-7abc-9a12-abcdef123456' })
  id!: string;

  @ApiProperty({ example: 'operator@gate.com' })
  email!: string;

  @ApiProperty({ example: 'operator123' })
  username!: string;

  @ApiProperty({ example: 'GATE_OPERATOR' })
  role!: string;

  @ApiProperty({ example: '2026-08-10T10:00:00.000Z' })
  createdAt!: string;
}

export class GateResponseDto {
  @ApiProperty({ example: '019146a0-7d1e-7abc-9a12-abcdef123456' })
  id!: string;

  @ApiProperty({ example: '019146a0-0000-7abc-0000-abcdef000001' })
  eventId!: string;

  @ApiProperty({ example: 'Gate A' })
  name!: string;

  @ApiProperty({ example: '2026-08-10T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-10T10:00:00.000Z' })
  updatedAt!: string;
}

export class GateDetailResponseDto extends GateResponseDto {
  @ApiProperty({ type: [GateOperatorResponseDto] })
  operators!: GateOperatorResponseDto[];
}

export class AssignedGateResponseDto extends GateResponseDto {
  @ApiProperty({ 
    example: {
      id: '019146a0-0000-7abc-0000-abcdef000001',
      name: 'Konser Sheila on 7',
      eventDate: '2026-08-10T10:00:00.000Z'
    }
  })
  event!: any;
}
