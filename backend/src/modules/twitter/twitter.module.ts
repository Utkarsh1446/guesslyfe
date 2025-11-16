import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { TwitterController } from './twitter.controller';
import { TwitterService } from './twitter.service';
import { TwitterAPIService } from './twitter-api.service';
import { TwitterScraperService } from './twitter-scraper.service';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Creator, User]),
    ConfigModule,
    AuthModule,
    CacheModule.register({
      ttl: 15 * 60 * 1000, // 15 minutes
      max: 1000, // Maximum number of items in cache
    }),
  ],
  controllers: [TwitterController],
  providers: [TwitterService, TwitterAPIService, TwitterScraperService],
  exports: [TwitterService],
})
export class TwitterModule {}
