import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DividendsController } from './dividends.controller';
import { DividendsService } from './dividends.service';
import { DividendEpoch } from '../../database/entities/dividend-epoch.entity';
import { ClaimableDividend } from '../../database/entities/claimable-dividend.entity';
import { DividendClaim } from '../../database/entities/dividend-claim.entity';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { ContractsModule } from '../../contracts/contracts.module';
import { AuthModule } from '../auth/auth.module';
import { TwitterModule } from '../twitter/twitter.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DividendEpoch,
      ClaimableDividend,
      DividendClaim,
      Creator,
      User,
    ]),
    ContractsModule,
    AuthModule,
    TwitterModule,
  ],
  controllers: [DividendsController],
  providers: [DividendsService],
  exports: [DividendsService],
})
export class DividendsModule {}
