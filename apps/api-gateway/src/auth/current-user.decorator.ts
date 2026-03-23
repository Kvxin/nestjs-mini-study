/**
 * 当前用户装饰器
 * 
 * 作用：创建一个参数装饰器，用于在控制器方法中获取当前登录用户的信息
 * 
 * 使用这个装饰器可以方便地访问 JWT payload 中的用户数据
 * 
 * @module apps/api-gateway/src/auth/current-user.decorator
 */

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../../../../libs/contracts/messages';

/**
 * CurrentUser - 当前用户参数装饰器
 * 
 * createParamDecorator 工厂函数：
 * - NestJS 提供的创建参数装饰器的工具
 * - 简化装饰器的创建过程
 * 
 * 装饰器工厂函数参数：
 * - _data: unknown - 装饰器参数（如果使用时传参）
 * - ctx: ExecutionContext - 执行上下文
 * 
 * 返回值：
 * - JwtPayload - 当前用户的信息
 * 
 * 使用示例（见 apps/api-gateway/src/orders/orders.controller.ts）：
 * 
 * ```typescript
 * @Post()
 * @UseGuards(AccessAuthGuard)  // 先验证 token
 * @ApiOperation({ summary: 'Create order' })
 * create(
 *   @Body() dto: CreateOrderDto,
 *   @CurrentUser() user: { sub: string }  // 获取当前用户
 * ) {
 *   // user.sub = 用户 ID
 *   // user.email = 用户邮箱
 *   // user.role = 用户角色
 *   return this.orderClient.send(ORDER_PATTERNS.CREATE, {
 *     userId: user.sub,
 *     items: dto.items,
 *   });
 * }
 * ```
 * 
 * 工作原理：
 * 
 * 1. 请求到达时，AccessAuthGuard 先验证 JWT token
 * 2. JwtStrategy.validate() 返回 payload
 * 3. payload 被附加到 request.user
 * 4. 控制器方法执行时，@CurrentUser() 装饰器被触发
 * 5. 装饰器从 request.user 读取数据
 * 6. 返回给控制器方法参数
 * 
 * 为什么需要这个装饰器：
 * 
 * 1. 类型安全：TypeScript 知道返回的是 JwtPayload 类型
 * 2. 代码简洁：不用每次都写 ctx.switchToHttp().getRequest()
 * 3. 统一风格：所有控制器使用相同的方式获取用户
 * 4. 易于维护：如果需要修改获取逻辑，只需改这一个地方
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    /**
     * _data 参数说明
     * 
     * 如果装饰器使用时传参，可以在这里访问：
     * 
     * ```typescript
     * // 定义时支持参数
     * export const CurrentUser = createParamDecorator(
     *   (data: string, ctx: ExecutionContext) => {
     *     const request = ctx.switchToHttp().getRequest();
     *     return data ? request.user[data] : request.user;
     *   },
     * );
     * 
     * // 使用时传参
     * @CurrentUser('email') email: string  // 只获取 email
     * ```
     * 
     * 本项目不需要这个功能，所以忽略 _data
     */
    
    /**
     * 获取 HTTP 请求对象
     * 
     * ctx.switchToHttp():
     * - 切换到 HTTP 上下文
     * 
     * getRequest<{ user: JwtPayload }>():
     * - 获取请求对象
     * - 类型注解：request.user 是 JwtPayload 类型
     */
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    
    /**
     * 返回用户信息
     * 
     * request.user 包含：
     * - sub: 用户 ID
     * - email: 用户邮箱
     * - role: 用户角色（'USER' 或 'ADMIN'）
     * 
     * 这些信息来自 JWT payload
     * 在 JwtStrategy.validate() 中返回
     */
    return request.user;
  },
);
