import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExampleSwaggerModule } from './features/example_swagger/example_swagger.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthGuard } from './guards/auth.guard';
import { UserModule } from './features/user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { HttpExceptionFilter } from './filter/http-exception.filter';
import { env } from 'process';
import { EventModule } from './features/event/event.module';
import { TicketCategoryModule } from './features/ticket-category/ticket-category.module';
import { SeatModule } from './features/seat/seat.module';
import { GateModule } from './features/gate/gate.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_CONSTANT,
      global: true,
      signOptions:{
        expiresIn:'1d'
      }
    }),
    BullModule.forRoot({
      connection:{
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      }
    }),
    PrismaModule, ExampleSwaggerModule, UserModule, EventModule, TicketCategoryModule, SeatModule, GateModule
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
