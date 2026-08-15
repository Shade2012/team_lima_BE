import { forwardRef, Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { MockPgModule } from '../mock-pg/mock-pg.module';
import { OrderModule } from '../order/order.module';

@Module({
  imports:[
    forwardRef(() => MockPgModule),
    forwardRef(() => OrderModule),
  ],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
