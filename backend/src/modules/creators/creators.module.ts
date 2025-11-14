import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreatorsController } from './creators.controller';
import { CreatorsService } from './creators.service';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { ShareTransaction } from '../../database/entities/share-transaction.entity';
import { OpinionMarket } from '../../database/entities/opinion-market.entity';
import { MarketTrade } from '../../database/entities/market-trade.entity';
import { ContractsModule } from '../../contracts/contracts.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Creator,
      User,
      ShareTransaction,
      OpinionMarket,
      MarketTrade,
    ]),
    ContractsModule,
    AuthModule,
  ],
  controllers: [CreatorsController],
  providers: [CreatorsService],
  exports: [CreatorsService],
})
export class CreatorsModule {}
