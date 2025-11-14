import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { Session } from '../interfaces/session.interface';

@Injectable()
export class CreatorAuthGuard extends AuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // First check if user is authenticated
    await super.canActivate(context);

    const request = context.switchToHttp().getRequest();
    const session: Session = request.user;

    // Admin can bypass creator requirements
    if (session.isAdmin) {
      return true;
    }

    // Check if user is a creator
    if (!session.isCreator) {
      throw new ForbiddenException('This action requires creator status');
    }

    return true;
  }
}
