import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  data: {
    list?: T[];
    [key: string]: any;
  };
  code: string;
  message: string;
  success: boolean;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((responseData) => {
        const baseResponse = {
          code: 'SUCCESS',
          message: 'ok',
          success: true,
          timestamp: new Date().toISOString(),
        };

        // 如果返回的是数组，放在 data.list 中
        if (Array.isArray(responseData)) {
          return {
            ...baseResponse,
            data: {
              list: responseData,
            },
          };
        }

        // 如果返回的是对象，直接放在 data 中
        return {
          ...baseResponse,
          data: responseData || {},
        };
      }),
    );
  }
}
