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
      .setTitle(configService.get<string>('app.swagger.title') || 'Guessly API')
      .setDescription(configService.get<string>('app.swagger.description') || 'API')
      .setVersion(configService.get<string>('app.swagger.version') || '1.0')
      .addBearerAuth()
      .addTag('Authentication', 'Auth endpoints')
      .addTag('Users', 'User management')
      .addTag('Creators', 'Creator profiles and shares')
      .addTag('Shares', 'Share trading operations')
      .addTag('Markets', 'Prediction markets')
      .addTag('Dividends', 'Dividend distribution')
      .addTag('Twitter', 'Twitter integration')
      .addTag('Health', 'Health check endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      customSiteTitle: 'Guessly API Docs',
      customCss: '.swagger-ui .topbar { display: none }',
    });

    logger.log(`Swagger documentation available at: http://localhost:${configService.get<number>('app.port')}/docs`);
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
