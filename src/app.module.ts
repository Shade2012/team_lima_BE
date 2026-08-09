import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExampleSwaggerModule } from './features/example_swagger/example_swagger.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, ExampleSwaggerModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide:APP_INTERCEPTOR,
      useClass:ResponseInterceptor
    },
    {
      provide:APP_INTERCEPTOR,
      useClass:ClassSerializerInterceptor
    },
  ],
})
export class AppModule {}
