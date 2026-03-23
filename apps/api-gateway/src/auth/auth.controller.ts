/**
 * 认证控制器
 * 
 * 作用：处理所有认证相关的 HTTP 请求
 * 包括：注册、登录、刷新令牌、登出
 * 
 * 路由前缀：/api/auth（全局前缀/api + 控制器前缀 auth）
 * 
 * @module apps/api-gateway/src/auth/auth.controller
 */

import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ClientProxy } from '@nestjs/microservices';
import { Request, Response } from 'express';
import { requestFromClient } from '../../../../libs/common/rpc';
import { REFRESH_TOKEN_COOKIE } from '../../../../libs/common/tokens';
import {
  CLIENT_TOKENS,
  USER_PATTERNS,
} from '../../../../libs/contracts/messages';
import {
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
} from './auth.dto';
import { AccessAuthGuard } from './access-auth.guard';
import { UseGuards } from '@nestjs/common';

/**
 * ApiTags - Swagger 标签
 * 
 * 作用：在 Swagger 文档中将这个控制器的所有接口归类到 "Auth" 标签下
 * 
 * 效果：
 * - Swagger 界面左侧会显示 "Auth" 分类
 * - 所有认证相关的接口都在这个分类下
 */
@ApiTags('Auth')

/**
 * Controller - 控制器装饰器
 * 
 * 参数 'auth':
 * - 路由前缀
 * - 所有端点都以 /auth 开头
 * 
 * 完整路由示例：
 * - POST /api/auth/register
 * - POST /api/auth/login
 * - POST /api/auth/refresh
 * - POST /api/auth/logout
 */
@Controller('auth')
export class AuthController {
  /**
   * 构造函数注入依赖
   * 
   * @Inject(CLIENT_TOKENS.USER_SERVICE):
   * - 注入用户服务客户端
   * - 通过 TCP 与用户服务通信
   * 
   * userClient:
   * - ClientProxy 实例
   * - 用于发送消息到用户服务
   * - 使用 send() 方法发起 RPC 调用
   */
  constructor(
    @Inject(CLIENT_TOKENS.USER_SERVICE)
    private readonly userClient: ClientProxy,
  ) {}

  // ============ 用户注册 ============

