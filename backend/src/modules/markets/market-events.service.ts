import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Market } from '../../database/entities/market.entity';
import { Outcome } from '../../database/entities/outcome.entity';
import { Position } from '../../database/entities/position.entity';
import { Trade, TradeAction } from '../../database/entities/trade.entity';
import { User } from '../../database/entities/user.entity';
import { MarketStatus } from '../../database/enums';
import { OpinionMarketService } from '../../contracts/opinion-market.service';

@Injectable()
export class MarketEventsService implements OnModuleInit {
  private readonly logger = new Logger(MarketEventsService.name);

  constructor(
    @InjectRepository(Market)
    private readonly marketRepository: Repository<Market>,
    @InjectRepository(Outcome)
    private readonly outcomeRepository: Repository<Outcome>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly opinionMarketService: OpinionMarketService,
  ) {}

  async onModuleInit() {
    this.logger.log('Starting market event listeners...');
    await this.startEventListeners();
  }

  /**
   * Start listening to blockchain events
   */
  private async startEventListeners() {
    // TODO: Enable event listeners when OpinionMarketService.getContract() is implemented
    this.logger.log('Event listeners temporarily disabled - blockchain integration pending');
    return;

    /* Temporarily disabled - will be enabled once OpinionMarketService.getContract() is available
    try {
      const contract = this.opinionMarketService.getContract();

      // Listen to MarketCreated events
      contract.on('MarketCreated', async (marketId: bigint, creator: string, question: string, endTime: bigint, event: any) => {
        await this.handleMarketCreated(marketId, creator, question, endTime, event);
      });

      // Listen to BetPlaced events
      contract.on('BetPlaced', async (marketId: bigint, user: string, optionIndex: bigint, amount: bigint, event: any) => {
        await this.handleBetPlaced(marketId, user, optionIndex, amount, event);
      });

      // Listen to MarketResolved events
      contract.on('MarketResolved', async (marketId: bigint, winningOption: bigint, event: any) => {
        await this.handleMarketResolved(marketId, winningOption, event);
      });

      // Listen to WinningsClaimed events
      contract.on('WinningsClaimed', async (marketId: bigint, user: string, amount: bigint, event: any) => {
        await this.handleWinningsClaimed(marketId, user, amount, event);
      });

      this.logger.log('Market event listeners started successfully');
    } catch (error) {
      this.logger.error('Failed to start event listeners', error);
    }
    */
  }

  /**
   * Handle MarketCreated event
   */
  private async handleMarketCreated(
    marketId: bigint,
    creator: string,
    question: string,
    endTime: bigint,
    event: any,
  ) {
    try {
      this.logger.log(`MarketCreated event: ${marketId} by ${creator}`);

      // Find market by transaction hash
      const txHash = event.transactionHash;
      const market = await this.marketRepository.findOne({
        where: { txHash },
      });

      if (market) {
        this.logger.log(`Market ${market.id} confirmed on blockchain`);
      } else {
        this.logger.warn(`Market not found for tx ${txHash}`);
      }
    } catch (error) {
      this.logger.error('Error handling MarketCreated event', error);
    }
  }

