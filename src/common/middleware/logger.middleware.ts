import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('HTTP');

  use(request: Request, response: Response, next: NextFunction): void {
    const { method, originalUrl, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    // Log request
    this.logger.log(
      `→ ${method} ${originalUrl} - ${ip} - ${userAgent}`,
    );

    // Log response
    response.on('finish', () => {
      const { statusCode } = response;
      const contentLength = response.get('content-length');
      const duration = Date.now() - startTime;

      this.logger.log(
        `← ${method} ${originalUrl} ${statusCode} ${contentLength || 0}b - ${duration}ms`,
      );
    });

    next();
  }
}