  /**
   * 用户注册接口
   * 
   * HTTP: POST /api/auth/register
   * 
   * 请求体：
   * ```json
   * {
   *   "email": "user@example.com",
   *   "password": "password123",
   *   "deviceInfo": "Chrome on Windows"  // 可选
   * }
   * ```
   * 
   * 响应：
   * ```json
   * {
   *   "success": true,
   *   "data": {
   *     "accessToken": "eyJhbGc...",
   *     "refreshToken": "eyJhbGc...",
   *     "user": { "id": "...", "email": "...", "role": "USER" }
   *   },
   *   "timestamp": "..."
   * }
   * ```
   */
  @Post('register')
  @ApiOperation({ summary: 'Register user and issue access/refresh tokens' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    /**
     * 发送注册请求到用户服务
     * 
     * userClient.send():
     * - 发送 TCP 消息到用户服务
     * - USER_PATTERNS.REGISTER = 'user.register'（消息模式）
     * - dto: 请求体数据
     * 
     * requestFromClient():
     * - 封装微服务调用
     * - 将 RPC 异常转换为 HTTP 异常
     */
    const result = await requestFromClient(
      this.userClient.send(USER_PATTERNS.REGISTER, dto),
    );
    
    /**
     * 设置 Refresh Token Cookie
     * 
     * 将 refresh token 写入 httpOnly cookie
     * 前端无法通过 JS 访问，更安全
     */
    this.setRefreshTokenCookie(res, result.refreshToken);
    
    /**
     * 返回结果
     * 
     * 包含：
     * - accessToken: 访问令牌（前端保存在内存中）
     * - refreshToken: 刷新令牌（已写入 Cookie）
     * - user: 用户信息
     */
    return result;
  }

  // ============ 用户登录 ============

  /**
   * 用户登录接口
   * 
   * HTTP: POST /api/auth/login
   * 
   * @HttpCode(200):
   * - 强制设置响应状态码为 200
   * - 默认 POST 是 201，但登录成功通常返回 200
   */
  @HttpCode(200)
  @Post('login')
  @ApiOperation({ summary: 'Login and issue access/refresh tokens' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    /**
     * 登录逻辑与注册类似
     * 
     * 调用用户服务的登录方法
     * 验证邮箱和密码
     */
    const result = await requestFromClient(
      this.userClient.send(USER_PATTERNS.LOGIN, dto),
    );
    
    /**
     * 设置 Refresh Token Cookie
     * 
     * 登录成功后，将 refresh token 写入 Cookie
     */
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  // ============ 刷新令牌 ============

  /**
   * 刷新访问令牌接口
   * 
   * HTTP: POST /api/auth/refresh
   * 
   * 作用：当 access token 过期时，使用 refresh token 获取新的 access token
   * 
   * 请求方式（两种都可以）：
   * 1. Body: { "refreshToken": "..." }
   * 2. Cookie: 自动从 httpOnly cookie 读取
   * 
   * @ApiCookieAuth(REFRESH_TOKEN_COOKIE):
   * - Swagger 文档中标记这个接口使用 Cookie 认证
   * - 用户可以在 Swagger 界面测试 Cookie 认证
   */
  @HttpCode(200)
  @Post('refresh')
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiOperation({ summary: 'Refresh access token with refresh token or cookie' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    /**
     * 获取 refresh token
     * 
     * 优先级：
     * 1. 请求体中的 refreshToken
     * 2. Cookie 中的 refreshToken（?? 空值合并运算符）
     * 
     * 为什么支持两种方式：
     * - Cookie: 浏览器自动发送，方便
     * - Body: 方便 API 测试工具（如 Postman、Swagger）
     */
    const refreshToken = dto.refreshToken ?? req.cookies?.[REFRESH_TOKEN_COOKIE];
    
    /**
     * 调用用户服务的刷新令牌方法
     * 
     * 用户服务会：
     * 1. 验证 refresh token
     * 2. 撤销旧的 token
     * 3. 生成新的 token 对
     */
    const result = await requestFromClient(
      this.userClient.send(USER_PATTERNS.REFRESH_TOKEN, {
        refreshToken,
        deviceInfo: dto.deviceInfo,
      }),
    );
    
    /**
     * 设置新的 Refresh Token Cookie
     * 
     * 每次刷新都会获得新的 refresh token
     */
    this.setRefreshTokenCookie(res, result.refreshToken);
    return result;
  }

  // ============ 用户登出 ============

  /**
   * 用户登出接口
   * 
   * HTTP: POST /api/auth/logout
   * 
   * 认证要求：
   * - 需要有效的 access token（@ApiBearerAuth()）
   * - 需要有效的 refresh token（在 Cookie 或 Body 中）
   * 
   * @ApiBearerAuth(): Swagger 文档中标记使用 Bearer Token 认证
   * @UseGuards(AccessAuthGuard): 使用 JWT 守卫验证 access token
   */
  @HttpCode(200)
  @Post('logout')
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke current refresh token session' })
  @UseGuards(AccessAuthGuard)
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    /**
     * 获取 refresh token
     * 
     * 与 refresh 接口相同的逻辑
     */
    const refreshToken = dto.refreshToken ?? req.cookies?.[REFRESH_TOKEN_COOKIE];
    
    /**
     * 调用用户服务的登出方法
     * 
     * 用户服务会：
     * 1. 查找 refresh token 对应的会话
     * 2. 撤销会话（设置 revokedAt）
     * 3. 返回成功消息
     */
    const result = await requestFromClient(
      this.userClient.send(USER_PATTERNS.LOGOUT, {
        refreshToken,
      }),
    );
    
    /**
     * 清除 Cookie
     * 
     * res.clearCookie():
     * - 删除客户端的 refresh token cookie
     * - 确保下次请求不再携带这个 cookie
     */
    res.clearCookie(REFRESH_TOKEN_COOKIE);
    return result;
  }

  // ============ 私有辅助方法 ============

  /**
   * 设置 Refresh Token Cookie
   * 
   * 作用：将 refresh token 写入 httpOnly cookie
   * 
   * @param res - Express Response 对象
   * @param refreshToken - 刷新令牌字符串
   * 
   * Cookie 配置说明：
   * 
   * httpOnly: true
   * - JavaScript 无法访问（document.cookie 看不到）
   * - 防止 XSS 攻击窃取 token
   * 
   * sameSite: 'lax'
   * - 防止 CSRF 攻击
   * - 允许同站请求和导航请求携带 cookie
   * - 阻止跨站 POST 请求携带 cookie
   * 
   * secure: false
   * - 是否仅通过 HTTPS 传输
   * - 开发环境设为 false（允许 HTTP）
   * - 生产环境应该设为 true
   * 
   * maxAge: 7 * 24 * 60 * 60 * 1000
   * - 有效期 7 天（毫秒）
   * - 与 JWT 的 expiresIn 一致
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
