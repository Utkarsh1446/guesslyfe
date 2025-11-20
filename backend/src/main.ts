// Polyfill for crypto global (needed for @nestjs/typeorm)
import * as crypto from 'crypto';
(global as any).crypto = crypto;

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

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
  const corsOriginStr = configService.get<string>('app.corsOrigin') || '';
  const corsOrigins = corsOriginStr
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : 'http://localhost:3001',
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

  // Start Server
  const port = configService.get<number>('app.port') || 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
  logger.log(`Environment: ${configService.get<string>('app.nodeEnv')}`);
}

bootstrap();
