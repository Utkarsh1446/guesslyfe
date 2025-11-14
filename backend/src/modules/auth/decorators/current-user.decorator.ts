import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Session } from '../interfaces/session.interface';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): Session | null => {
    const request = ctx.switchToHttp().getRequest();
    return request.user || null;
  },
);
