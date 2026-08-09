import { NestFactory, Reflector } from '@nestjs/core';
import 'dotenv/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { BadRequestException, ClassSerializerInterceptor, ValidationError, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = new DocumentBuilder()
  .setTitle("Tim_Lima_BE")
  .setDescription("API Contract for Tim Lima BE")
  .setVersion('1.0')
  .addTag('App')
  .build()

  app.useGlobalPipes(
  new ValidationPipe({
    transform:true,
    whitelist:true,
    exceptionFactory: (validationErrors: ValidationError[] = []) => {
      return new BadRequestException(
        validationErrors.map((error) => ({
          field: error.property,
          error: Object.values(error.constraints ?? "").join(', '),
          })),
        );
      },
    }),
  );

  const documentFactory = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api', app, documentFactory)
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
