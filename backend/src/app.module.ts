import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { RedisModule } from '@nestjs-modules/ioredis';
import { APP_GUARD } from '@nestjs/core';
import { Reflector } from '@nestjs/core';
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
import { QueuesModule } from './jobs/queues.module';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';

// Configuration imports
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import blockchainConfig from './config/blockchain.config';
import jwtConfig, { jwtRefreshConfig } from './config/jwt.config';
import twitterConfig from './config/twitter.config';
import { throttlerConfig } from './common/config/throttler.config';

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

    // Rate Limiting Module (with custom configuration)
    ThrottlerModule.forRoot(throttlerConfig),

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

    // Schedule Module (for cron jobs)
    ScheduleModule.forRoot(),

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

    // Background Jobs
    QueuesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    Reflector,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
