/**
 * Prisma 模块
 * 
 * 作用：将 PrismaService 注册为全局模块，使得整个应用都可以注入使用
 * 
 * 为什么需要这个模块：
 * 1. 封装数据库连接：所有数据库操作都通过 PrismaService
 * 2. 全局可用：不需要在每个模块中重复导入
 * 3. 单例模式：整个应用共享一个数据库连接实例
 * 
 * @module libs/prisma/prisma.module
 */

import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * @Global() - 全局模块装饰器
 * 
 * 作用：将这个模块注册为全局模块
 * 
 * 全局模块的特点：
 * 1. 只需在根模块导入一次，所有模块都可以使用
 * 2. 不需要在每个需要数据库的模块中重复导入
 * 
 * 对比：
 * 
 * 不使用 @Global()：
 * ```typescript
 * // 每个模块都要导入
 * @Module({
 *   imports: [PrismaModule],
 * })
 * export class UserServiceModule {}
 * 
 * @Module({
 *   imports: [PrismaModule],
 * })
 * export class ProductServiceModule {}
 * ```
 * 
 * 使用 @Global()：
 * ```typescript
 * // 只需在根模块导入一次
 * @Module({
 *   imports: [PrismaModule],
 * })
 * export class ApiGatewayAppModule {}
 * 
 * // 其他模块自动可用
 * @Module({})
 * export class UserServiceModule {}
 * ```
 * 
 * 使用位置：
 * - apps/user-service/src/app.module.ts:10
 * - apps/product-service/src/app.module.ts:7
 * - apps/order-service/src/app.module.ts:7
 * - apps/payment-service/src/app.module.ts:9
 */
@Global()
@Module({
  /**
   * providers - 提供者数组
   * 
   * 作用：注册可注入的服务
   * 
   * PrismaService 注册后，可以在任何地方通过构造函数注入：
   * ```typescript
   * constructor(private readonly prisma: PrismaService) {}
   * ```
   */
  providers: [PrismaService],
  
  /**
   * exports - 导出数组
   * 
   * 作用：将 PrismaService 导出，让其他模块可以使用
   * 
   * 为什么需要导出：
   * - 其他模块导入 PrismaModule 后，需要能注入 PrismaService
   * - 不导出的话，PrismaService 只能在 PrismaModule 内部使用
   * 
   * 导出后可以这样用：
   * ```typescript
   * @Module({
   *   imports: [PrismaModule],  // 导入后可以使用 PrismaService
   * })
   * export class UserServiceModule {}
   * ```
   */
  exports: [PrismaService],
})
export class PrismaModule {}
