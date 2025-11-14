import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { CreatorAuthGuard } from './guards/creator-auth.guard';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { OptionalAuthGuard } from './guards/optional-auth.guard';
import { User } from '../../database/entities/user.entity';
import { Creator } from '../../database/entities/creator.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Creator]),
    ConfigModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthGuard,
    CreatorAuthGuard,
    AdminAuthGuard,
    OptionalAuthGuard,
  ],
  exports: [
    AuthService,
    AuthGuard,
    CreatorAuthGuard,
    AdminAuthGuard,
    OptionalAuthGuard,
  ],
})
export class AuthModule {}
