// Polyfill for crypto global (needed for @nestjs/typeorm)
import * as crypto from 'crypto';
(global as any).crypto = crypto;

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { getQueueToken } from '@nestjs/bull';
import { ExpressAdapter } from '@bull-board/express';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { createBullBoard } from '@bull-board/api';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { QUEUE_NAMES } from './jobs/queue.constants';
import { adminAuthMiddleware } from './jobs/guards/admin-auth.guard';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // Security: Helmet
  app.use(helmet());

  // Cookie Parser
  app.use(cookieParser());

  // Compression
  app.use(compression());

  // CORS Configuration
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin'),
    credentials: configService.get<boolean>('app.corsCredentials'),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global API Prefix
  const apiPrefix = configService.get<string>('app.apiPrefix') || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Convert types automatically
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global Interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger Documentation
  const swaggerEnabled = configService.get<boolean>('app.swagger.enabled');
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('Guessly API')
      .setDescription(
        `Comprehensive REST API for the GuessLyfe prediction market platform.

**GuessLyfe** is a decentralized prediction market platform built on Base blockchain where users can:
- Trade creator shares and earn dividends
- Create and trade on opinion markets
- Connect with Twitter for creator verification
- Earn rewards through accurate predictions

## Features
- 🔐 **Authentication**: Twitter OAuth + JWT bearer token
- 👤 **User Management**: Profile, wallet, portfolio tracking
- 🎨 **Creator System**: Verified creators with tradable shares
- 📊 **Opinion Markets**: Create and trade on prediction markets
- 💰 **Dividends**: Automated dividend distribution system
- 🔔 **Notifications**: Email, push, and in-app notifications
- ⚡ **Real-time Updates**: WebSocket support for live data

## Blockchain Integration
- Network: Base (Sepolia Testnet)
- Currency: USDC
- Smart Contracts: Creator shares, Opinion markets, Fee collection

## Rate Limits
- Default: 100 requests per minute per IP
- Authenticated: 1000 requests per minute per user

## Support
- Documentation: https://docs.guesslyfe.com
- Support: support@guesslyfe.com
        `
      )
      .setVersion('0.1.0')
      .setContact(
        'GuessLyfe Support',
        'https://guesslyfe.com',
        'support@guesslyfe.com'
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('http://localhost:3000/api/v1', 'Local Development')
      .addServer('https://api-testnet.guesslyfe.com/api/v1', 'Testnet (Base Sepolia)')
      .addServer('https://api.guesslyfe.com/api/v1', 'Production (Base Mainnet)')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /auth/login or /auth/twitter/callback',
        },
        'JWT-auth'
      )
      .addTag('Authentication', 'User authentication via Twitter OAuth and JWT tokens')
      .addTag('Users', 'User profile management and portfolio tracking')
      .addTag('Creators', 'Creator profiles, verification, and share management')
      .addTag('Shares', 'Creator share trading operations and transactions')
      .addTag('Markets', 'Opinion market creation, trading, and resolution')
      .addTag('Dividends', 'Dividend epoch management and distribution')
      .addTag('Twitter', 'Twitter integration and data synchronization')
      .addTag('Health', 'Health check and system status endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Guessly API Documentation',
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .information-container { margin: 20px 0; }
        .swagger-ui .scheme-container { padding: 20px 0; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
      },
    });

    // Export OpenAPI JSON in development
    if (configService.get<string>('app.nodeEnv') === 'development') {
      const fs = await import('fs');
      const path = await import('path');
      const docsDir = path.join(__dirname, '..', 'docs');

      try {
        if (!fs.existsSync(docsDir)) {
          fs.mkdirSync(docsDir, { recursive: true });
        }

        const outputPath = path.join(docsDir, 'openapi.json');
        fs.writeFileSync(outputPath, JSON.stringify(document, null, 2), 'utf-8');
        logger.log(`OpenAPI spec exported to: ${outputPath}`);
      } catch (error) {
        logger.warn(`Failed to export OpenAPI spec: ${error.message}`);
      }
    }

    logger.log(`Swagger documentation available at: http://localhost:${configService.get<number>('app.port')}/api/docs`);
  }

  // Bull Board - Queue Monitoring Dashboard
  try {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    // Get all queue instances
    const queues = Object.values(QUEUE_NAMES).map((queueName) => {
      try {
        return app.get(getQueueToken(queueName));
      } catch (error) {
        logger.warn(`Queue ${queueName} not found, skipping...`);
        return null;
      }
    }).filter(queue => queue !== null);

    // Create Bull Board with all queues
    createBullBoard({
      queues: queues.map(queue => new BullAdapter(queue)),
      serverAdapter,
    });

    // Mount Bull Board with admin authentication
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.use('/admin/queues', adminAuthMiddleware, serverAdapter.getRouter());

    logger.log(`Bull Board available at: http://localhost:${configService.get<number>('app.port')}/admin/queues`);
    logger.log(`  Username: ${configService.get<string>('ADMIN_USERNAME', 'admin')}`);
    logger.log(`  Password: ${configService.get<string>('ADMIN_PASSWORD') ? '***' : 'NOT SET - ACCESS DENIED'}`);
  } catch (error) {
    logger.error(`Failed to setup Bull Board: ${error.message}`);
  }

  // Start Server
  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`Environment: ${configService.get<string>('app.nodeEnv')}`);
}

bootstrap();
