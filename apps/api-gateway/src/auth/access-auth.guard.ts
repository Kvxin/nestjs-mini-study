/**
 * Access Token 守卫
 * 
 * 作用：验证请求是否携带有效的 JWT Access Token
 * 
 * 这是一个 Passport 守卫，用于保护需要认证的路由
 * 
 * @module apps/api-gateway/src/auth/access-auth.guard
 */

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * AccessAuthGuard - Access Token 守卫类
 * 
 * 继承 AuthGuard('jwt'):
 * - 使用 'jwt' 策略（见 jwt.strategy.ts）
 * - 自动验证请求中的 JWT token
 * 
 * 工作原理：
 * 1. 请求到达受保护的路由
 * 2. NestJS 调用 canActivate() 方法（AuthGuard 已实现）
 * 3. AuthGuard 提取 JWT token
 * 4. 调用 JwtStrategy.validate() 验证
 * 5. 验证成功：允许访问，payload 附加到 request.user
 * 6. 验证失败：返回 401 Unauthorized
 * 
 * 使用示例（见 apps/api-gateway/src/users/users.controller.ts）：
 * ```typescript
 * @Get('me')
 * @UseGuards(AccessAuthGuard)  // 添加守卫
 * @ApiOperation({ summary: 'Get current user profile' })
 * getMe(@CurrentUser() user: { sub: string }) {
 *   // 只有验证通过才能到达这里
 * }
 * ```
 */
@Injectable()
export class AccessAuthGuard extends AuthGuard('jwt') {}

/**
 * 为什么这么简单？
 * 
 * AuthGuard 已经实现了所有逻辑：
 * - canActivate(): 验证 token
 * - handleRequest(): 处理验证结果
 * 
 * 我们只需要：
 * - 继承 AuthGuard
 * - 指定策略名称（'jwt'）
 * - 添加 @Injectable() 装饰器
 * 
 * 进阶用法：
 * 如果需要自定义行为，可以重写方法：
 * 
 * ```typescript
 * @Injectable()
 * export class AccessAuthGuard extends AuthGuard('jwt') {
 *   canActivate(context: ExecutionContext) {
 *     // 自定义验证逻辑
 *     return super.canActivate(context);
 *   }
 * 
 *   handleRequest(err, user, info) {
 *     // 自定义错误处理
 *     if (err || !user) {
 *       throw err || new UnauthorizedException();
 *     }
 *     return user;
 *   }
 * }
 * ```
 */