  /**
   * Handle BetPlaced event
   */
  private async handleBetPlaced(
    marketId: bigint,
    userAddress: string,
    optionIndex: bigint,
    amount: bigint,
    event: any,
  ) {
    try {
      this.logger.log(`BetPlaced event: Market ${marketId}, User ${userAddress}`);

      // Find market by contract address
      const contractAddress = event.address.toLowerCase();
      const market = await this.marketRepository.findOne({
        where: { contractAddress },
        relations: ['outcomes'],
      });

      if (!market) {
        this.logger.warn(`Market not found for contract ${contractAddress}`);
        return;
      }

      // Find user
      const user = await this.userRepository.findOne({
        where: { walletAddress: userAddress.toLowerCase() },
      });

      if (!user) {
        this.logger.warn(`User not found for address ${userAddress}`);
        return;
      }

      // Find outcome
      const outcome = market.outcomes.find(
        (o) => o.outcomeIndex === Number(optionIndex),
      );

      if (!outcome) {
        this.logger.warn(`Outcome ${optionIndex} not found for market ${market.id}`);
        return;
      }

      // Convert amount from wei to USDC (6 decimals)
      const amountUSDC = Number(amount) / 1e6;
      const shares = amountUSDC; // Simplified - should calculate based on price
      const price = 1; // Simplified

      // Create or update position
      let position = await this.positionRepository.findOne({
        where: {
          marketId: market.id,
          userId: user.id,
          outcomeId: outcome.id,
        },
      });

      if (position) {
        // Update existing position
        const oldShares = parseFloat(position.shares);
        const oldCostBasis = parseFloat(position.costBasis);
        const newShares = oldShares + shares;
        const newCostBasis = oldCostBasis + amountUSDC;

        position.shares = newShares.toFixed(6);
        position.costBasis = newCostBasis.toFixed(6);
        position.averagePrice = (newCostBasis / newShares).toFixed(6);
      } else {
        // Create new position
        position = this.positionRepository.create({
          marketId: market.id,
          userId: user.id,
          outcomeId: outcome.id,
          walletAddress: userAddress.toLowerCase(),
          shares: shares.toFixed(6),
          costBasis: amountUSDC.toFixed(6),
          averagePrice: price.toFixed(6),
        });
      }

      await this.positionRepository.save(position);

      // Create trade record
      const trade = this.tradeRepository.create({
        marketId: market.id,
        userId: user.id,
        outcomeId: outcome.id,
        walletAddress: userAddress.toLowerCase(),
        action: TradeAction.BUY,
        shares: shares.toFixed(6),
        amount: amountUSDC.toFixed(6),
        price: price.toFixed(6),
        fee: (amountUSDC * 0.02).toFixed(6),
        txHash: event.transactionHash,
        blockNumber: event.blockNumber?.toString(),
        blockTimestamp: new Date(),
      });

      await this.tradeRepository.save(trade);

      // Update market stats
      market.totalVolume = (parseFloat(market.totalVolume) + amountUSDC).toFixed(6);
      market.tradeCount += 1;

      // Update participant count if new participant
      if (!position.id) {
        market.participantCount += 1;
      }

      await this.marketRepository.save(market);

      // Update outcome stats
      outcome.totalShares = (parseFloat(outcome.totalShares) + shares).toFixed(6);
      outcome.totalStaked = (parseFloat(outcome.totalStaked) + amountUSDC).toFixed(6);

      await this.outcomeRepository.save(outcome);

      this.logger.log(`Trade recorded for market ${market.id}`);
    } catch (error) {
      this.logger.error('Error handling BetPlaced event', error);
    }
  }

  /**
   * Handle MarketResolved event
   */
  private async handleMarketResolved(
    marketId: bigint,
    winningOption: bigint,
    event: any,
  ) {
    try {
      this.logger.log(`MarketResolved event: Market ${marketId}, Winner ${winningOption}`);

      const contractAddress = event.address.toLowerCase();
      const market = await this.marketRepository.findOne({
        where: { contractAddress },
      });

      if (!market) {
        this.logger.warn(`Market not found for contract ${contractAddress}`);
        return;
      }

      market.status = MarketStatus.RESOLVED;
      market.winningOutcomeIndex = Number(winningOption);
      market.resolvedAt = new Date();

      await this.marketRepository.save(market);

      this.logger.log(`Market ${market.id} marked as resolved`);
    } catch (error) {
      this.logger.error('Error handling MarketResolved event', error);
    }
  }

  /**
   * Handle WinningsClaimed event
   */
  private async handleWinningsClaimed(
    marketId: bigint,
    userAddress: string,
    amount: bigint,
    event: any,
  ) {
    try {
      this.logger.log(`WinningsClaimed event: Market ${marketId}, User ${userAddress}`);

      const contractAddress = event.address.toLowerCase();
      const market = await this.marketRepository.findOne({
        where: { contractAddress },
      });

      if (!market) {
        this.logger.warn(`Market not found for contract ${contractAddress}`);
        return;
      }

      const user = await this.userRepository.findOne({
        where: { walletAddress: userAddress.toLowerCase() },
      });

      if (!user) {
        this.logger.warn(`User not found for address ${userAddress}`);
        return;
      }

      // Mark position as claimed
      const positions = await this.positionRepository.find({
        where: {
          marketId: market.id,
          userId: user.id,
          claimed: false,
        },
      });

      const amountUSDC = Number(amount) / 1e6;

      for (const position of positions) {
        position.claimed = true;
        position.claimedAmount = amountUSDC.toFixed(6);
        position.claimedAt = new Date();
        await this.positionRepository.save(position);
      }

      this.logger.log(`Winnings claimed for user ${user.id} in market ${market.id}`);
    } catch (error) {
      this.logger.error('Error handling WinningsClaimed event', error);
    }
  }
}
