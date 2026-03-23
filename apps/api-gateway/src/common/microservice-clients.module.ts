import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createTcpClientProvider } from '../../../../libs/common/tcp';
import { CLIENT_TOKENS } from '../../../../libs/contracts/messages';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    createTcpClientProvider(
      CLIENT_TOKENS.USER_SERVICE,
      'USER_SERVICE_HOST',
      'USER_SERVICE_PORT',
    ),
    createTcpClientProvider(
      CLIENT_TOKENS.PRODUCT_SERVICE,
      'PRODUCT_SERVICE_HOST',
      'PRODUCT_SERVICE_PORT',
    ),
    createTcpClientProvider(
      CLIENT_TOKENS.ORDER_SERVICE,
      'ORDER_SERVICE_HOST',
      'ORDER_SERVICE_PORT',
    ),
    createTcpClientProvider(
      CLIENT_TOKENS.PAYMENT_SERVICE,
      'PAYMENT_SERVICE_HOST',
      'PAYMENT_SERVICE_PORT',
    ),
  ],
  exports: Object.values(CLIENT_TOKENS),
})
export class MicroserviceClientsModule {}
