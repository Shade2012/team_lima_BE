import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MockPgService } from './mock-pg.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { ApiSuccessResponse } from 'src/decorators/api-success-response.decorator';
import { ApiFailureResponse } from 'src/decorators/api-failure-response.decorator';
import { Public } from 'src/decorators/public.decorator';
import { MockTransactionResponseDto } from './response/mock-transaction.response';
import { PrimitiveType } from 'src/decorators/api-success-response.decorator';

@ApiTags('Mock PG')
@Controller('mock-pg')
export class MockPgController {
  constructor(private readonly mockPgService: MockPgService) {}

  @Post('transaction')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a fake payment transaction (Returns Encoded Token)' })
  @ApiSuccessResponse(MockTransactionResponseDto, 201)
  @ApiFailureResponse(400, 'Invalid request')
  createTransaction(@Body() payload: CreateTransactionDto) {
    return this.mockPgService.createTransaction(payload);
  }

  @Post('simulate-payment')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Simulate user paying on Mock UI (Decodes token & calls internal services)' })
  @ApiSuccessResponse(PrimitiveType.BOOLEAN, 200)
  @ApiFailureResponse(400, 'Invalid request')
  async simulatePayment(@Body() payload: SimulatePaymentDto) {
    return this.mockPgService.simulatePayment(payload);
  }
}
