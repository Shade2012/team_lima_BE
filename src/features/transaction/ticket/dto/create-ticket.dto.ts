import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
export class CreateTicketDto {
  @ApiProperty({
    description: 'Unique seatId for the ticket',
    example: '12012001-aak0f01ks01',
  })
  @IsNotEmpty()
  @IsString()
  seatId!: string;

  @ApiProperty({
    description: 'Unique categoryId for the ticket',
    example: '12012001-aak0f01ks01',
  })
  @IsNotEmpty()
  @IsString()
  categoryId!: string;
}

