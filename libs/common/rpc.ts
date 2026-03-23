/**
 * RPC（远程过程调用）异常处理工具
 * 
 * 这个文件提供了微服务通信中的错误处理和请求封装功能
 * 在 TCP 微服务架构中，服务间通信失败时需要统一的错误处理机制
 * 
 * @module libs/common/rpc
 */

import { HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';

/**
 * 创建 RPC 异常对象
 * 
 * 作用：创建一个标准化的 RPC 异常，用于微服务通信中的错误抛出
 * 
 * @param message - 错误消息
 * @param statusCode - HTTP 状态码，默认 400
 * @returns RpcException 实例
 * 
 * 使用示例：
 * ```typescript
 * // 在微服务中抛出异常（见 apps/user-service/src/user.service.ts:36）
 * throw rpcError('Email already registered', HttpStatus.CONFLICT);
 * ```
 * 
 * 为什么需要这个函数：
 * - NestJS 微服务通信时，错误需要通过 RpcException 包装
 * - 统一错误格式，方便 API Gateway 层转换为 HTTP 响应
 */
export function rpcError(message: string, statusCode = HttpStatus.BAD_REQUEST) {
  return new RpcException({ message, statusCode });
}

/**
 * 从微服务客户端请求并转换异常
 * 
 * 作用：封装微服务调用，将 RPC 异常转换为 HTTP 异常
 * 
 * @param observable - 微服务客户端发送的 Observable 流
 * @returns Promise<T> - 微服务返回的数据
 * 
 * 工作流程：
 * 1. 使用 lastValueFrom 将 Observable 转为 Promise
 * 2. 捕获错误并解析错误结构
 * 3. 将 RpcException 转换为 HttpException，让前端能理解
 * 
 * 使用示例：
 * ```typescript
 * // 在 API Gateway 控制器中调用微服务（见 apps/api-gateway/src/auth/auth.controller.ts:36）
 * const result = await requestFromClient(
 *   this.userClient.send(USER_PATTERNS.REGISTER, dto)
 * );
 * ```
 * 
 * 错误处理逻辑：
 * - 如果微服务抛出 rpcError，这里会提取 message 和 statusCode
 * - 如果没有状态码，默认返回 500 内部服务器错误
 * - 最终抛出 HttpException，由 HttpExceptionFilter 统一处理
 */
export async function requestFromClient<T>(
  observable: Observable<T>,
): Promise<T> {
  try {
    // lastValueFrom: 订阅 Observable 并返回最后一个值（微服务响应）
    // 为什么需要：NestJS 微服务通信基于 RxJS Observable，而控制器使用 async/await
    return await lastValueFrom(observable);
  } catch (error) {
    // ============ 错误解析 ============
    
    /**
     * 微服务错误的可能结构：
     * 
     * 结构 1: { message: '错误', statusCode: 400 }
     * 结构 2: { error: { message: '错误', statusCode: 400 } }
     * 结构 3: 其他未知结构
     */
    const payload = (error ?? {}) as {
      message?: string | string[];
      statusCode?: number;
      error?: { message?: string | string[]; statusCode?: number };
    };

    // 优先级：直接 statusCode > error 对象中的 statusCode > 默认 500
    const statusCode =
      payload.statusCode ??
      payload.error?.statusCode ??
      HttpStatus.INTERNAL_SERVER_ERROR;

    // 优先级：直接 message > error 对象中的 message > 默认消息
    const message =
      payload.message ??
      payload.error?.message ??
      'Unexpected microservice error';

    // 将 RPC 异常转换为 HTTP 异常，让 API Gateway 层能正确处理
    throw new HttpException(message, statusCode);
  }
}
