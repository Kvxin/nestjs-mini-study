import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { applyHttpAppDefaults } from '../../../libs/common/http';
import { getTcpMicroserviceOptions } from '../../../libs/common/tcp';
import { PaymentServiceAppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(PaymentServiceAppModule);
  const configService = app.get(ConfigService);

  applyHttpAppDefaults(app, configService);
  app.connectMicroservice(
    getTcpMicroserviceOptions(
      configService.get<string>('APP_HOST', '0.0.0.0'),
      Number(configService.get<string>('PAYMENT_SERVICE_PORT', '3004')),
    ),
  );

  await app.startAllMicroservices();
  await app.listen(Number(configService.get<string>('PAYMENT_SERVICE_PORT', '3004')));
  Logger.log('Payment service is listening');
}

bootstrap();
