import { HttpException, HttpStatus } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { lastValueFrom, Observable } from 'rxjs';

export function rpcError(message: string, statusCode = HttpStatus.BAD_REQUEST) {
  return new RpcException({ message, statusCode });
}

export async function requestFromClient<T>(
  observable: Observable<T>,
): Promise<T> {
  try {
    return await lastValueFrom(observable);
  } catch (error) {
    const payload = (error ?? {}) as {
      message?: string | string[];
      statusCode?: number;
      error?: { message?: string | string[]; statusCode?: number };
    };

    const statusCode =
      payload.statusCode ??
      payload.error?.statusCode ??
      HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      payload.message ??
      payload.error?.message ??
      'Unexpected microservice error';

    throw new HttpException(message, statusCode);
  }
}
