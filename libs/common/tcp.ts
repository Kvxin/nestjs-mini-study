import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

export function createTcpClientProvider(
  token: string,
  hostEnvName: string,
  portEnvName: string,
): Provider {
  return {
    provide: token,
    inject: [ConfigService],
    useFactory: (configService: ConfigService) =>
      ClientProxyFactory.create({
        transport: Transport.TCP,
        options: {
          host: configService.getOrThrow<string>(hostEnvName),
          port: Number(configService.getOrThrow<string>(portEnvName)),
        },
      }),
  };
}

export function getTcpMicroserviceOptions(
  host: string,
  port: number,
) {
  return {
    transport: Transport.TCP,
    options: {
      host,
      port,
    },
  } as const;
}
