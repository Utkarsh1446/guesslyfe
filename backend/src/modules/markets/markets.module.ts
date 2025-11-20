import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';
import { MarketEventsService } from './market-events.service';
import { MarketMonitoringService } from './market-monitoring.service';
import { Market } from '../../database/entities/market.entity';
import { Outcome } from '../../database/entities/outcome.entity';
import { Position } from '../../database/entities/position.entity';
import { Trade } from '../../database/entities/trade.entity';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { ContractsModule } from '../../contracts/contracts.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Market,
      Outcome,
      Position,
      Trade,
      Creator,
      User,
    ]),
    ContractsModule,
    AuthModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [MarketsController],
  providers: [
    MarketsService,
    MarketEventsService,
    MarketMonitoringService,
  ],
  exports: [MarketsService],
})
export class MarketsModule {}
