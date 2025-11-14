import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { Session } from '../interfaces/session.interface';

@Injectable()
export class AdminAuthGuard extends AuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check if user is authenticated
    await super.canActivate(context);

    const request = context.switchToHttp().getRequest();
    const session: Session = request.user;

    // Check if user is admin
    if (!session.isAdmin) {
      throw new ForbiddenException('This action requires admin privileges');
    }

    return true;
  }
}
