import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ethers } from 'ethers';
import { ContractsService } from './contracts.service';
import { CreatorShareService } from './creator-share.service';
import { CreatorShareFactoryService } from './creator-share-factory.service';
import { OpinionMarketService } from './opinion-market.service';

interface ProcessedEvent {
  eventName: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
  processed: boolean;
  retries: number;
  lastError?: string;
}

@Injectable()
export class EventListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventListenerService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 5000; // 5 seconds
  private readonly REORG_DEPTH = 10; // Monitor last 10 blocks for reorgs

  private isListening = false;
  private processedEvents: Map<string, ProcessedEvent> = new Map();
  private lastProcessedBlock = 0;

  constructor(
    private readonly contractsService: ContractsService,
    private readonly creatorShareService: CreatorShareService,
    private readonly creatorShareFactoryService: CreatorShareFactoryService,
    private readonly opinionMarketService: OpinionMarketService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    // Auto-start listeners on module initialization
    try {
      await this.startListeners();
    } catch (error) {
      this.logger.warn(`Event listeners could not start (likely missing contract config): ${error.message}`);
      // Don't throw - allow app to start without event listeners in development
    }
  }

  onModuleDestroy() {
    this.stopListeners();
  }

  /**
   * Start all event listeners
   */
  async startListeners() {
    if (this.isListening) {
      this.logger.warn('Event listeners are already running');
      return;
    }

    try {
      this.logger.log('Starting blockchain event listeners...');

      // Get current block number
      this.lastProcessedBlock = await this.contractsService.getBlockNumber();
      this.logger.log(`Starting from block: ${this.lastProcessedBlock}`);

      // Start listening to all contract events
      this.listenToCreatorShareFactoryEvents();
      this.listenToOpinionMarketEvents();
      this.listenToFeeCollectorEvents();

      this.isListening = true;
      this.logger.log('All event listeners started successfully');

      // Start periodic reorg check
      this.startReorgMonitor();
    } catch (error) {
      this.logger.error(`Failed to start event listeners: ${error.message}`);
      throw error; // Re-throw to be caught by onModuleInit
    }
  }

  /**
   * Stop all event listeners
   */
  stopListeners() {
    if (!this.isListening) {
      this.logger.warn('Event listeners are not running');
      return;
    }

    try {
      this.logger.log('Stopping blockchain event listeners...');

      // Remove all listeners from contracts
      this.creatorShareFactoryService.removeAllListeners();
      this.opinionMarketService.removeAllListeners();

      const feeCollectorContract = this.contractsService.getContract('feeCollector');
      feeCollectorContract.removeAllListeners();

      this.isListening = false;
      this.logger.log('All event listeners stopped');
    } catch (error) {
      this.logger.error(`Failed to stop event listeners: ${error.message}`);
      throw error;
    }
  }

  /**
   * Listen to CreatorShareFactory events
   */
  private listenToCreatorShareFactoryEvents() {
    // SharesCreated event
    this.creatorShareFactoryService.listenToSharesCreated(
      async (creator, shareContract, name, symbol, timestamp) => {
        await this.processEvent('SharesCreated', async () => {
          this.logger.log(`Processing SharesCreated: ${creator} -> ${shareContract}`);

          // Emit internal event for other services to handle
          this.eventEmitter.emit('shares.created', {
            creator,
            shareContract,
            name,
            symbol,
            timestamp: Number(timestamp),
          });
        });
      },
    );

    // VolumeUpdated event
    this.creatorShareFactoryService.listenToVolumeUpdates(
      async (creator, additionalVolume, newTotalVolume, timestamp) => {
        await this.processEvent('VolumeUpdated', async () => {
          this.logger.log(`Processing VolumeUpdated: ${creator} -> ${newTotalVolume}`);

          this.eventEmitter.emit('volume.updated', {
            creator,
            additionalVolume,
            newTotalVolume,
            timestamp: Number(timestamp),
          });
        });
      },
    );

    // SharesUnlocked event
    this.creatorShareFactoryService.listenToSharesUnlocked(
      async (creator, finalVolume, timestamp) => {
        await this.processEvent('SharesUnlocked', async () => {
          this.logger.log(`Processing SharesUnlocked: ${creator} with volume ${finalVolume}`);

          this.eventEmitter.emit('shares.unlocked', {
            creator,
            finalVolume,
            timestamp: Number(timestamp),
          });
        });
      },
    );

    this.logger.log('CreatorShareFactory event listeners registered');
  }

  /**
   * Listen to OpinionMarket events
   */
  private listenToOpinionMarketEvents() {
    this.opinionMarketService.listenToMarketEvents({
      // MarketCreated event
      onMarketCreated: async (marketId, creator, question, endTime) => {
        await this.processEvent('MarketCreated', async () => {
          this.logger.log(`Processing MarketCreated: ${marketId} by ${creator}`);

          this.eventEmitter.emit('market.created', {
            marketId,
            creator,
            question,
            endTime: Number(endTime),
          });
        });
      },

      // BetPlaced event
      onBetPlaced: async (marketId, user, isYes, amount, cost) => {
        await this.processEvent('BetPlaced', async () => {
          this.logger.log(`Processing BetPlaced: Market ${marketId}, User ${user}, ${isYes ? 'YES' : 'NO'}`);

          this.eventEmitter.emit('bet.placed', {
            marketId,
            user,
            isYes,
            amount,
            cost,
          });
        });
      },

      // MarketResolved event
      onMarketResolved: async (marketId, winningOutcome, timestamp) => {
        await this.processEvent('MarketResolved', async () => {
          this.logger.log(`Processing MarketResolved: ${marketId} -> ${winningOutcome ? 'YES' : 'NO'}`);

          this.eventEmitter.emit('market.resolved', {
            marketId,
            winningOutcome,
            timestamp: Number(timestamp),
          });
        });
      },

      // WinningsClaimed event
      onWinningsClaimed: async (marketId, user, payout) => {
        await this.processEvent('WinningsClaimed', async () => {
          this.logger.log(`Processing WinningsClaimed: Market ${marketId}, User ${user}, Payout ${payout}`);

          this.eventEmitter.emit('winnings.claimed', {
            marketId,
            user,
            payout,
          });
        });
      },
    });

    this.logger.log('OpinionMarket event listeners registered');
  }

  /**
   * Listen to FeeCollector events (EpochFinalized, DividendsClaimed)
   */
  private listenToFeeCollectorEvents() {
    const feeCollectorContract = this.contractsService.getContract('feeCollector');

    // EpochFinalized event
    feeCollectorContract.on('EpochFinalized', async (epochId, totalFees, timestamp) => {
      await this.processEvent('EpochFinalized', async () => {
        this.logger.log(`Processing EpochFinalized: Epoch ${epochId}, Total Fees ${totalFees}`);

        this.eventEmitter.emit('epoch.finalized', {
          epochId,
          totalFees,
          timestamp: Number(timestamp),
        });
      });
    });

    // DividendsClaimed event (if exists in FeeCollector)
    feeCollectorContract.on('DividendsClaimed', async (user, shareContract, amount, epochId, timestamp) => {
      await this.processEvent('DividendsClaimed', async () => {
        this.logger.log(`Processing DividendsClaimed: User ${user}, Amount ${amount}, Epoch ${epochId}`);

        this.eventEmitter.emit('dividends.claimed', {
          user,
          shareContract,
          amount,
          epochId,
          timestamp: Number(timestamp),
        });
      });
    });

    this.logger.log('FeeCollector event listeners registered');
  }

  /**
   * Listen to CreatorShare contract events for a specific share
   * @param shareContractAddress - The share contract address
   */
  listenToSpecificShareEvents(shareContractAddress: string) {
    this.creatorShareService.listenToShareEvents(shareContractAddress, {
      // SharesPurchased event
      onSharesPurchased: async (event) => {
        await this.processEvent('SharesPurchased', async () => {
          this.logger.log(`Processing SharesPurchased: ${event.buyer} bought ${event.amount} shares`);

          this.eventEmitter.emit('shares.purchased', {
            shareContract: shareContractAddress,
            buyer: event.buyer,
            amount: event.amount,
            cost: event.cost,
            newSupply: event.newSupply,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            timestamp: event.timestamp,
          });
        });
      },

      // SharesSold event
      onSharesSold: async (event) => {
        await this.processEvent('SharesSold', async () => {
          this.logger.log(`Processing SharesSold: ${event.seller} sold ${event.amount} shares`);

          this.eventEmitter.emit('shares.sold', {
            shareContract: shareContractAddress,
            seller: event.seller,
            amount: event.amount,
            payout: event.cost,
            newSupply: event.newSupply,
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash,
            timestamp: event.timestamp,
          });
        });
      },

      // DividendsClaimed event
      onDividendClaimed: async (user, amount, epochId) => {
        await this.processEvent('DividendsClaimed', async () => {
          this.logger.log(`Processing DividendsClaimed: ${user} claimed ${amount} for epoch ${epochId}`);

          this.eventEmitter.emit('dividends.claimed', {
            shareContract: shareContractAddress,
            user,
            amount,
            epochId,
          });
        });
      },

      // FeesWithdrawn event
      onFeesWithdrawn: async (recipient, amount) => {
        await this.processEvent('FeesWithdrawn', async () => {
          this.logger.log(`Processing FeesWithdrawn: ${recipient} withdrew ${amount}`);

          this.eventEmitter.emit('fees.withdrawn', {
            shareContract: shareContractAddress,
            recipient,
            amount,
          });
        });
      },
    });

    this.logger.log(`Share-specific event listeners registered for ${shareContractAddress}`);
  }

  /**
   * Process an event with retry logic and error handling
   * @param eventName - Name of the event
   * @param processor - Function to process the event
   */
  private async processEvent(eventName: string, processor: () => Promise<void>) {
    const eventKey = `${eventName}-${Date.now()}`;

    this.processedEvents.set(eventKey, {
      eventName,
      blockNumber: 0, // Will be updated
      transactionHash: '',
      logIndex: 0,
      processed: false,
      retries: 0,
    });

    for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        await processor();

        const eventData = this.processedEvents.get(eventKey);
        if (eventData) {
          eventData.processed = true;
          this.processedEvents.set(eventKey, eventData);
        }

        return;
      } catch (error) {
        const eventData = this.processedEvents.get(eventKey);
        if (eventData) {
          eventData.retries = attempt + 1;
          eventData.lastError = error.message;
          this.processedEvents.set(eventKey, eventData);
        }

        if (attempt < this.MAX_RETRIES) {
          this.logger.warn(`Event ${eventName} processing failed (attempt ${attempt + 1}/${this.MAX_RETRIES}): ${error.message}`);
          await this.sleep(this.RETRY_DELAY * (attempt + 1)); // Exponential backoff
        } else {
          this.logger.error(`Event ${eventName} processing failed after ${this.MAX_RETRIES} retries: ${error.message}`);

          // Emit error event for monitoring
          this.eventEmitter.emit('event.processing.error', {
            eventName,
            error: error.message,
            retries: this.MAX_RETRIES,
          });
        }
      }
    }
  }

  /**
   * Start monitoring for blockchain reorganizations
   */
  private startReorgMonitor() {
    const provider = this.contractsService.getProvider();

    provider.on('block', async (blockNumber) => {
      try {
        // Check for reorgs by comparing last processed block
        if (this.lastProcessedBlock > 0 && blockNumber < this.lastProcessedBlock) {
          this.logger.warn(`Potential reorg detected: ${blockNumber} < ${this.lastProcessedBlock}`);

          // Emit reorg event for handling
          this.eventEmitter.emit('blockchain.reorg', {
            oldBlock: this.lastProcessedBlock,
            newBlock: blockNumber,
          });

          // TODO: Implement reorg handling logic
          // - Revert affected database records
          // - Reprocess events from reorg point
        }

        this.lastProcessedBlock = blockNumber;
      } catch (error) {
        this.logger.error(`Error in reorg monitor: ${error.message}`);
      }
    });

    this.logger.log('Blockchain reorganization monitor started');
  }

  /**
   * Get event processing statistics
   */
  getStatistics(): {
    totalEvents: number;
    processedEvents: number;
    failedEvents: number;
    lastProcessedBlock: number;
  } {
    const total = this.processedEvents.size;
    let processed = 0;
    let failed = 0;

    this.processedEvents.forEach((event) => {
      if (event.processed) {
        processed++;
      } else if (event.retries >= this.MAX_RETRIES) {
        failed++;
      }
    });

    return {
      totalEvents: total,
      processedEvents: processed,
      failedEvents: failed,
      lastProcessedBlock: this.lastProcessedBlock,
    };
  }

  /**
   * Clear processed events older than specified time
   * @param olderThanMs - Clear events older than this many milliseconds
   */
  clearOldEvents(olderThanMs: number = 3600000) { // Default: 1 hour
    const cutoffTime = Date.now() - olderThanMs;

    this.processedEvents.forEach((value, key) => {
      const eventTime = parseInt(key.split('-')[1]);
      if (eventTime < cutoffTime && value.processed) {
        this.processedEvents.delete(key);
      }
    });

    this.logger.log(`Cleared old processed events (older than ${olderThanMs}ms)`);
  }

  /**
   * Sleep helper
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
