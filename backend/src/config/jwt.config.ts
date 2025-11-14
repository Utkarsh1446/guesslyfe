import { registerAs } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

export default registerAs(
  'jwt',
  () => ({
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    signOptions: {
      expiresIn: process.env.JWT_EXPIRATION || '7d',
    },
  } as JwtModuleOptions),
);

export const jwtRefreshConfig = registerAs('jwtRefresh', () => ({
  secret:
    process.env.JWT_REFRESH_SECRET ||
    'default-refresh-secret-change-in-production',
  expiresIn: process.env.JWT_REFRESH_EXPIRATION || '30d',
}));
