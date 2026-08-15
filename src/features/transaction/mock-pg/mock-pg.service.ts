import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { MockTransactionResponseDto } from './response/mock-transaction.response';

import { PaymentService } from '../payment/payment.service'; 
import { OrdersService } from '../orders/orders.service'; 

@Injectable()
export class MockPgService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly ordersService: OrdersService 
  ) {}

  async createTransaction(dto: CreateTransactionDto): Promise<MockTransactionResponseDto> {
    const tokenPayload = { paymentId: dto.paymentId, orderId: dto.orderId };
    const snapToken = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
    const checkoutUrl = `https://mock-pg.team-lima.com/checkout/${snapToken}`;

    return {
      providerTrxId: snapToken,
      checkoutUrl: checkoutUrl,
    };
  }

  async simulatePayment(dto: SimulatePaymentDto): Promise<boolean> {
    let paymentId: string;
    let orderId: string;

    try {
      const decodedString = Buffer.from(dto.providerTrxId, 'base64').toString('utf-8');
      const tokenData = JSON.parse(decodedString);
      
      if (!tokenData.paymentId || !tokenData.orderId) {
        throw new Error('Invalid token structure');
      }
      
      paymentId = tokenData.paymentId;
      orderId = tokenData.orderId;
    } catch (error) {
      throw new BadRequestException('Invalid Snap Token');
    }

    try {
      await this.paymentService.processPaymentSuccess(
        paymentId,
        dto.providerTrxId,
        dto.paymentMethod,
      );

      await this.ordersService.handlePaymentSuccess(orderId);

      return true;
    } catch (error) {
      throw new InternalServerErrorException('Failed to execute internal payment updates');
    }
  }
}
