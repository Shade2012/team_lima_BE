import { Injectable, InternalServerErrorException, BadRequestException, forwardRef, Inject } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { SimulatePaymentDto } from './dto/simulate-payment.dto';
import { MockTransactionResponseDto } from './response/mock-transaction.response';
import { PaymentService } from '../payment/payment.service'; 
import { OrderService } from '../order/order.service';
import { RedisService } from 'src/redis/type/commands';
import { SseService } from '../../sse/sse.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class MockPgService {
  constructor(
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
    private readonly redis:RedisService,
    private readonly sseService: SseService,
    private readonly prisma: PrismaService,
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

  getSnapTokenByCheckoutUrl(checkoutUrl:string){
    return checkoutUrl.split('/').pop();
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
      const order = await this.orderService.validateOrderPaid(orderId)
      await this.paymentService.processPaymentSuccess(
        paymentId,
        dto.providerTrxId,
        dto.paymentMethod,
      );

      await this.orderService.paidOrder(order);

      const orderWithSeats = await this.prisma.order.findUnique({
        where: { id: orderId },
        include: { tickets: { include: { seat: true } } },
      });

      if (orderWithSeats) {
        this.sseService.emitSeatUpdate(
          orderWithSeats.eventId,
          orderWithSeats.tickets.map((t) => ({
            seatId: t.seatId,
            seatCode: t.seat?.seatCode ?? null,
            categoryId: t.categoryId,
            status: 'BOOKED',
          })),
        );
        this.sseService.emitDashboardUpdate(orderWithSeats.eventId, 'ORDER_PAID');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  async processRefund(dto: { refundId: string; ticketId: string; amount: number }) {
    const tokenPayload = {
      refundId: dto.refundId,
      ticketId: dto.ticketId,
      timestamp: Date.now(),
    };
    const refundToken = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    return {
      success: true,
      providerRefundId: `REF-${refundToken}`,
      amount: dto.amount,
    };
  }
}  

