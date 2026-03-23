import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { UserServiceAppModule } from './app.module';
import { getTcpMicroserviceOptions } from '../../../libs/common/tcp';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(
    UserServiceAppModule,
    getTcpMicroserviceOptions(
      process.env.APP_HOST ?? '0.0.0.0',
      Number(process.env.USER_SERVICE_PORT ?? '3001'),
    ),
  );
  await app.listen();
  Logger.log('User service is listening');
}

bootstrap();
