import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { I18nService, Lang } from './i18n.service';

/**
 * Parameter decorator that extracts the language from Accept-Language header.
 *
 * Usage:
 *   @Get()
 *   findAll(@Language() lang: Lang) { ... }
 */
export const Language = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Lang => {
    const request = ctx.switchToHttp().getRequest();
    const acceptLanguage = request.headers['accept-language'];
    return I18nService.parseLang(acceptLanguage);
  },
);
