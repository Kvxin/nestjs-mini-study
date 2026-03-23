import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CLIENT_TOKENS } from '../../../libs/contracts/messages';
import { createTcpClientProvider } from '../../../libs/common/tcp';
import { PrismaModule } from '../../../libs/prisma/prisma.module';
import { PaymentPageController } from './payment-page.controller';
import { PaymentServiceController } from './payment.controller';
import { PaymentServiceService } from './payment.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }), PrismaModule],
  controllers: [PaymentServiceController, PaymentPageController],
  providers: [
    PaymentServiceService,
    createTcpClientProvider(
      CLIENT_TOKENS.ORDER_SERVICE,
      'ORDER_SERVICE_HOST',
      'ORDER_SERVICE_PORT',
    ),
  ],
})
export class PaymentServiceAppModule {}
