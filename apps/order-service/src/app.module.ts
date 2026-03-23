import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../libs/prisma/prisma.module';
import { CLIENT_TOKENS } from '../../../libs/contracts/messages';
import { createTcpClientProvider } from '../../../libs/common/tcp';
import { OrderServiceController } from './order.controller';
import { OrderServiceService } from './order.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }), PrismaModule],
  controllers: [OrderServiceController],
  providers: [
    OrderServiceService,
    createTcpClientProvider(
      CLIENT_TOKENS.PRODUCT_SERVICE,
      'PRODUCT_SERVICE_HOST',
      'PRODUCT_SERVICE_PORT',
    ),
    createTcpClientProvider(
      CLIENT_TOKENS.PAYMENT_SERVICE,
      'PAYMENT_SERVICE_HOST',
      'PAYMENT_SERVICE_PORT',
    ),
  ],
})
export class OrderServiceAppModule {}
