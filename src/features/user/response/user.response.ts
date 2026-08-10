import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
    @ApiProperty({
    example: 'c7a2c4c0-7d1e-4b2d-9a12-123456789abc',
  })
  id!: string;

  @ApiProperty({
    example: 'john@example.com',
  })
  email!: string;

  @ApiProperty({
    example: 'John',
  })
  username!: string;

  @ApiProperty({
    example: '2026-08-10T10:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-08-10T10:00:00.000Z',
  })
  updatedAt!: string;
}