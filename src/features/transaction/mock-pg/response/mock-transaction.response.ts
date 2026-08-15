import { ApiProperty } from '@nestjs/swagger';

export class MockTransactionResponseDto {
  @ApiProperty()
  providerTrxId: string; 

  @ApiProperty()
  checkoutUrl: string;
}
