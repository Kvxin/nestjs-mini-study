/**
 * 用户控制器
 * 
 * 作用：处理用户相关的 HTTP 请求
 * 
 * 路由前缀：/api/users
 * 
 * 这个控制器比较简单，只有一个获取当前用户资料的接口
 * 用户服务负责实际的业务逻辑
 * 
 * @module apps/api-gateway/src/users/users.controller
 */

import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { requestFromClient } from '../../../../libs/common/rpc';
import {
  CLIENT_TOKENS,
  USER_PATTERNS,
} from '../../../../libs/contracts/messages';
import { AccessAuthGuard } from '../auth/access-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

/**
 * ApiTags - Swagger 标签
 * 
 * 作用：在 Swagger 文档中将接口归类到 "Users" 标签下
 */
@ApiTags('Users')

/**
 * ApiBearerAuth - Swagger 认证标记
 * 
 * 作用：在 Swagger 文档中标记这个控制器的所有接口需要 Bearer Token 认证
 * 
 * 效果：
 * - Swagger 界面显示锁图标
 * - 点击后可以输入 JWT token
 */
@ApiBearerAuth()

/**
 * Controller - 控制器装饰器
 * 
 * 参数 'users':
 * - 路由前缀
 * - 所有端点都以 /users 开头
 * 
 * 完整路由：
 * - GET /api/users/me - 获取当前用户资料
 */
@Controller('users')
export class UsersController {
  /**
   * 构造函数注入依赖
   * 
   * @Inject(CLIENT_TOKENS.USER_SERVICE):
   * - 注入用户服务客户端
   * - 通过 TCP 与用户服务通信
   */
  constructor(
    @Inject(CLIENT_TOKENS.USER_SERVICE)
    private readonly userClient: ClientProxy,
  ) {}

  // ============ 获取当前用户资料 ============

  /**
   * 获取当前用户资料接口
   * 
   * HTTP: GET /api/users/me
   * 
   * 认证要求：
   * - 需要有效的 JWT Access Token
   * - @UseGuards(AccessAuthGuard) 验证 token
   * 
   * 请求头：
   * ```
   * Authorization: Bearer <access_token>
   * ```
   * 
   * 响应示例：
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "id": "clx1234567890",
   *     "email": "user@example.com",
   *     "role": "USER",
   *     "status": "ACTIVE",
   *     "createdAt": "2024-01-01T00:00:00.000Z"
   *   },
   *   "timestamp": "..."
   * }
   * ```
   */
  @Get('me')
  @UseGuards(AccessAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: { sub: string }) {
    /**
     * @CurrentUser() 装饰器
     * 
     * 作用：获取当前登录用户的信息
     * 
     * 工作原理：
     * 1. AccessAuthGuard 验证 JWT token
     * 2. JwtStrategy 提取 payload
     * 3. payload 附加到 request.user
     * 4. CurrentUser 装饰器返回 request.user
     * 
     * user 对象包含：
     * - sub: 用户 ID（JWT 标准字段）
     * - email: 用户邮箱
     * - role: 用户角色
     * 
     * 这里只用了 sub（用户 ID）
     */
    
    /**
     * 发送请求到用户服务
     * 
     * userClient.send():
     * - 发送 TCP 消息到用户服务
     * - USER_PATTERNS.GET_PROFILE = 'user.get-profile'（消息模式）
     * - payload: { userId: user.sub }
     * 
     * requestFromClient():
     * - 封装微服务调用
     * - 将 RPC 异常转换为 HTTP 异常
     * - 返回用户服务响应
     */
    return requestFromClient(
      this.userClient.send(USER_PATTERNS.GET_PROFILE, {
        userId: user.sub,
      }),
    );
  }
}
