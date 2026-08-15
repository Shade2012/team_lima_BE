import { forwardRef, Module } from '@nestjs/common';
import { MockPgController } from './mock-pg.controller';
import { MockPgService } from './mock-pg.service';
import { PaymentModule } from '../payment/payment.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    forwardRef(() => OrderModule),
    forwardRef(() => PaymentModule)
  ],
  controllers: [MockPgController],
  providers: [MockPgService],
  exports: [MockPgService],
})
export class MockPgModule {}
