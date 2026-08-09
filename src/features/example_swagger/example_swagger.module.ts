import { Module } from '@nestjs/common';
import { ExampleSwaggerService } from './example_swagger.service';
import { ExampleSwaggerController } from './example_swagger.controller';

@Module({
  controllers: [ExampleSwaggerController],
  providers: [ExampleSwaggerService],
})
export class ExampleSwaggerModule {}
