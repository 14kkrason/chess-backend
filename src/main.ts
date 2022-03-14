import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'debug', 'warn'],
  });
  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableCors({ origin: 'null', credentials: true})
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}
bootstrap();
