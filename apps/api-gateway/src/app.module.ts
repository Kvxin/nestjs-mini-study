/**
 * API Gateway - 应用模块
 * 
 * 作用：定义 API Gateway 的模块结构，注册依赖、控制器、提供者
 * 
 * 这是 API Gateway 的根模块，所有其他模块都在这里导入
 * 
 * @module apps/api-gateway/src/app.module
 */

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MicroserviceClientsModule } from './common/microservice-clients.module';
import { AuthController } from './auth/auth.controller';
import { JwtStrategy } from './auth/jwt.strategy';
import { UsersController } from './users/users.controller';
import { ProductsController } from './products/products.controller';
import { OrdersController } from './orders/orders.controller';
import { PaymentsController } from './payments/payments.controller';
import { RolesGuard } from './auth/roles.guard';

/**
 * API Gateway 根模块
 * 
 * @Module 装饰器参数：
 * - imports: 导入的模块
 * - controllers: 控制器数组
 * - providers: 提供者数组（服务、守卫、策略等）
 * - exports: 导出的提供者（供其他模块使用）
 */
@Module({
  // ============ 导入的模块 ============

  imports: [
    /**
     * ConfigModule.forRoot - 配置模块
     * 
     * 作用：加载环境变量，提供 ConfigService
     * 
     * 配置说明：
     * - isGlobal: true - 注册为全局模块，所有地方都可以注入 ConfigService
     * - envFilePath: '.env' - 指定环境变量文件路径
     * 
     * 使用示例：
     * ```typescript
     * constructor(private configService: ConfigService) {}
     * const port = this.configService.get('API_GATEWAY_PORT');
     * ```
     */
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    
    /**
     * PassportModule - Passport 认证模块
     * 
     * 作用：集成 Passport 认证框架
     * 
     * Passport 是什么：
     * - Node.js 最流行的认证库
     * - 支持多种认证策略（JWT、OAuth、Local 等）
     * - 中间件架构，易于扩展
     * 
     * 本项目使用：
     * - JWT Strategy（见 apps/api-gateway/src/auth/jwt.strategy.ts）
     */
    PassportModule,
    
    /**
     * JwtModule.register - JWT 模块
     * 
     * 作用：提供 JWT 令牌生成和验证功能
     * 
     * 为什么没有配置：
     * - 配置在 JwtStrategy 中（见 apps/api-gateway/src/auth/jwt.strategy.ts）
     * - 这里只需注册模块，具体配置由 Strategy 处理
     * 
     * 提供的服务：
     * - JwtService: 用于生成和验证 JWT
     */
    JwtModule.register({}),
    
    /**
     * ThrottlerModule.forRoot - 限流模块
     * 
     * 作用：限制每个 IP 的请求频率，防止滥用
     * 
     * 配置说明：
     * - ttl: 60_000 - 时间窗口（60 秒，下划线是数字分隔符）
     * - limit: 30 - 每个时间窗口内最多 30 个请求
     * 
     * 效果：
     * - 每个 IP 每秒最多 0.5 个请求（30/60）
     * - 超过限制返回 429 Too Many Requests
     * 
     * 使用场景：
     * - 防止暴力破解
     * - 防止 DDoS 攻击
     * - 保护后端服务
     */
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 30,
      },
    ]),
    
    /**
     * MicroserviceClientsModule - 微服务客户端模块
     * 
     * 作用：注册所有微服务的 TCP 客户端
     * 
     * 提供的客户端：
     * - USER_SERVICE: 用户服务客户端
     * - PRODUCT_SERVICE: 产品服务客户端
     * - ORDER_SERVICE: 订单服务客户端
     * - PAYMENT_SERVICE: 支付服务客户端
     * 
     * 使用示例（见 apps/api-gateway/src/auth/auth.controller.ts）：
     * ```typescript
     * @Inject(CLIENT_TOKENS.USER_SERVICE)
     * private readonly userClient: ClientProxy
     * ```
     */
    MicroserviceClientsModule,
  ],

  // ============ 控制器 ============

  /**
   * controllers - 控制器数组
   * 
   * 作用：注册所有 HTTP 端点
   * 
   * NestJS 路由：
   * - 请求 -> 路由 -> 控制器方法 -> 返回响应
   * 
   * 各控制器职责：
   * - AuthController: 认证相关（注册、登录、刷新、登出）
   * - UsersController: 用户相关（获取资料）
   * - ProductsController: 商品相关（增删改查）
   * - OrdersController: 订单相关（创建、查询）
   * - PaymentsController: 支付相关（获取二维码）
   */
  controllers: [
    AuthController,
    UsersController,
    ProductsController,
    OrdersController,
    PaymentsController,
  ],

  // ============ 提供者 ============

  /**
   * providers - 提供者数组
   * 
   * 作用：注册可注入的服务、守卫、策略等
   */
  providers: [
    /**
     * JwtStrategy - JWT 策略
     * 
     * 作用：定义如何验证 JWT 令牌
     * 
     * 继承 PassportStrategy(Strategy):
     * - 集成到 Passport 认证系统
     * - 使用 jwt 策略验证 Bearer Token
     * 
     * 使用位置：
     * - AccessAuthGuard 使用这个策略（见 apps/api-gateway/src/auth/access-auth.guard.ts）
     */
    JwtStrategy,
    
    /**
     * RolesGuard - 角色守卫
     * 
     * 作用：基于角色的访问控制（RBAC）
     * 
     * 使用示例（见 apps/api-gateway/src/products/products.controller.ts）：
     * ```typescript
     * @UseGuards(AccessAuthGuard, RolesGuard)
     * @Roles('ADMIN')  // 只有管理员可以访问
     * @Post()
     * create() { ... }
     * ```
     */
    RolesGuard,
    
    /**
     * APP_GUARD - 全局守卫提供者
     * 
     * 作用：注册全局守卫，应用于所有路由
     * 
     * 为什么需要：
     * - 限流守卫需要应用到所有路由
     * - 不用在每个控制器上重复添加 @UseGuards(ThrottlerGuard)
     * 
     * 工作原理：
     * - provide: APP_GUARD - 特殊令牌，NestJS 识别为全局守卫
     * - useClass: ThrottlerGuard - 使用限流守卫类
     * 
     * 效果：
     * - 所有请求都会经过 ThrottlerGuard
     * - 自动限制每个 IP 的请求频率
     */
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class ApiGatewayAppModule {}
