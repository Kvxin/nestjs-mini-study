/**
 * JWT 策略
 * 
 * 作用：定义如何验证 JWT 令牌
 * 
 * 这是 Passport-JWT 策略的实现
 * 当请求携带 Bearer Token 时，这个策略会被触发
 * 
 * @module apps/api-gateway/src/auth/jwt.strategy
 */

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../../libs/contracts/messages';

/**
 * JwtStrategy - JWT 认证策略类
 * 
 * 继承关系：
 * - PassportStrategy(Strategy): NestJS 对 Passport 的封装
 * - Strategy: passport-jwt 的原始策略类
 * 
 * 工作原理：
 * 1. 请求到达时，AccessAuthGuard 触发
 * 2. AuthGuard('jwt') 使用 JwtStrategy 验证 token
 * 3. 验证成功后，payload 附加到 request.user
 * 4. 控制器可以通过 @CurrentUser() 获取用户信息
 * 
 * 使用位置：
 * - 注册在 ApiGatewayAppModule（见 apps/api-gateway/src/app.module.ts:35）
 * - AccessAuthGuard 使用这个策略（见 apps/api-gateway/src/auth/access-auth.guard.ts）
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * 构造函数
   * 
   * @Inject(ConfigService):
   * - 注入配置服务
   * - 用于读取 JWT 密钥配置
   * 
   * super():
   * - 调用父类（PassportStrategy）构造函数
   * - 传入 JWT 策略配置
   */
  constructor(@Inject(ConfigService) configService: ConfigService) {
    super({
      /**
       * jwtFromRequest - JWT 提取方式
       * 
       * ExtractJwt.fromAuthHeaderAsBearerToken():
       * - 从 Authorization 头提取 JWT
       * - 格式：Authorization: Bearer <token>
       * 
       * 其他提取方式：
       * - ExtractJwt.fromExtractors([(req) => req.body.token]) - 从请求体
       * - ExtractJwt.fromUrlQueryParameter('token') - 从 URL 参数
       */
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      
      /**
       * ignoreExpiration - 是否忽略过期检查
       * 
       * false:
       * - 验证 token 是否过期
       * - 过期的 token 会被拒绝
       * 
       * 什么时候设为 true：
       * - 自己想实现自定义过期逻辑
       * - 一般不需要，保持 false 即可
       */
      ignoreExpiration: false,
      
      /**
       * secretOrKey - 签名密钥
       * 
       * 作用：验证 JWT 签名
       * 
       * 工作流程：
       * 1. 用户服务生成 token 时使用 JWT_ACCESS_SECRET 签名
       * 2. API Gateway 验证 token 时使用相同的密钥
       * 3. 如果签名不匹配，验证失败
       * 
       * 为什么用 getOrThrow：
       * - 如果配置不存在，立即抛出错误
       * - 启动时发现问题，而不是运行时
       */
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  /**
   * validate - 验证方法
   * 
   * 作用：验证通过后的回调
   * 
   * 执行时机：
   * 1. JWT 签名验证通过
   * 2. token 未过期
   * 3. 调用这个方法
   * 
   * 参数 payload:
   * - 解码后的 JWT payload
   * - 包含：sub (userId), email, role
   * 
   * 返回值：
   * - 返回的对象会附加到 request.user
   * - 守卫和控制器可以访问
   * 
   * 为什么直接返回 payload：
   * - payload 已经包含需要的用户信息
   * - 不需要额外处理
   * 
   * 进阶用法：
   * - 可以在这里查询数据库获取最新用户信息
   * - 可以添加额外的权限检查
   */
  validate(payload: JwtPayload) {
    return payload;
  }
}
