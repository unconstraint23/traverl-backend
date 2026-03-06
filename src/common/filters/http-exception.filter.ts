import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'InternalServerError';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || exception.name;
      }

      // 根据不同的 HTTP 状态码设置业务错误码
      switch (status) {
        case HttpStatus.NOT_FOUND:
          code = 'NOT_FOUND';
          break;
        case HttpStatus.BAD_REQUEST:
          code = 'BAD_REQUEST';
          break;
        case HttpStatus.UNAUTHORIZED:
          code = 'UNAUTHORIZED';
          break;
        case HttpStatus.FORBIDDEN:
          code = 'FORBIDDEN';
          break;
        default:
          code = 'ERROR';
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    // 统一的错误响应格式 - 始终返回 200 状态码
    const errorResponse = {
      data: {},
      code,
      message,
      success: false,
      timestamp: new Date().toISOString(),
    };

    // 只在开发环境返回堆栈信息和路径
    if (process.env.NODE_ENV === 'development') {
      (errorResponse as any).path = request.url;
      if (exception instanceof Error) {
        (errorResponse as any).stack = exception.stack;
      }
    }

    this.logger.warn(
      `${request.method} ${request.url} - ${status} - ${message}`,
    );

    // 始终返回 200 状态码，错误信息在响应体中
    response.status(HttpStatus.OK).json(errorResponse);
  }
}
