import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';
import { CreatorShare } from '../../database/entities/creator-share.entity';
import { ShareTransaction } from '../../database/entities/share-transaction.entity';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { ContractsModule } from '../../contracts/contracts.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CreatorShare,
      ShareTransaction,
      Creator,
      User,
    ]),
    ContractsModule,
    AuthModule,
  ],
  controllers: [SharesController],
  providers: [SharesService],
  exports: [SharesService],
})
export class SharesModule {}
