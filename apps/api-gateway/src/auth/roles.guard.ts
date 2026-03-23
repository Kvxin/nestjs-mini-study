/**
 * 角色守卫
 * 
 * 作用：基于角色的访问控制（RBAC - Role-Based Access Control）
 * 
 * 检查当前用户是否有权限访问特定路由
 * 
 * @module apps/api-gateway/src/auth/roles.guard
 */

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtPayload } from '../../../../libs/contracts/messages';
import { ROLES_KEY } from './roles.decorator';

/**
 * RolesGuard - 角色守卫类
 * 
 * 实现 CanActivate 接口：
 * - NestJS 守卫的标准接口
 * - 必须实现 canActivate 方法
 * 
 * 依赖注入：
 * - Reflector: 反射器服务，用于读取元数据
 * 
 * 使用示例（见 apps/api-gateway/src/products/products.controller.ts）：
 * ```typescript
 * @Post()
 * @UseGuards(AccessAuthGuard, RolesGuard)  // 先验证 token，再验证角色
 * @Roles('ADMIN')  // 要求 ADMIN 角色
 * create() { ... }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * 构造函数注入 Reflector
   * 
   * Reflector 作用：
   * - 读取装饰器设置的元数据
   * - 可以读取控制器级别和方法级别的元数据
   */
  constructor(private readonly reflector: Reflector) {}

  /**
   * 激活检查方法
   * 
   * 作用：判断当前请求是否可以激活（访问路由）
   * 
   * @param context - 执行上下文
   * @returns boolean - true 允许访问，false 拒绝访问
   * 
   * 执行流程：
   * 1. 从元数据读取角色要求
   * 2. 如果没有角色要求，允许访问
   * 3. 获取当前用户信息
   * 4. 检查用户角色是否在允许列表中
   * 5. 返回检查结果
   */
  canActivate(context: ExecutionContext): boolean {
    /**
     * 从元数据读取角色要求
     * 
     * reflector.getAllAndOverride:
     * - 读取 ROLES_KEY 对应的元数据
     * - 检查两个位置：
     *   1. context.getHandler() - 方法级别（@Roles 在方法上）
     *   2. context.getClass() - 类级别（@Roles 在控制器类上）
     * 
     * getAllAndOverride 行为：
     * - 如果两个位置都有，方法级别的覆盖类级别的
     * - 如果只有一个位置有，使用该位置的值
     * - 如果都没有，返回 undefined
     * 
     * 示例：
     * - @Roles('ADMIN') 在方法上 -> roles = ['ADMIN']
     * - @Roles('USER', 'ADMIN') 在类上 -> roles = ['USER', 'ADMIN']
     * - 没有 @Roles -> roles = undefined
     */
    const roles = this.reflector.getAllAndOverride<Array<'USER' | 'ADMIN'>>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    /**
     * 如果没有角色要求，允许访问
     * 
     * 两种情况：
     * 1. 路由没有使用 @Roles 装饰器（公开路由）
     * 2. @Roles() 没有传参数（空数组）
     * 
     * 这是为了灵活性：
     * - 不是所有路由都需要角色控制
     * - 有些路由只需要登录（AccessAuthGuard），不需要特定角色
     */
    if (!roles || roles.length === 0) {
      return true;
    }

    /**
     * 获取当前用户信息
     * 
     * context.switchToHttp():
     * - 切换到 HTTP 上下文
     * 
     * getRequest<{ user?: JwtPayload }>():
     * - 获取 HTTP 请求对象
     * - 类型注解：request.user 可能是 JwtPayload
     * 
     * request.user 从哪里来：
     * - AccessAuthGuard 验证 JWT 成功后
     * - JwtStrategy.validate() 返回的 payload 被附加到 request.user
     */
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    
    /**
     * 角色权限检查
     * 
     * 检查条件：
     * 1. request.user 存在（用户已登录）
     * 2. request.user.role 在允许的角色列表中
     * 
     * roles.includes():
     * - 检查用户角色是否在允许的角色数组中
     * - 例如：roles = ['ADMIN'], user.role = 'USER' -> false
     * 
     * 如果检查失败，抛出 403 Forbidden 异常
     */
    if (!request.user || !roles.includes(request.user.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    /**
     * 检查通过，允许访问
     * 
     * 返回 true 后：
     * - NestJS 继续执行控制器方法
     * - 用户可以访问请求的资源
     */
    return true;
  }
}

/**
 * 完整认证流程示例
 * 
 * 用户请求：POST /api/products
 * 
 * 1. AccessAuthGuard 先执行
 *    - 提取 Authorization: Bearer <token>
 *    - JwtStrategy 验证 token
 *    - 验证成功，payload 附加到 request.user
 *    - 返回 true，继续
 * 
 * 2. RolesGuard 后执行
 *    - 读取 @Roles('ADMIN') 元数据
 *    - roles = ['ADMIN']
 *    - 检查 request.user.role
 *    - 如果是 'ADMIN'，返回 true，允许访问
 *    - 如果是 'USER'，抛出 403 Forbidden
 * 
 * 3. 控制器方法执行
 *    - create() 方法被调用
 *    - 创建商品
 */
