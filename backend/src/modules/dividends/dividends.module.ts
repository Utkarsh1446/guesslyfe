import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DividendsController } from './dividends.controller';
import { DividendsService } from './dividends.service';
import { DividendClaim } from '../../database/entities/dividend-claim.entity';
import { DividendEpoch } from '../../database/entities/dividend-epoch.entity';
import { CreatorShare } from '../../database/entities/creator-share.entity';
import { Creator } from '../../database/entities/creator.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DividendClaim,
      DividendEpoch,
      CreatorShare,
      Creator,
    ]),
    AuthModule,
  ],
  controllers: [DividendsController],
  providers: [DividendsService],
  exports: [DividendsService],
})
export class DividendsModule {}
