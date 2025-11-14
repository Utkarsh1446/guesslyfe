import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../database/entities/user.entity';
import { ShareTransaction } from '../../database/entities/share-transaction.entity';
import { MarketPosition } from '../../database/entities/market-position.entity';
import { MarketTrade } from '../../database/entities/market-trade.entity';
import { DividendClaim } from '../../database/entities/dividend-claim.entity';
import { ContractsModule } from '../../contracts/contracts.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ShareTransaction,
      MarketPosition,
      MarketTrade,
      DividendClaim,
    ]),
    ContractsModule,
    AuthModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
