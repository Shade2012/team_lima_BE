import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  async handlePaymentSuccess(orderId: string): Promise<void> {
    this.logger.log(`Handling payment success for order: ${orderId}`);
  }
}
