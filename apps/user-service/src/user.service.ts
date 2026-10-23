/**
 * 用户服务 - 核心业务逻辑
 * 
 * 作用：处理用户相关的所有业务逻辑
 * 包括：注册、登录、令牌刷新、登出、获取用户资料
 * 
 * 这个服务运行在独立的微服务进程中（端口 3001）
 * 通过 TCP 与 API Gateway 通信
 * 
 * @module apps/user-service/src/user.service
 */

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../libs/prisma/prisma.service';
import { JwtPayload } from '../../../libs/contracts/messages';
import { rpcError } from '../../../libs/common/rpc';
import { UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import ms, { StringValue } from 'ms';

/**
 * 认证载荷接口
 * 
 * 用于注册和登录时接收客户端传递的数据
 * 
 * 属性说明：
 * - email: 用户邮箱，用作唯一标识和登录凭证
 * - password: 明文密码，会被加密后存储
 * - deviceInfo: 设备信息（可选），用于标识登录设备
 */
interface AuthPayload {
  email: string;
  password: string;
  deviceInfo?: string;
}

/**
 * 用户服务类
 * 
 * @Injectable() 装饰器：
 * - 标记这个类可以被依赖注入
 * - NestJS 会自动创建实例并注入依赖
 * 
 * 依赖注入：
 * - PrismaService: 数据库操作
 * - JwtService: JWT 令牌生成和验证
 * - ConfigService: 读取环境变量配置
 */
@Injectable()
export class UserServiceService {
  /**
   * 构造函数注入依赖
   * 
   * NestJS 会自动创建这些服务实例并注入：
   * - prisma: 数据库客户端（见 libs/prisma/prisma.service.ts）
   * - jwtService: JWT 服务（来自 @nestjs/jwt）
   * - configService: 配置服务（来自 @nestjs/config）
   * 
   * private readonly 修饰：
   * - private: 私有属性，只能在类内部访问
   * - readonly: 只读属性，不能在类外部修改
   */
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
    @Inject(ConfigService)
    private readonly configService: ConfigService,
  ) {}

  // ============ 用户注册 ============

  /**
   * 用户注册
   * 
   * @param payload - 注册信息（邮箱、密码、设备信息）
   * @returns 包含访问令牌、刷新令牌和用户信息的对象
   * 
   * 调用链路：
   * 1. 用户请求：POST /api/auth/register
   * 2. API Gateway: apps/api-gateway/src/auth/auth.controller.ts:36
   * 3. TCP 传输 -> 用户服务控制器：apps/user-service/src/user.controller.ts:14
   * 4. 用户服务：这里的方法
   * 
   * 工作流程：
   * 1. 检查邮箱是否已存在
   * 2. 加密密码
   * 3. 创建用户记录
   * 4. 生成并返回令牌
   */
  async register(payload: AuthPayload) {
    /**
     * 检查邮箱是否已注册
     * 
     * Prisma 方法：findUnique
     * - 用于查询唯一记录（基于唯一索引）
     * - 这里按 email 查询（email 有 @unique 约束）
     * 
     * 为什么用 findUnique 而不是 findFirst：
     * - findUnique 利用唯一索引，查询更快
     * - 只能用于有唯一约束的字段
     */
    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    /**
     * 如果邮箱已存在，抛出冲突错误
     * 
     * rpcError: 创建 RPC 异常（见 libs/common/rpc.ts:23）
     * HttpStatus.CONFLICT: 409 状态码，表示资源冲突
     * 
     * 错误会沿着调用链返回：
     * 1. 用户服务抛出 RpcException
     * 2. API Gateway 捕获并转换为 HttpException（见 libs/common/rpc.ts:40）
     * 3. HttpExceptionFilter 统一处理（见 libs/common/http-exception.filter.ts）
     * 4. 客户端收到：{ success: false, message: 'Email already registered', ... }
     */
    if (existingUser) {
      throw rpcError('Email already registered', HttpStatus.CONFLICT);
    }

    /**
     * 密码加密
     * 
     * bcrypt.hash 参数：
     * - payload.password: 明文密码
     * - 10: salt rounds（盐值轮数），2^10=1024 次哈希运算
     * 
     * 安全说明：
     * - 数据库中只存储哈希值，不存储明文密码
     * - 即使数据库泄露，攻击者也无法直接获取密码
     */
    const passwordHash = await bcrypt.hash(payload.password, 10);
    
    /**
     * 创建用户记录
     * 
     * Prisma 方法：create
     * - 插入一条新记录到 User 表
     * 
     * 注意：
     * - 只存储 passwordHash，不存储明文密码
     * - role 和 status 使用默认值（USER 和 ACTIVE）
     * - createdAt 和 updatedAt 由 @default(now()) 和 @updatedAt 自动处理
     */
    const user = await this.prisma.user.create({
      data: {
        email: payload.email,
        passwordHash,
      },
    });

    /**
     * 构建认证响应
     * 
     * 返回包含：
     * - accessToken: 访问令牌（有效期 15 分钟）
     * - refreshToken: 刷新令牌（有效期 7 天）
     * - user: 用户基本信息
     * 
     * 为什么要返回两个令牌：
     * - accessToken: 用于 API 认证，有效期短，泄露风险小
     * - refreshToken: 用于刷新 accessToken，有效期长，存储在 httpOnly Cookie 中
     */
    return this.buildAuthResponse(user, payload.deviceInfo);
  }

  // ============ 用户登录 ============

  /**
   * 用户登录
   * 
   * @param payload - 登录凭证（邮箱、密码、设备信息）
   * @returns 包含访问令牌、刷新令牌和用户信息的对象
   * 
   * 调用链路：
   * 1. 用户请求：POST /api/auth/login
   * 2. API Gateway: apps/api-gateway/src/auth/auth.controller.ts:53
   * 3. TCP 传输 -> 用户服务控制器：apps/user-service/src/user.controller.ts:19
   * 4. 用户服务：这里的方法
   */
  async login(payload: AuthPayload) {
    /**
     * 按邮箱查找用户
     * 
     * 如果用户不存在，返回 401 未授权
     * 
     * 安全考虑：
     * - 错误消息统一为"邮箱或密码无效"
     * - 不明确提示"用户不存在"，防止枚举攻击
     */
    const user = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });

    if (!user) {
      throw rpcError('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }

    /**
     * 验证密码
     * 
     * bcrypt.compare 参数：
     * - payload.password: 用户输入的明文密码
     * - user.passwordHash: 数据库中存储的哈希值
     * 
     * 工作原理：
     * 1. 使用相同的盐值对输入密码进行哈希
     * 2. 比较两个哈希值是否相同
     * 3. 返回布尔值
     */
    const isPasswordValid = await bcrypt.compare(
      payload.password,
      user.passwordHash,
    );

    /**
     * 密码无效时，返回 401 错误
     * 
     * 错误消息与用户不存在时相同，防止攻击者判断哪些邮箱已注册
     */
    if (!isPasswordValid) {
      throw rpcError('Invalid email or password', HttpStatus.UNAUTHORIZED);
    }

    /**
     * 检查用户状态
     * 
     * 只有 ACTIVE 状态的用户可以登录
     * 
     * 使用场景：
     * - 违规用户可以被管理员禁用
     * - 禁用后立即无法登录，但未完成的订单仍可处理
     */
    if (user.status !== UserStatus.ACTIVE) {
      throw rpcError('User has been disabled', HttpStatus.FORBIDDEN);
    }

    /**
     * 登录成功，生成令牌
     * 
     * 与注册一样，返回双令牌
     */
    return this.buildAuthResponse(user, payload.deviceInfo);
  }

  // ============ 刷新令牌 ============

  /**
   * 刷新访问令牌
   * 
   * 作用：当 access token 过期时，使用 refresh token 获取新的 access token
   * 
   * @param payload - 包含 refresh token 和设备信息
   * @returns 新的令牌对和用户信息
   * 
   * 调用链路：
   * 1. 前端检测到 401 错误（token 过期）
   * 2. 自动调用：POST /api/auth/refresh
   * 3. API Gateway: apps/api-gateway/src/auth/auth.controller.ts:66
   * 4. TCP 传输 -> 用户服务控制器：apps/user-service/src/user.controller.ts:24
   * 5. 用户服务：这里的方法
   * 
   * 双令牌机制的优势：
   * - access token 有效期短（15 分钟），泄露影响小
   * - refresh token 有效期长（7 天），存储在 httpOnly Cookie 中，JS 无法访问
   * - 用户体验好，7 天内无需重新登录
   */
  async refreshToken(payload: { refreshToken: string; deviceInfo?: string }) {
    /**
     * 验证 refresh token 的有效性
     * 
     * verifyToken 方法会：
     * 1. 使用 JWT_REFRESH_SECRET 验证签名
     * 2. 检查是否过期
     * 3. 返回解码后的 payload（包含 userId）
     * 
     * 如果验证失败，会抛出 401 错误
     */
    const decoded = await this.verifyToken(payload.refreshToken, 'refresh');
    
    /**
     * 查询用户的所有未撤销的刷新令牌会话
     * 
     * Prisma 方法：findMany
     * - 查询多条记录
     * 
     * 查询条件：
     * - userId: 令牌中的用户 ID
     * - revokedAt: null - 未被撤销的会话
     * 
     * 排序：按创建时间倒序（最新的在前）
     * 
     * 为什么要查询所有会话：
     * - 用户可能在多个设备登录
     * - 需要找到当前 refresh token 对应的会话
     */
    const sessions = await this.prisma.refreshTokenSession.findMany({
      where: {
        userId: decoded.sub,  // decoded.sub = userId
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    /**
     * 查找匹配的会话
     * 
     * findMatchingSession 方法会：
     * 1. 遍历所有会话
     * 2. 使用 bcrypt.compare 比较 token 和 tokenHash
     * 3. 返回匹配的会话或 null
     * 
     * 为什么要比较而不是直接匹配：
     * - 数据库中存储的是哈希值
     * - 防止数据库泄露后直接暴露所有 refresh token
     */
    const matchedSession = await this.findMatchingSession(
      payload.refreshToken,
      sessions,
    );

    /**
     * 如果没有找到匹配的会话，返回 401 错误
     * 
     * 可能原因：
     * - token 是伪造的
     * - token 已被撤销（用户登出）
     * - token 来自已被删除的设备
     */
    if (!matchedSession) {
      throw rpcError('Refresh token is invalid or revoked', HttpStatus.UNAUTHORIZED);
    }

    /**
     * 检查令牌是否过期
     * 
     * 虽然 JWT 本身有过期时间，但数据库中也存储了 expiresAt
     * 双重验证确保安全
     */
    if (matchedSession.expiresAt.getTime() < Date.now()) {
      throw rpcError('Refresh token has expired', HttpStatus.UNAUTHORIZED);
    }

    /**
     * 撤销当前会话（一次性令牌机制）
     * 
     * 作用：刷新令牌使用一次后立即失效
     * 
     * 为什么要这样做：
     * 1. 防止刷新令牌被盗用
     * 2. 每次刷新都会生成新的刷新令牌
     * 3. 如果旧令牌还能用，说明可能被盗用了
     * 
     * 更新 revokedAt 字段标记为已撤销
     */
    await this.prisma.refreshTokenSession.update({
      where: { id: matchedSession.id },
      data: { revokedAt: new Date() },
    });

    /**
     * 获取用户信息
     * 
     * 用于构建新的认证响应
     */
    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) {
      throw rpcError('User not found', HttpStatus.NOT_FOUND);
    }

    /**
     * 生成新的令牌对
     * 
     * 注意：每次刷新都会：
     * 1. 生成新的 access token
     * 2. 生成新的 refresh token
     * 3. 创建新的会话记录
     * 4. 撤销旧的会话
     */
    return this.buildAuthResponse(user, payload.deviceInfo);
  }

  // ============ 用户登出 ============

  /**
   * 用户登出
   * 
   * 作用：撤销刷新令牌，使用户需要重新登录
   * 
   * @param payload - 包含 refresh token
   * @returns 成功消息
   * 
   * 调用链路：
   * 1. 用户点击登出
   * 2. 请求：POST /api/auth/logout
   * 3. API Gateway: apps/api-gateway/src/auth/auth.controller.ts:83
   * 4. TCP 传输 -> 用户服务控制器：apps/user-service/src/user.controller.ts:29
   * 5. 用户服务：这里的方法
   */
  async logout(payload: { refreshToken: string }) {
    /**
     * 查询所有未撤销的会话
     * 
     * 为什么不直接用 userId 查询：
     * - 因为此时还不知道 userId
     * - 需要先找到 token 对应的会话，才能获取 userId
     * 
     * 优化方案：
     * 可以先验证 token 获取 userId，然后只查询该用户的会话
     */
    const sessions = await this.prisma.refreshTokenSession.findMany({
      where: { revokedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    /**
     * 查找匹配的会话
     * 
     * 与 refreshToken 方法相同的逻辑
     */
    const matchedSession = await this.findMatchingSession(
      payload.refreshToken,
      sessions,
    );

    /**
     * 如果找到匹配的会话，撤销它
     * 
     * 注意：
     * - 即使没找到会话，也返回成功（防止泄露信息）
     * - 可能是 token 已过期或被撤销，用户已经登出
     */
    if (matchedSession) {
      await this.prisma.refreshTokenSession.update({
        where: { id: matchedSession.id },
        data: { revokedAt: new Date() },
      });
    }

    return { message: 'Logout successful' };
  }

  // ============ 获取用户资料 ============

  /**
   * 获取用户资料
   * 
   * @param payload - 包含 userId
   * @returns 用户基本信息（不包含敏感信息）
   * 
   * 调用链路：
   * 1. 请求：GET /api/users/me
   * 2. API Gateway: apps/api-gateway/src/users/users.controller.ts:22
   * 3. TCP 传输 -> 用户服务控制器：apps/user-service/src/user.controller.ts:34
   * 4. 用户服务：这里的方法
   */
  async getProfile(payload: { userId: string }) {
    /**
     * 查询用户信息
     * 
     * Prisma 方法：findUnique with select
     * 
     * select 参数：
     * - 只选择需要的字段
     * - 不返回 passwordHash 等敏感信息
     * - 减少数据传输量
     * 
     * 返回字段：
     * - id: 用户 ID
     * - email: 邮箱
     * - role: 角色（用于权限控制）
     * - status: 状态
     * - createdAt: 注册时间
     */
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    /**
     * 如果用户不存在，返回 404
     */
    if (!user) {
      throw rpcError('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  // ============ 私有辅助方法 ============

  /**
   * 构建认证响应
   * 
   * 作用：生成 JWT 令牌并保存到数据库
   * 
   * @param user - 用户对象（包含 id, email, role）
   * @param deviceInfo - 设备信息（可选）
   * @returns 包含双令牌和用户信息的对象
   * 
   * 工作流程：
   * 1. 构建 JWT payload
   * 2. 生成 access token（有效期 15 分钟）
   * 3. 生成 refresh token（有效期 7 天）
   * 4. 将 refresh token 哈希后存入数据库
   * 5. 返回令牌和用户信息
   */
  private async buildAuthResponse(
    user: { id: string; email: string; role: UserRole },
    deviceInfo?: string,
  ) {
    /**
     * 构建 JWT payload
     * 
     * JwtPayload 结构（见 libs/contracts/messages.ts:139）：
     * - sub: 用户 ID（JWT 标准字段，subject 的缩写）
     * - email: 用户邮箱
     * - role: 用户角色
     * 
     * 为什么把这些信息放入 token：
     * - 避免每次请求都查询数据库
     * - 令牌自包含用户信息，无状态认证
     */
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    /**
     * 从配置读取令牌有效期
     * 
     * 配置项（见 .env）：
     * - JWT_ACCESS_EXPIRES_IN=15m
     * - JWT_REFRESH_EXPIRES_IN=7d
     * 
     * ms 库支持的时间单位：
     * - s: 秒
     * - m: 分钟
     * - h: 小时
     * - d: 天
     * - w: 周
     */
    const accessExpiresIn = this.configService.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    ) as StringValue;
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    ) as StringValue;

    /**
     * 生成访问令牌
     * 
     * jwtService.signAsync 参数：
     * - payload: 要编码的数据
     * - secret: 签名密钥（只有服务端知道）
     * - expiresIn: 有效期
     * 
     * 访问令牌用途：
     * - 放在 Authorization 头：Bearer <token>
     * - 每次请求携带，用于身份验证
     */
    const accessToken = await this.jwtService.signAsync(payload as object, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresIn,
    });

    /**
     * 生成刷新令牌
     * 
     * 与 access token 类似，但：
     * - 使用不同的密钥（JWT_REFRESH_SECRET）
     * - 有效期更长
     * - 存储在 httpOnly Cookie 中，不暴露给前端 JS
     */
    const refreshToken = await this.jwtService.signAsync(payload as object, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresIn,
    });

    /**
     * 加密刷新令牌
     * 
     * 为什么要哈希：
     * - 数据库中不存储明文 token
     * - 防止数据库泄露后攻击者可以使用所有 token
     * 
     * 类似密码存储机制
     */
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    
    /**
     * 计算过期时间
     * 
     * ms(refreshExpiresIn) 将 '7d' 转换为毫秒数
     * Date.now() + 毫秒数 = 过期时间戳
     */
    const expiresAt = new Date(Date.now() + ms(refreshExpiresIn));

    /**
     * 保存刷新令牌会话到数据库
     * 
     * 作用：
     * 1. 记录令牌信息，用于后续验证
     * 2. 支持多设备登录（每个设备一个会话）
     * 3. 支持撤销令牌（登出时）
     */
    await this.prisma.refreshTokenSession.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        deviceInfo,
        expiresAt,
      },
    });

    /**
     * 返回认证响应
     * 
     * 前端收到后：
     * - accessToken: 保存在内存中，每次请求时放入 Authorization 头
     * - refreshToken: 由后端写入 httpOnly Cookie（见 apps/api-gateway/src/auth/auth.controller.ts:92）
     * - user: 保存在前端状态管理（如 Vuex、Redux）中
     */
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * 验证令牌
   * 
   * 作用：验证 JWT 令牌的有效性和签名
   * 
   * @param token - JWT 令牌字符串
   * @param type - 令牌类型（'access' 或 'refresh'）
   * @returns 解码后的 payload
   * 
   * 使用位置：
   * - refreshToken 方法：验证 refresh token
   * 
   * 验证内容：
   * 1. 签名是否正确（使用对应的密钥）
   * 2. 是否过期
   * 3. 格式是否正确
   */
  private async verifyToken(token: string, type: 'access' | 'refresh') {
    try {
      /**
       * jwtService.verifyAsync 验证令牌
       * 
       * 参数：
       * - token: 要验证的 JWT
       * - secret: 签名密钥
       *   - access token 使用 JWT_ACCESS_SECRET
       *   - refresh token 使用 JWT_REFRESH_SECRET
       * 
       * 为什么用不同的密钥：
       * - 增加安全性
       * - 即使一个密钥泄露，另一个仍然安全
       * - 可以独立轮换密钥
       */
      return await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret:
          type === 'access'
            ? this.configService.getOrThrow<string>('JWT_ACCESS_SECRET')
            : this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      /**
       * 验证失败，抛出 401 错误
       * 
       * 可能原因：
       * - token 已过期
       * - token 签名不正确
       * - token 格式错误
       * - token 被篡改
       */
      throw rpcError(`${type} token is invalid`, HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * 查找匹配的刷新令牌会话
   * 
   * 作用：通过比较 token 和哈希值，找到对应的会话
   * 
   * @param refreshToken - 刷新令牌（明文）
   * @param sessions - 会话数组（包含 tokenHash）
   * @returns 匹配的会话或 null
   * 
   * 为什么要遍历比较：
   * - 数据库中存储的是哈希值
       * - 无法直接用 SQL 查询匹配
     * - 需要逐个比较
   */
  private async findMatchingSession(
    refreshToken: string,
    sessions: Array<{ id: string; tokenHash: string; expiresAt: Date }>,
  ) {
    /**
     * 遍历所有会话
     * 
     * 使用 for...of 而不是 forEach：
     * - 因为 bcrypt.compare 是异步的
     * - for...of 可以配合 await 使用
     * - 找到匹配项后可以立即 return，停止遍历
     */
    for (const session of sessions) {
      /**
       * 比较 token 和哈希值
       * 
       * bcrypt.compare 工作原理：
       * 1. 从 tokenHash 中提取盐值
       * 2. 使用相同盐值对 refreshToken 进行哈希
       * 3. 比较两个哈希值
       */
      const isMatch = await bcrypt.compare(refreshToken, session.tokenHash);
      
      /**
       * 如果匹配，返回该会话
       * 
       * 立即返回，不再检查其他会话
       */
      if (isMatch) {
        return session;
      }
    }

    /**
     * 遍历完所有会话都没有匹配，返回 null
     */
    return null;
  }
}
