import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      this.logger.warn(`Auth failed: missing or malformed Authorization header (${request.method} ${request.url})`);
      throw new UnauthorizedException('Missing or invalid token');
    }

    const token = authHeader.split(' ')[1];
    try {
      const payload = this.authService.verifyToken(token);
      request.userId = payload.sub;
      return true;
    } catch (err) {
      this.logger.warn(`Auth failed: ${err.message} (${request.method} ${request.url})`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
