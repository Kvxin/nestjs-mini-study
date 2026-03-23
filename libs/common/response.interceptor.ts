/**
 * 统一响应拦截器
 * 
 * 作用：拦截所有 HTTP 响应，统一封装成功响应的数据格式
 * 
 * 这个拦截器会在每个 HTTP 请求处理后执行
 * 将原始响应数据包装成统一的格式
 * 
 * @module libs/common/response.interceptor
 */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * ResponseInterceptor - 响应拦截器类
 * 
 * 实现 NestInterceptor 接口，这是 NestJS 拦截器的标准接口
 * 
 * 拦截器工作流程：
 * 1. 请求到达控制器方法
 * 2. 控制器方法执行并返回数据
 * 3. 拦截器的 intercept 方法被调用
 * 4. 对返回数据进行转换
 * 5. 返回转换后的数据给客户端
 * 
 * 使用位置：注册为全局拦截器（见 libs/common/http.ts:78）
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  /**
   * 拦截方法
   * 
   * @param _context - 执行上下文，包含请求和响应信息
   *                   下划线前缀表示这个参数未使用，但保留用于未来扩展
   * @param next - 调用处理器，用于执行下一个拦截器或控制器方法
   * @returns Observable<unknown> - 转换后的响应流
   * 
   * 执行时机：在控制器方法执行之后
   */
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<unknown> {
    /**
     * next.handle() - 执行控制器方法
     * 
     * 返回一个 Observable 流，包含控制器方法的返回值
     * 
     * 例如：
     * - 控制器返回：{ users: [...] }
     * - next.handle() 发出的值：{ users: [...] }
     */
    return next.handle().pipe(
      /**
       * map 操作符 - 转换响应数据
       * 
       * 作用：将控制器返回的数据包装成统一格式
       * 
       * 转换前（控制器原始返回）：
       * ```json
       * { "id": 1, "email": "test@example.com" }
       * ```
       * 
       * 转换后（统一格式）：
       * ```json
       * {
       *   "success": true,
       *   "data": { "id": 1, "email": "test@example.com" },
       *   "timestamp": "2024-01-01T12:00:00.000Z"
       * }
       * ```
       * 
       * 统一响应格式的好处：
       * 1. 前端可以统一处理响应，不用判断不同接口的返回格式
       * 2. 添加 success 字段，方便判断请求是否成功
       * 3. 添加 timestamp 字段，便于调试和日志记录
       */
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
