import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import {redisStore} from 'cache-manager-redis-yet'
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExampleSwaggerModule } from './features/example_swagger/example_swagger.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthGuard } from './guards/auth.guard';
import { UserModule } from './features/account/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { HttpExceptionFilter } from './filter/http-exception.filter';
import { ScheduleModule } from '@nestjs/schedule'
import { env } from 'process';
import { EventModule } from './features/event_management/event/event.module';
import { TicketCategoryModule } from './features/event_management/ticket-category/ticket-category.module';
import { SeatModule } from './features/event_management/seat/seat.module';
import { GateModule } from './features/event_management/gate/gate.module';
import { RedisIoModule } from './redis/redis.module';
import { AuthModule } from './features/account/auth/auth.module';
import { OrderModule } from './features/transaction/order/order.module';
import { TicketModule } from './features/transaction/ticket/ticket.module';
import { PaymentModule } from './features/transaction/payment/payment.module';
import { MockPgModule } from './features/transaction/mock-pg/mock-pg.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_CONSTANT,
      global: true,
    }),
    ScheduleModule.forRoot(),

    RedisIoModule,

    CacheModule.registerAsync({
      isGlobal:true,
      useFactory: async () => ({
        store: await redisStore({
          socket:{
            host: process.env.REDIS_HOST || 'localhost',
            port: Number(process.env.REDIS_PORT) || 6379
          }
        })
      })
    }),

    BullModule.forRoot({
      connection:{
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      }
    }),
    AuthModule,
    PrismaModule, ExampleSwaggerModule, UserModule, EventModule, TicketCategoryModule, SeatModule, GateModule, OrderModule, TicketModule,
    PaymentModule, MockPgModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide:APP_INTERCEPTOR,
      useClass:ResponseInterceptor
    },
    {
      provide: APP_GUARD,
      useClass:AuthGuard
    },
    {
      provide:APP_FILTER,
      useClass:HttpExceptionFilter
    },
    {
      provide:APP_INTERCEPTOR,
      useClass:ClassSerializerInterceptor
    },
  ],
})
export class AppModule {}
