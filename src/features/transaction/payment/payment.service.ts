import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderService } from '../order/order.service';
import { MockPgService } from '../mock-pg/mock-pg.service';
import { CreateTransactionDto } from '../mock-pg/dto/create-transaction.dto';
import { PaymentMethod } from '@prisma/client';

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => OrderService))
    private readonly orderService: OrderService,
    @Inject(forwardRef(() => MockPgService))
    private readonly mockPgService: MockPgService
  ) {}

  async processPaymentSuccess(
    paymentId: string,
    providerTrxId: string,
    paymentMethod: PaymentMethod,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        providerTrxId: providerTrxId,
        method: paymentMethod,
      },
    });
  }

  private async generateTransaction(paymentId: string, orderId: string, amount: number) {
    const trs: CreateTransactionDto = {
      paymentId,
      orderId,
      amount,
    };

    const { providerTrxId: snapToken, checkoutUrl } = await this.mockPgService.createTransaction(trs);
    return { snapToken, checkoutUrl };
  }


  async createCheckoutSession(orderId: string, customerId: string) {
    const order = await this.orderService.findOne(orderId, customerId);
    const payment = await this.prisma.payment.create({
      data: {
        amount: order.totalAmount,
        orderId: order.id,
        status: 'PENDING',
      },
    });

    const { snapToken, checkoutUrl } = await this.generateTransaction(
      payment.id,
      order.id,
      order.totalAmount,
    );

    await Promise.all([
      this.orderService.markAsPaymentPending(orderId, customerId),
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { providerTrxId: snapToken },
      }),
    ]);

    return {
      orderId: order.id,
      checkoutUrl,
      providerTrxId: snapToken,
      totalAmount: order.totalAmount
    };
  }

  async existingCheckoutSession(orderId: string, customerId: string) {
    await this.orderService.findOne(orderId, customerId);
    const payment = await this.prisma.payment.findFirst({
      where: { 
        orderId,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const { snapToken, checkoutUrl } = await this.generateTransaction(
      payment.id,
      orderId,
      payment.amount,
    );

    return {
      orderId,
      checkoutUrl,
      providerTrxId: snapToken,
    };
  }
}


