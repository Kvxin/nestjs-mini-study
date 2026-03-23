/**
 * 微服务客户端模块
 * 
 * 作用：注册所有微服务的 TCP 客户端提供者
 * 
 * 这是一个全局模块，在整个应用中只需导入一次
 * 所有控制器都可以通过注入令牌获取对应的微服务客户端
 * 
 * @module apps/api-gateway/src/common/microservice-clients.module
 */

import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { createTcpClientProvider } from '../../../../libs/common/tcp';
import { CLIENT_TOKENS } from '../../../../libs/contracts/messages';

/**
 * @Global() - 全局模块装饰器
 * 
 * 作用：将这个模块注册为全局模块
 * 
 * 好处：
 * - 其他模块不需要显式导入这个模块
 * - 所有控制器都可以直接注入微服务客户端
 * 
 * 使用示例：
 * ```typescript
 * // 不需要导入 MicroserviceClientsModule
 * @Controller('auth')
 * export class AuthController {
 *   constructor(
 *     @Inject(CLIENT_TOKENS.USER_SERVICE)
 *     private readonly userClient: ClientProxy,
 *   ) {}
 * }
 * ```
 */
@Global()

/**
 * Module - 模块装饰器
 * 
 * 配置说明：
 * - imports: 导入的模块
 * - providers: 提供者数组
 * - exports: 导出的令牌
 */
@Module({
  /**
   * imports - 导入的模块
   * 
   * ConfigModule:
   * - 因为 createTcpClientProvider 需要 ConfigService
   * - ConfigService 用于读取环境变量中的主机和端口
   */
  imports: [ConfigModule],
  
  /**
   * providers - 提供者数组
   * 
   * 使用 createTcpClientProvider 创建 4 个微服务客户端：
   * 
   * 1. USER_SERVICE - 用户服务客户端
   * 2. PRODUCT_SERVICE - 产品服务客户端
   * 3. ORDER_SERVICE - 订单服务客户端
   * 4. PAYMENT_SERVICE - 支付服务客户端
   * 
   * 每个客户端配置：
   * - 令牌：用于依赖注入
   * - 主机：从环境变量读取（如 USER_SERVICE_HOST）
   * - 端口：从环境变量读取（如 USER_SERVICE_PORT）
   */
  providers: [
    /**
     * 用户服务客户端
     * 
     * 令牌：CLIENT_TOKENS.USER_SERVICE = 'USER_SERVICE'
     * 主机：USER_SERVICE_HOST（默认 127.0.0.1）
     * 端口：USER_SERVICE_PORT（默认 3001）
     */
    createTcpClientProvider(
      CLIENT_TOKENS.USER_SERVICE,
      'USER_SERVICE_HOST',
      'USER_SERVICE_PORT',
    ),
    
    /**
     * 产品服务客户端
     * 
     * 令牌：CLIENT_TOKENS.PRODUCT_SERVICE = 'PRODUCT_SERVICE'
     * 主机：PRODUCT_SERVICE_HOST（默认 127.0.0.1）
     * 端口：PRODUCT_SERVICE_PORT（默认 3002）
     */
    createTcpClientProvider(
      CLIENT_TOKENS.PRODUCT_SERVICE,
      'PRODUCT_SERVICE_HOST',
      'PRODUCT_SERVICE_PORT',
    ),
    
    /**
     * 订单服务客户端
     * 
     * 令牌：CLIENT_TOKENS.ORDER_SERVICE = 'ORDER_SERVICE'
     * 主机：ORDER_SERVICE_HOST（默认 127.0.0.1）
     * 端口：ORDER_SERVICE_PORT（默认 3003）
     */
    createTcpClientProvider(
      CLIENT_TOKENS.ORDER_SERVICE,
      'ORDER_SERVICE_HOST',
      'ORDER_SERVICE_PORT',
    ),
    
    /**
     * 支付服务客户端
     * 
     * 令牌：CLIENT_TOKENS.PAYMENT_SERVICE = 'PAYMENT_SERVICE'
     * 主机：PAYMENT_SERVICE_HOST（默认 127.0.0.1）
     * 端口：PAYMENT_SERVICE_PORT（默认 3004）
     */
    createTcpClientProvider(
      CLIENT_TOKENS.PAYMENT_SERVICE,
      'PAYMENT_SERVICE_HOST',
      'PAYMENT_SERVICE_PORT',
    ),
  ],
  
  /**
   * exports - 导出数组
   * 
   * Object.values(CLIENT_TOKENS):
   * - 导出所有客户端令牌
   * - 值：['USER_SERVICE', 'PRODUCT_SERVICE', 'ORDER_SERVICE', 'PAYMENT_SERVICE']
   * 
   * 为什么导出：
   * - 其他模块导入 MicroserviceClientsModule 后可以使用这些客户端
   * - 虽然这是全局模块，但显式导出是个好习惯
   */
  exports: Object.values(CLIENT_TOKENS),
})
export class MicroserviceClientsModule {}
