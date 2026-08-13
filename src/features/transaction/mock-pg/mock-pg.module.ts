import { Module } from '@nestjs/common';
import { MockPgController } from './mock-pg.controller';
import { MockPgService } from './mock-pg.service';
import { PaymentModule } from '../payment/payment.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [PaymentModule, OrdersModule],
  controllers: [MockPgController],
  providers: [MockPgService],
  exports: [MockPgService],
})
export class MockPgModule {}
