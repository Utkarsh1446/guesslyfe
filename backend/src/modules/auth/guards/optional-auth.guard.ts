import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.cookies?.['session_id'];

    if (sessionId) {
      const session = await this.authService.getSession(sessionId);
      if (session) {
        // Attach session to request if valid
        request.user = session;
      }
    }

    // Always allow access, just optionally populate user
    return true;
  }
}
