import { forwardRef, Module } from '@nestjs/common';
import { MockPgController } from './mock-pg.controller';
import { MockPgService } from './mock-pg.service';
import { PaymentModule } from '../payment/payment.module';
import { OrderModule } from '../order/order.module';
import { RedisIoModule } from 'src/redis/redis.module';

@Module({
  imports: [
    forwardRef(() => OrderModule),
    forwardRef(() => PaymentModule),
    RedisIoModule
  ],
  controllers: [MockPgController],
  providers: [MockPgService],
  exports: [MockPgService],
})
export class MockPgModule {}
