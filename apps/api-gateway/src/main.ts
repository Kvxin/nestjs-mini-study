import 'dotenv/config';
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { applyHttpAppDefaults } from '../../../libs/common/http';
import { REFRESH_TOKEN_COOKIE } from '../../../libs/common/tokens';
import { ApiGatewayAppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(ApiGatewayAppModule);
  const configService = app.get(ConfigService);

  applyHttpAppDefaults(app, configService);
  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('NestJS Mini E-Commerce')
    .setDescription('API Gateway for user, product, order and payment services')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addCookieAuth(REFRESH_TOKEN_COOKIE)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document);

  const port = Number(configService.get<string>('API_GATEWAY_PORT', '3000'));
  await app.listen(port);
  Logger.log(`API Gateway is listening on ${port}`);
}

bootstrap();
