/**
 * HTTP 异常过滤器
 * 
 * 作用：捕获并统一处理所有 HTTP 异常，返回标准化的错误响应格式
 * 
 * 在 NestJS 中，异常过滤器（Exception Filter）是处理异常的第一道防线
 * 所有未捕获的异常都会经过这里
 * 
 * @module libs/common/http-exception.filter
 */

import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * @Catch() - 装饰器，声明这个过滤器捕获的异常类型
 * 
 * 不带参数的 @Catch() 表示捕获所有类型的异常
 * 相当于全局异常处理器
 * 
 * 如果只想捕获特定异常，可以这样写：
 * @Catch(HttpException) - 只捕获 HTTP 异常
 * @Catch(TypeError, ReferenceError) - 捕获多种特定异常
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  /**
   * catch 方法 - 异常处理核心逻辑
   * 
   * 当任何异常抛出且未被捕获时，这个方法会被调用
   * 
   * @param exception - 抛出的异常对象
   * @param host - 参数主机（ArgumentsHost），提供访问请求和响应的能力
   * 
   * 调用时机：
   * 1. 控制器方法抛出异常
   * 2. 拦截器中抛出异常
   * 3. 管道（Pipe）验证失败抛出异常
   * 4. 守卫（Guard）抛出异常
   */
  catch(exception: unknown, host: ArgumentsHost) {
    /**
     * 获取 HTTP 上下文
     * 
     * ArgumentsHost 是 NestJS 的统一抽象，支持 HTTP、RPC、WebSocket
     * switchToHttp() 切换到 HTTP 特定的上下文
     * 
     * 为什么需要这样：
     * - NestJS 是跨传输层的框架
     * - 同一套代码可以处理 HTTP、微服务、WebSocket 请求
     * - 需要明确指定当前处理的上下文类型
     */
    const ctx = host.switchToHttp();
    
    /**
     * 获取 HTTP 响应对象
     * 
     * 类型注解<Response>：TypeScript 类型断言，告诉编译器这是 Express 的 Response
     * 
     * 用途：后面需要用 response.status() 和 response.json() 方法
     */
    const response = ctx.getResponse<Response>();

    /**
     * 确定 HTTP 状态码
     * 
     * 判断逻辑：
     * 1. 如果是 HttpException 类型，使用其状态码
     * 2. 否则，默认返回 500 内部服务器错误
     * 
     * 为什么这样处理：
     * - HttpException 是 NestJS 的标准 HTTP 异常，包含明确的状态码
     * - 其他未知异常（如 TypeError）默认视为服务器内部错误
     */
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    /**
     * 获取异常响应体
     * 
     * HttpException 可以携带响应体，可能是：
     * 1. 字符串：new HttpException('错误消息', 400)
     * 2. 对象：new HttpException({ message: '错误', code: 'E001' }, 400)
     * 
     * 对于非 HttpException，使用默认错误消息
     */
    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    /**
     * 提取错误消息
     * 
     * 处理三种可能的情况：
     * 
     * 情况 1：响应是字符串
     * ```typescript
     * exceptionResponse = 'Email already registered'
     * message = 'Email already registered'
     * ```
     * 
     * 情况 2：响应是对象，有 message 属性
     * ```typescript
     * exceptionResponse = { message: 'Invalid input', errors: [...] }
     * message = 'Invalid input'
     * ```
     * 
     * 情况 3：响应是对象，但没有 message 属性
     * ```typescript
     * exceptionResponse = { errors: [...] }
     * message = 'Internal server error' (默认值)
     * ```
     */
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as { message?: string | string[] }).message ??
          'Internal server error';

    /**
     * 发送统一的错误响应
     * 
     * 响应格式与成功响应保持一致（见 ResponseInterceptor）：
     * 
     * 成功响应（ResponseInterceptor）：
     * ```json
     * {
     *   "success": true,
     *   "data": { ... },
     *   "timestamp": "2024-01-01T12:00:00.000Z"
     * }
     * ```
     * 
     * 错误响应（这里）：
     * ```json
     * {
     *   "success": false,
     *   "message": "错误消息",
     *   "timestamp": "2024-01-01T12:00:00.000Z"
     * }
     * ```
     * 
     * 统一格式的好处：
     * 1. 前端可以统一处理成功和失败情况
     * 2. 通过 success 字段快速判断结果
     * 3. timestamp 便于日志追踪和问题排查
     */
    response.status(status).json({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
