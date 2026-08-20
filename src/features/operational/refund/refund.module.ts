import { Module } from '@nestjs/common';
import { RefundService } from './refund.service';
import { RefundController } from './refund.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MockPgModule } from '../../transaction/mock-pg/mock-pg.module';
import { RedisIoModule } from 'src/redis/redis.module';

import { TicketModule } from '../../transaction/ticket/ticket.module';

@Module({
  imports: [PrismaModule, MockPgModule, RedisIoModule, TicketModule],
  controllers: [RefundController],
  providers: [RefundService],
  exports: [RefundService],
})
export class RefundModule {}
