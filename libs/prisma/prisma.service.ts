/**
 * Prisma 服务
 * 
 * 作用：封装 Prisma 客户端，提供数据库连接管理
 * 
 * Prisma 是一个 ORM（对象关系映射）工具，用于操作数据库
 * 本项目使用 PostgreSQL 数据库
 * 
 * @module libs/prisma/prisma.service
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService - Prisma 服务类
 * 
 * 继承关系：
 * - PrismaClient: Prisma 生成的数据库客户端，提供所有数据库操作方法
 * - OnModuleInit: NestJS 生命周期接口，模块初始化时触发
 * 
 * 为什么继承 PrismaClient：
 * 1. 直接使用所有数据库操作方法：prisma.user.findMany()
 * 2. 添加 NestJS 生命周期管理：模块加载时自动连接数据库
 * 3. 单例模式：整个应用共享一个 Prisma 实例
 * 
 * 使用示例（见 apps/user-service/src/user.service.ts）：
 * ```typescript
 * @Injectable()
 * export class UserServiceService {
 *   constructor(private readonly prisma: PrismaService) {}
 *   
 *   async register(payload: AuthPayload) {
 *     const user = await this.prisma.user.create({ data: {...} });
 *   }
 * }
 * ```
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  /**
   * 模块初始化钩子
   * 
   * 作用：当 NestJS 模块加载时，自动连接到数据库
   * 
   * 生命周期顺序：
   * 1. 模块构造函数执行
   * 2. onModuleInit() 被调用
   * 3. 模块可以开始处理请求
   * 
   * 为什么需要显式连接：
   * - Prisma 默认懒连接（第一次查询时才连接）
   * - 显式连接可以在启动时快速发现数据库配置问题
   * - 避免第一个请求延迟
   */
  async onModuleInit() {
    /**
     * $connect() - 建立数据库连接
     * 
     * 这是 PrismaClient 的方法
     * 连接池会在后台维护，不需要每次查询都连接
     * 
     * 如果连接失败，会抛出异常，阻止应用启动
     * 常见错误：
     * - 数据库未启动
     * - 连接字符串错误
     * - 网络问题
     */
    await this.$connect();
  }
}
