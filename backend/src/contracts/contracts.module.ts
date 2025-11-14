import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ContractsService } from './contracts.service';
import { BlockchainService } from './blockchain.service';
import { CreatorShareService } from './creator-share.service';
import { CreatorShareFactoryService } from './creator-share-factory.service';
import { OpinionMarketService } from './opinion-market.service';
import { EventListenerService } from './event-listener.service';

@Module({
  imports: [ConfigModule],
  providers: [
    BlockchainService,
    ContractsService,
    CreatorShareService,
    CreatorShareFactoryService,
    OpinionMarketService,
    EventListenerService,
  ],
  exports: [
    BlockchainService,
    ContractsService,
    CreatorShareService,
    CreatorShareFactoryService,
    OpinionMarketService,
    EventListenerService,
  ],
})
export class ContractsModule {}
