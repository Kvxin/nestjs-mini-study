import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { OrderServiceAppModule } from './app.module';
import { getTcpMicroserviceOptions } from '../../../libs/common/tcp';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(
    OrderServiceAppModule,
    getTcpMicroserviceOptions(
      process.env.APP_HOST ?? '0.0.0.0',
      Number(process.env.ORDER_SERVICE_PORT ?? '3003'),
    ),
  );
  await app.listen();
  Logger.log('Order service is listening');
}

bootstrap();
