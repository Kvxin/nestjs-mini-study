/**
 * TCP 微服务配置工具
 * 
 * 这个文件提供了创建 TCP 微服务客户端和服务器的配置函数
 * NestJS 微服务之间通过 TCP 进行通信
 * 
 * @module libs/common/tcp
 */

import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxyFactory, Transport } from '@nestjs/microservices';

/**
 * 创建 TCP 客户端提供者（Provider）
 * 
 * 作用：创建一个可注入的微服务客户端，用于 API Gateway 调用后端微服务
 * 
 * @param token - 注入令牌，用于在依赖注入系统中标识这个客户端
 * @param hostEnvName - 主机地址的环境变量名（如 'USER_SERVICE_HOST'）
 * @param portEnvName - 端口号的环境变量名（如 'USER_SERVICE_PORT'）
 * @returns Provider - 可注入的 Provider 对象
 * 
 * 使用示例：
 * ```typescript
 * // 在 API Gateway 模块中注册微服务客户端（见 apps/api-gateway/src/common/microservice-clients.module.ts:13）
 * createTcpClientProvider(
 *   CLIENT_TOKENS.USER_SERVICE,  // 令牌：'USER_SERVICE'
 *   'USER_SERVICE_HOST',         // 从 .env 读取 host
 *   'USER_SERVICE_PORT',         // 从 .env 读取 port
 * )
 * ```
 * 
 * 注入使用示例：
 * ```typescript
 * // 在控制器中注入并使用（见 apps/api-gateway/src/auth/auth.controller.ts:30）
 * constructor(
 *   @Inject(CLIENT_TOKENS.USER_SERVICE)
 *   private readonly userClient: ClientProxy,
 * ) {}
 * ```
 * 
 * 为什么需要 Provider 模式：
 * - NestJS 的依赖注入系统需要 Provider 来管理实例
 * - 通过 token 可以在任何地方注入同一个客户端实例
 * - 配置集中管理，便于维护和测试
 */
export function createTcpClientProvider(
  token: string,
  hostEnvName: string,
  portEnvName: string,
): Provider {
  return {
    /**
     * provide: 提供者令牌
     * 
     * 作用：在依赖注入系统中的唯一标识
     * 使用方式：其他类通过 @Inject(token) 来注入这个依赖
     * 
     * 示例：CLIENT_TOKENS.USER_SERVICE = 'USER_SERVICE'
     */
    provide: token,
    
    /**
     * inject: 依赖注入列表
     * 
     * 作用：声明这个 Provider 需要注入哪些其他服务
     * 这里需要 ConfigService 来读取环境变量
     */
    inject: [ConfigService],
    
    /**
     * useFactory: 工厂函数
     * 
     * 作用：动态创建客户端实例
     * 为什么用工厂：因为需要从配置文件读取主机和端口，不能静态定义
     * 
     * 工作流程：
     * 1. ConfigService 注入时自动传入
     * 2. 从 .env 文件读取 host 和 port
     * 3. 使用 ClientProxyFactory 创建 TCP 客户端
     */
    useFactory: (configService: ConfigService) =>
      ClientProxyFactory.create({
        /**
         * transport: Transport.TCP
         * 
         * 作用：指定使用 TCP 传输协议
         * 
         * NestJS 支持的其他传输方式：
         * - Transport.REDIS: 使用 Redis 作为消息代理
         * - Transport.NATS: 使用 NATS 消息队列
         * - Transport.RMQ: 使用 RabbitMQ
         * - Transport.KAFKA: 使用 Kafka
         * 
         * 为什么选择 TCP：
         * - 简单直接，适合本地开发和小型项目
         * - 不需要额外的消息中间件
         * - 缺点：不支持服务发现和负载均衡，生产环境建议用 Redis/NATS
         */
        transport: Transport.TCP,
        
        /**
         * options: TCP 连接配置
         * 
         * host: 微服务监听地址，通常 0.0.0.0 或 127.0.0.1
         * port: 微服务监听端口，每个服务有不同的端口
         * 
         * 端口分配（见 .env）：
         * - User Service: 3001
         * - Product Service: 3002
         * - Order Service: 3003
         * - Payment Service: 3004
         */
        options: {
          host: configService.getOrThrow<string>(hostEnvName),
          port: Number(configService.getOrThrow<string>(portEnvName)),
        },
      }),
  };
}

/**
 * 获取 TCP 微服务配置选项
 * 
 * 作用：创建微服务监听配置，用于微服务启动时绑定到指定地址和端口
 * 
 * @param host - 监听地址，通常 '0.0.0.0' 允许所有网络接口访问
 * @param port - 监听端口号
 * @returns 微服务配置对象
 * 
 * 使用示例：
 * ```typescript
 * // 在微服务 main.ts 中启动监听（见 apps/user-service/src/main.ts:10）
 * const app = await NestFactory.createMicroservice(
 *   UserServiceAppModule,
 *   getTcpMicroserviceOptions(
 *     process.env.APP_HOST ?? '0.0.0.0',
 *     Number(process.env.USER_SERVICE_PORT ?? '3001'),
 *   ),
 * );
 * await app.listen();  // 开始监听 TCP 连接
 * ```
 * 
 * 与 createTcpClientProvider 的区别：
 * - getTcpMicroserviceOptions: 用于服务端（微服务自己）监听连接
 * - createTcpClientProvider: 用于客户端（API Gateway）发起连接
 */
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
