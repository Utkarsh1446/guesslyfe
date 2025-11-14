import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from '@nestjs-modules/ioredis';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CreatorsModule } from './modules/creators/creators.module';
import { SharesModule } from './modules/shares/shares.module';
import { MarketsModule } from './modules/markets/markets.module';
import { DividendsModule } from './modules/dividends/dividends.module';
import { TwitterModule } from './modules/twitter/twitter.module';
import { ContractsModule } from './contracts/contracts.module';

// Configuration imports
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import blockchainConfig from './config/blockchain.config';
import jwtConfig, { jwtRefreshConfig } from './config/jwt.config';
import twitterConfig from './config/twitter.config';

@Module({
  imports: [
    // Configuration Module
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        blockchainConfig,
        jwtConfig,
        jwtRefreshConfig,
        twitterConfig,
      ],
      envFilePath: ['.env.local', '.env'],
      cache: true,
    }),

    // Database Module (TypeORM)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<TypeOrmModuleOptions>('database');
        if (!dbConfig) {
          throw new Error('Database configuration is missing');
        }
        return dbConfig;
      },
    }),

    // Redis & Bull Queue Module
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: configService.get('redis'),
      }),
    }),

    // Rate Limiting Module
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: (configService.get<number>('app.throttleTtl') || 60) * 1000, // Convert to milliseconds
            limit: configService.get<number>('app.throttleLimit') || 100,
          },
        ],
      }),
    }),

    // Redis Module (standalone for sessions)
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: `redis://${configService.get('redis.host')}:${configService.get('redis.port')}`,
      }),
    }),

    // Event Emitter Module (for blockchain events)
    EventEmitterModule.forRoot(),

    // Feature Modules
    HealthModule,
    AuthModule,
    UsersModule,
    CreatorsModule,
    SharesModule,
    MarketsModule,
    DividendsModule,
    TwitterModule,
    ContractsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
