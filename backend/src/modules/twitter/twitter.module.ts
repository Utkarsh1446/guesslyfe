import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { TwitterController } from './twitter.controller';
import { TwitterService } from './twitter.service';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Creator, User]),
    ConfigModule,
    AuthModule,
  ],
  controllers: [TwitterController],
  providers: [TwitterService],
  exports: [TwitterService],
})
export class TwitterModule {}
