/**
 * HTTP 应用默认配置
 * 
 * 这个文件定义了 API Gateway 层使用的通用 HTTP 中间件和全局配置
 * 所有 HTTP 请求都会经过这里配置的中间件处理
 * 
 * @module libs/common/http
 */

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { HttpExceptionFilter } from './http-exception.filter';
import { LoggingInterceptor } from './logging.interceptor';
import { ResponseInterceptor } from './response.interceptor';

/**
 * 应用 HTTP 应用默认配置
 * 
 * 这个函数会在 API Gateway 启动时被调用（见 apps/api-gateway/src/main.ts:17）
 * 用于配置全局的中间件、管道、过滤器和拦截器
 * 
 * @param app - NestJS Express 应用实例
 * @param configService - 配置服务，用于读取 .env 文件中的配置
 * 
 * @see apps/api-gateway/src/main.ts - 在 bootstrap 函数中调用此函数
 */
export function applyHttpAppDefaults(
  app: NestExpressApplication,
  configService: ConfigService,
) {
  // ============ 安全中间件 ============
  
  /**
   * Helmet - HTTP 安全头中间件
   * 
   * 作用：自动设置各种 HTTP 响应头来增强安全性
   * - Content-Security-Policy: 防止 XSS 攻击
   * - X-Content-Type-Options: 防止 MIME 类型嗅探
   * - X-Frame-Options: 防止点击劫持
   * - Strict-Transport-Security: 强制 HTTPS
   * 
   * 为什么放在最前面：安全头需要在所有响应中生效，所以最先注册
   */
  app.use(helmet());
  
  /**
   * Compression - 响应压缩中间件
   * 
   * 作用：对 HTTP 响应体进行 gzip 压缩，减少传输数据量
   * 适用场景：适合文本类响应（JSON、HTML），不适合已压缩的文件（图片、视频）
   * 
   * 性能影响：会消耗 CPU 资源，但能显著减少网络传输时间
   */
  app.use(compression());
  
  /**
   * Cookie Parser - Cookie 解析中间件
   * 
   * 作用：解析 HTTP 请求头中的 Cookie，将其转换为 req.cookies 对象
   * 使用场景：本项目用于读取 refreshToken（见 apps/api-gateway/src/auth/auth.controller.ts:72）
   * 
   * 示例：请求头 Cookie: refreshToken=abc123 -> req.cookies.refreshToken = 'abc123'
   */
  app.use(cookieParser());
  
  /**
   * CORS - 跨域资源共享配置
   * 
   * 作用：允许前端应用从不同域名访问 API
   * 
   * 配置说明：
   * - origin: 允许的源地址，默认 http://localhost:3000（来自 .env 的 CLIENT_ORIGIN）
   * - credentials: true - 允许携带凭证（Cookie、Authorization 头）
   * 
   * 为什么需要：浏览器同源策略会阻止跨域请求，必须显式配置 CORS
   */
  app.enableCors({
    origin: configService.get<string>('CLIENT_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });
  
  // ============ 全局管道 ============
  
  /**
   * ValidationPipe - 全局验证管道
   * 
   * 作用：自动验证请求 DTO（数据传输对象）的合法性
   * 工作原理：结合 class-validator 装饰器进行参数验证
   * 
   * 配置说明：
   * - whitelist: true - 自动剥离未在 DTO 中定义的属性（防止属性注入攻击）
   * - transform: true - 自动将请求参数转换为 DTO 类型（如字符串转数字）
   * - forbidNonWhitelisted: true - 如果存在未定义的属性，直接抛出错误
   * 
   * 使用示例：见 apps/api-gateway/src/auth/auth.dto.ts - 定义了各种 DTO 验证规则
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  
  // ============ 全局异常过滤器 ============
  
  /**
   * HttpExceptionFilter - 全局 HTTP 异常过滤器
   * 
   * 作用：统一处理所有 HTTP 异常，返回标准化的错误响应格式
   * 使用位置：注册为全局过滤器，捕获所有未处理的异常
   * 
   * 响应格式：
   * {
   *   success: false,
   *   message: '错误信息',
   *   timestamp: '2024-01-01T00:00:00.000Z'
   * }
   * 
   * @see libs/common/http-exception.filter.ts - 过滤器实现
   */
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // ============ 全局拦截器 ============
  
  /**
   * LoggingInterceptor - 日志拦截器
   * 
   * 作用：记录每个 HTTP 请求的方法和耗时
   * 输出示例：GET /api/products 125ms
   * 
   * @see libs/common/logging.interceptor.ts - 拦截器实现
   */
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    
    /**
     * ResponseInterceptor - 响应拦截器
     * 
     * 作用：统一封装成功响应的格式
     * 
     * 原始返回：{ data: [...] }
     * 封装后：{ success: true, data: [...], timestamp: '...' }
     * 
     * @see libs/common/response.interceptor.ts - 拦截器实现
     */
    new ResponseInterceptor(),
  );
}
