import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.cookies?.['session_id'];

    if (!sessionId) {
      throw new UnauthorizedException('No session found. Please log in.');
    }

    const session = await this.authService.getSession(sessionId);

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session. Please log in again.');
    }

    // Attach session to request
    request.user = session;

    return true;
  }
}
