import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ProductServiceAppModule } from './app.module';
import { getTcpMicroserviceOptions } from '../../../libs/common/tcp';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(
    ProductServiceAppModule,
    getTcpMicroserviceOptions(
      process.env.APP_HOST ?? '0.0.0.0',
      Number(process.env.PRODUCT_SERVICE_PORT ?? '3002'),
    ),
  );
  await app.listen();
  Logger.log('Product service is listening');
}

bootstrap();
