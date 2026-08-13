import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(private readonly prisma: PrismaService) {}

  async processPaymentSuccess(paymentId: string, providerTrxId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        providerTrxId: providerTrxId,
      },
    });
  }
}
