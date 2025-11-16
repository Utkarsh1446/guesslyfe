import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

/**
 * Admin Auth Guard for Bull Board Dashboard
 * Protects the /admin/queues endpoint with basic authentication
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Get admin credentials from environment
    const adminUsername = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

    // If no admin password is set, deny access for security
    if (!adminPassword) {
      throw new UnauthorizedException('Admin access not configured');
    }

    // Check Basic Auth header
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      throw new UnauthorizedException('Admin authentication required');
    }

    // Decode and verify credentials
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (username !== adminUsername || password !== adminPassword) {
      throw new UnauthorizedException('Invalid admin credentials');
    }

    return true;
  }
}

/**
 * Express middleware version for non-NestJS routes
 */
export function adminAuthMiddleware(req: Request, res: any, next: any) {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;

  // If no admin password is set, deny access
  if (!adminPassword) {
    res.status(401).json({ message: 'Admin access not configured' });
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
    res.status(401).json({ message: 'Admin authentication required' });
    return;
  }

  try {
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (username === adminUsername && password === adminPassword) {
      next();
    } else {
      res.setHeader('WWW-Authenticate', 'Basic realm="Admin Area"');
      res.status(401).json({ message: 'Invalid admin credentials' });
    }
  } catch (error) {
    res.status(401).json({ message: 'Invalid authentication format' });
  }
}
