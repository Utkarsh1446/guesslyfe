import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { OpinionMarket } from '../../database/entities/opinion-market.entity';
import { MarketPosition } from '../../database/entities/market-position.entity';
import { MarketTrade } from '../../database/entities/market-trade.entity';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { OpinionMarketService } from '../../contracts/opinion-market.service';
import {
  MarketResponseDto,
  MarketPriceQuoteDto,
  MarketPositionDto,
  MarketTradeDto,
  TrendingMarketDto,
} from './dto/market-response.dto';

@Injectable()
export class MarketsService {
  constructor(
    @InjectRepository(OpinionMarket)
    private readonly opinionMarketRepository: Repository<OpinionMarket>,
    @InjectRepository(MarketPosition)
    private readonly marketPositionRepository: Repository<MarketPosition>,
    @InjectRepository(MarketTrade)
    private readonly marketTradeRepository: Repository<MarketTrade>,
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly opinionMarketService: OpinionMarketService,
  ) {}

  /**
   * Get all markets with filtering and pagination
   */
  async getAllMarkets(
    status?: 'ACTIVE' | 'RESOLVED' | 'CANCELLED',
    page: number = 1,
    limit: number = 20,
  ): Promise<{ markets: MarketResponseDto[]; total: number; page: number; totalPages: number }> {
    const queryBuilder = this.opinionMarketRepository
      .createQueryBuilder('market')
      .leftJoinAndSelect('market.creator', 'creator')
      .leftJoinAndSelect('creator.user', 'user')
      .orderBy('market.createdAt', 'DESC');

    // Note: Status filtering will be done after fetching on-chain data

    const [markets, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const marketResponses: MarketResponseDto[] = [];

    for (const market of markets) {
      const marketDto = await this.buildMarketResponse(market);

      // Apply status filter if specified
      if (status && marketDto.status !== status) continue;

      marketResponses.push(marketDto);
    }

    return {
      markets: marketResponses,
      total: marketResponses.length,
      page,
      totalPages: Math.ceil(marketResponses.length / limit),
    };
  }

  /**
   * Get market by ID
   */
  async getMarketById(marketId: string): Promise<MarketResponseDto> {
    const market = await this.opinionMarketRepository.findOne({
      where: { marketId },
      relations: ['creator', 'creator.user'],
    });

    if (!market) {
      throw new NotFoundException(`Market with ID ${marketId} not found`);
    }

    return this.buildMarketResponse(market);
  }

  /**
   * Get price quote for betting on YES or NO
   * NOTE: This is READ-ONLY. Actual betting happens on frontend via user's wallet.
   */
  async getBetPriceQuote(
    marketId: string,
    outcome: 'YES' | 'NO',
    betAmount: number,
  ): Promise<MarketPriceQuoteDto> {
    const market = await this.opinionMarketRepository.findOne({
      where: { marketId },
    });

    if (!market) {
      throw new NotFoundException(`Market with ID ${marketId} not found`);
    }

    // Get current market info from blockchain
    const marketInfo = await this.opinionMarketService.getMarketInfo(BigInt(marketId));

    if (marketInfo.resolved || marketInfo.cancelled) {
      throw new Error('Market is not active');
    }

    // Get current probabilities
    const currentProbs = await this.opinionMarketService.getOutcomeProbabilities(BigInt(marketId));

    // Calculate shares received using AMM formula
    // For simplicity, we'll estimate: shares ≈ betAmount / currentPrice
    const betAmountInUnits = BigInt(betAmount) * BigInt(1e6);
    const totalShares = BigInt(marketInfo.totalYesShares) + BigInt(marketInfo.totalNoShares);

    let expectedShares: bigint;
    let newYesShares = BigInt(marketInfo.totalYesShares);
    let newNoShares = BigInt(marketInfo.totalNoShares);

    if (outcome === 'YES') {
      // Buying YES shares increases YES shares in the pool
      expectedShares = betAmountInUnits; // Simplified: 1 USDC = 1 share
      newYesShares += expectedShares;
    } else {
      // Buying NO shares increases NO shares in the pool
      expectedShares = betAmountInUnits;
      newNoShares += expectedShares;
    }

    // Calculate new probabilities
    const newTotalShares = newYesShares + newNoShares;
    const newYesProbability = newTotalShares > BigInt(0)
      ? Number((newNoShares * BigInt(10000)) / newTotalShares) / 100
      : 50;
    const newNoProbability = 100 - newYesProbability;

    const pricePerShare = betAmountInUnits / expectedShares;

    return new MarketPriceQuoteDto({
      marketId,
      outcome,
      betAmount: betAmount.toString(),
      expectedShares: this.formatUSDC(expectedShares),
      pricePerShare: this.formatUSDC(pricePerShare * BigInt(1e6)),
      currentProbability: outcome === 'YES' ? currentProbs.yesProbability : currentProbs.noProbability,
      newProbability: outcome === 'YES' ? newYesProbability : newNoProbability,
    });
  }

  /**
   * Get all positions for a market
   */
  async getMarketPositions(
    marketId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<MarketPositionDto[]> {
    const market = await this.opinionMarketRepository.findOne({
      where: { marketId },
    });

    if (!market) {
      throw new NotFoundException(`Market with ID ${marketId} not found`);
    }

    const positions = await this.marketPositionRepository.find({
      where: { opinionMarket: { marketId } },
      order: { lastUpdated: 'DESC' },
      take: limit,
      skip: offset,
    });

    const marketInfo = await this.opinionMarketService.getMarketInfo(BigInt(marketId));
    const probabilities = await this.opinionMarketService.getOutcomeProbabilities(BigInt(marketId));

    const positionDtos: MarketPositionDto[] = [];

    for (const position of positions) {
      // Try to find user by wallet address
      const user = await this.userRepository.findOne({
        where: { walletAddress: position.userAddress.toLowerCase() },
      });

      const yesShares = BigInt(position.yesShares);
      const noShares = BigInt(position.noShares);
      const totalInvested = BigInt(position.totalInvested);

      // Calculate current value and claimable winnings
      let currentValue = BigInt(0);
      let claimableWinnings: string | undefined;

      if (marketInfo.resolved) {
        // Market resolved
        const winningShares = marketInfo.winningOutcome ? yesShares : noShares;
        const totalWinningShares = marketInfo.winningOutcome
          ? BigInt(marketInfo.totalYesShares)
          : BigInt(marketInfo.totalNoShares);

        if (totalWinningShares > BigInt(0)) {
          claimableWinnings = this.formatUSDC(
            (winningShares * BigInt(marketInfo.liquidityPool)) / totalWinningShares,
          );
          currentValue = BigInt(claimableWinnings.replace('.', '').padEnd(6, '0'));
        }
      } else {
        // Market active - estimate current value based on probabilities
        currentValue =
          (yesShares * BigInt(Math.floor(probabilities.yesProbability * 100)) +
            noShares * BigInt(Math.floor(probabilities.noProbability * 100))) /
          BigInt(100);
      }

      const profitLoss = currentValue - totalInvested;

      positionDtos.push({
        id: position.id,
        userAddress: position.userAddress,
        userHandle: user?.twitterHandle,
        yesShares: this.formatUSDC(yesShares),
        noShares: this.formatUSDC(noShares),
        totalInvested: this.formatUSDC(totalInvested),
        currentValue: this.formatUSDC(currentValue),
        profitLoss: this.formatUSDC(profitLoss),
        claimableWinnings,
        lastUpdated: position.lastUpdated,
      });
    }

    return positionDtos;
  }

  /**
   * Get trading history for a market
   */
  async getMarketTrades(
    marketId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<MarketTradeDto[]> {
    const market = await this.opinionMarketRepository.findOne({
      where: { marketId },
    });

    if (!market) {
      throw new NotFoundException(`Market with ID ${marketId} not found`);
    }

    const trades = await this.marketTradeRepository.find({
      where: { opinionMarket: { marketId } },
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });

    const tradeDtos: MarketTradeDto[] = [];

    for (const trade of trades) {
      // Try to find user by wallet address
      const user = await this.userRepository.findOne({
        where: { walletAddress: trade.userAddress.toLowerCase() },
      });

      const amount = BigInt(trade.amount);
      const shares = BigInt(trade.sharesPurchased);
      const pricePerShare = shares > BigInt(0) ? amount / shares : BigInt(0);

      tradeDtos.push({
        id: trade.id,
        traderAddress: trade.userAddress,
        traderHandle: user?.twitterHandle,
        outcome: trade.outcome,
        amount: this.formatUSDC(amount),
        sharesPurchased: this.formatUSDC(shares),
        pricePerShare: this.formatUSDC(pricePerShare),
        transactionHash: trade.transactionHash,
        blockNumber: trade.blockNumber,
        timestamp: trade.timestamp,
      });
    }

    return tradeDtos;
  }

  /**
   * Get trending markets by 24h volume
   */
  async getTrendingMarkets(limit: number = 10): Promise<TrendingMarketDto[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const markets = await this.opinionMarketRepository.find({
      relations: ['creator', 'creator.user'],
      order: { createdAt: 'DESC' },
    });

    const trending: TrendingMarketDto[] = [];

    for (const market of markets) {
      // Get 24h trades
      const trades24h = await this.marketTradeRepository.find({
        where: {
          opinionMarket: { marketId: market.marketId },
          timestamp: MoreThan(oneDayAgo),
        },
      });

      if (trades24h.length === 0) continue;

      // Calculate 24h volume
      let volume24h = BigInt(0);
      const uniqueTraders = new Set<string>();

      for (const trade of trades24h) {
        volume24h += BigInt(trade.amount);
        uniqueTraders.add(trade.userAddress.toLowerCase());
      }

      // Get market info
      const marketInfo = await this.opinionMarketService.getMarketInfo(BigInt(market.marketId));
      if (marketInfo.resolved || marketInfo.cancelled) continue;

      const probabilities = await this.opinionMarketService.getOutcomeProbabilities(
        BigInt(market.marketId),
      );

      // Calculate time remaining
      const now = Date.now();
      const endTime = market.endTime.getTime();
      const hoursRemaining = Math.max(0, Math.floor((endTime - now) / (1000 * 60 * 60)));

      trending.push({
        marketId: market.marketId,
        question: market.question,
        creatorAddress: market.creatorAddress,
        creatorHandle: market.creator.user.twitterHandle,
        volume24h: this.formatUSDC(volume24h),
        traders24h: uniqueTraders.size,
        yesProbability: probabilities.yesProbability,
        totalLiquidity: this.formatUSDC(BigInt(marketInfo.liquidityPool)),
        endTime: market.endTime,
        hoursRemaining,
      });
    }

    // Sort by 24h volume (descending)
    trending.sort((a, b) => parseFloat(b.volume24h) - parseFloat(a.volume24h));

    return trending.slice(0, limit);
  }

  /**
   * Helper: Build market response DTO
   */
  private async buildMarketResponse(market: OpinionMarket): Promise<MarketResponseDto> {
    // Get on-chain market info
    const marketInfo = await this.opinionMarketService.getMarketInfo(BigInt(market.marketId));
    const probabilities = await this.opinionMarketService.getOutcomeProbabilities(
      BigInt(market.marketId),
    );

    // Calculate total volume
    const totalVolume = await this.marketTradeRepository
      .createQueryBuilder('trade')
      .select('SUM(trade.amount)', 'total')
      .where('trade.opinionMarketMarketId = :marketId', { marketId: market.marketId })
      .getRawOne();

    // Count unique participants
    const participantCount = await this.marketTradeRepository
      .createQueryBuilder('trade')
      .select('COUNT(DISTINCT trade.userAddress)', 'count')
      .where('trade.opinionMarketMarketId = :marketId', { marketId: market.marketId })
      .getRawOne();

    const status = marketInfo.resolved
      ? 'RESOLVED'
      : marketInfo.cancelled
      ? 'CANCELLED'
      : 'ACTIVE';

    return new MarketResponseDto({
      marketId: market.marketId,
      creatorAddress: market.creatorAddress,
      creatorHandle: market.creator.user.twitterHandle,
      creatorName: market.creator.user.displayName,
      question: market.question,
      description: market.description,
      category: market.category,
      endTime: market.endTime,
      liquidityPool: this.formatUSDC(BigInt(marketInfo.liquidityPool)),
      yesProbability: probabilities.yesProbability,
      noProbability: probabilities.noProbability,
      totalYesShares: this.formatUSDC(BigInt(marketInfo.totalYesShares)),
      totalNoShares: this.formatUSDC(BigInt(marketInfo.totalNoShares)),
      status,
      resolved: marketInfo.resolved,
      winningOutcome: marketInfo.resolved ? marketInfo.winningOutcome : undefined,
      cancelled: marketInfo.cancelled,
      totalVolume: this.formatUSDC(BigInt(totalVolume.total || '0')),
      participantCount: parseInt(participantCount.count) || 0,
      createdAt: market.createdAt,
    });
  }

  /**
   * Helper: Format USDC amount
   */
  private formatUSDC(amount: bigint): string {
    const formatted = amount.toString().padStart(7, '0');
    const dollars = formatted.slice(0, -6) || '0';
    const cents = formatted.slice(-6);
    return `${dollars}.${cents}`;
  }
}
