/**
 * 日志拦截器
 * 
 * 作用：记录每个 HTTP 请求的方法和耗时
 * 用于性能监控和调试
 * 
 * @module libs/common/logging.interceptor
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

/**
 * LoggingInterceptor - 日志拦截器类
 * 
 * 实现 NestInterceptor 接口，在每个 HTTP 请求执行时记录日志
 * 
 * 使用位置：注册为全局拦截器（见 libs/common/http.ts:77）
 * 
 * 日志输出示例：
 * ```
 * [Nest] 12345  - 01/01/2024, 12:00:00 PM   LOG [LoggingInterceptor] GET /api/products 125ms
 * [Nest] 12345  - 01/01/2024, 12:00:01 PM   LOG [LoggingInterceptor] POST /api/orders 350ms
 * ```
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  /**
   * Logger - NestJS 日志服务实例
   * 
   * 作用：输出格式化的日志到控制台
   * 
   * Logger.name 参数：日志中显示的上下文名称
   * 输出效果：[LoggingInterceptor] 前缀
   */
  private readonly logger = new Logger(LoggingInterceptor.name);

  /**
   * 拦截方法
   * 
   * @param context - 执行上下文，可以获取请求、响应等信息
   * @param next - 调用处理器，执行下一个拦截器或控制器方法
   * @returns Observable - 响应流
   * 
   * 执行流程：
   * 1. 记录请求开始时间
   * 2. 执行控制器方法（next.handle()）
   * 3. 响应返回后，tap 回调被触发
   * 4. 计算耗时并输出日志
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    /**
     * 获取 HTTP 上下文
     * 
     * ExecutionContext 是 NestJS 提供的统一上下文接口
     * 可以用于 HTTP、RPC、WebSocket 等不同场景
     * 
     * switchToHttp() - 切换到 HTTP 上下文
     * 获取 HTTP 特有的对象：request、response
     */
    const http = context.switchToHttp();
    
    /**
     * 获取 HTTP 请求对象
     * 
     * 类型说明：
     * - Request & { method?: string; url?: string } 
     *   表示 Express 的 Request 类型，并扩展了 method 和 url 属性
     * 
     * 为什么需要类型断言：
     * - NestJS 的 getRequest() 返回基础 Request 类型
     * - 但实际运行时有 method 和 url 属性
     */
    const request = http.getRequest<Request & { method?: string; url?: string }>();
    
    /**
     * 记录请求开始时间戳
     * 
     * 使用 Date.now() 获取毫秒级时间戳
     * 用于计算请求处理耗时
     * 
     * 示例：1704067200000 (2024-01-01 00:00:00 UTC)
     */
    const startedAt = Date.now();

    /**
     * 执行控制器方法并添加日志回调
     * 
     * next.handle() - 执行后续的拦截器链和控制器方法
     * .pipe() - RxJS 操作符管道，用于处理 Observable 流
     * .tap() - 副作用操作符，在流发出值时执行回调，但不修改值
     * 
     * 为什么用 tap 而不是 map：
     * - tap: 只记录日志，不改变响应数据
     * - map: 会转换响应数据（由 ResponseInterceptor 负责）
     */
    return next.handle().pipe(
      tap(() => {
        /**
         * 检查请求对象是否存在
         * 
         * 防御性编程：
         * - 确保不是在 WebSocket 或 RPC 上下文中调用
         * - 防止访问 undefined 属性导致错误
         */
        if (request?.method && request?.url) {
          /**
           * 输出访问日志
           * 
           * 日志格式：{METHOD} {URL} {耗时}ms
           * 
           * 示例：
           * - GET /api/products 125ms
           * - POST /api/orders 350ms
           * - GET /api/users/me 45ms
           * 
           * 日志用途：
           * 1. 性能监控：发现慢请求
           * 2. 访问统计：了解哪些接口常用
           * 3. 问题排查：定位特定请求的处理时间
           */
          this.logger.log(
            `${request.method} ${request.url} ${Date.now() - startedAt}ms`,
          );
        }
      }),
    );
  }
}
