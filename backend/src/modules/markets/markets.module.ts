import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';
import { OpinionMarket } from '../../database/entities/opinion-market.entity';
import { MarketPosition } from '../../database/entities/market-position.entity';
import { MarketTrade } from '../../database/entities/market-trade.entity';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { ContractsModule } from '../../contracts/contracts.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OpinionMarket,
      MarketPosition,
      MarketTrade,
      Creator,
      User,
    ]),
    ContractsModule,
    AuthModule,
  ],
  controllers: [MarketsController],
  providers: [MarketsService],
  exports: [MarketsService],
})
export class MarketsModule {}
