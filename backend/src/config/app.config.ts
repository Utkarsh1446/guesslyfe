import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  corsCredentials: boolean;
  frontendUrl: string;
  throttleTtl: number;
  throttleLimit: number;
  logLevel: string;
  encryptionKey: string;
  adminTwitterId: string;
  swagger: {
    enabled: boolean;
    title: string;
    description: string;
    version: string;
  };
}

export default registerAs(
  'app',
  (): AppConfig => ({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    corsCredentials: process.env.CORS_CREDENTIALS === 'true',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    throttleTtl: parseInt(process.env.THROTTLE_TTL || '60', 10),
    throttleLimit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
    logLevel: process.env.LOG_LEVEL || 'debug',
    encryptionKey: process.env.ENCRYPTION_KEY || '',
    adminTwitterId: process.env.ADMIN_TWITTER_ID || '',
    swagger: {
      enabled: process.env.SWAGGER_ENABLED !== 'false',
      title: process.env.SWAGGER_TITLE || 'Guessly API',
      description:
        process.env.SWAGGER_DESCRIPTION ||
        'Guessly Prediction Market Platform API',
      version: process.env.SWAGGER_VERSION || '1.0',
    },
  }),
);
