import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Market } from '../../database/entities/market.entity';
import { Outcome } from '../../database/entities/outcome.entity';
import { Position } from '../../database/entities/position.entity';
import { Trade } from '../../database/entities/trade.entity';
import { Creator } from '../../database/entities/creator.entity';
import { MarketStatus } from '../../database/enums';
import {
  CreateMarketDto,
  MarketFiltersDto,
  TradeMarketDto,
  MarketResponseDto,
  MarketListResponseDto,
  CreateMarketResponseDto,
  PositionResponseDto,
  UserPositionsResponseDto,
  TradeResponseDto,
  TradeListResponseDto,
  UnsignedTransactionResponseDto,
  MarketSortBy,
} from './dto';
import { OpinionMarketService } from '../../contracts/opinion-market.service';

@Injectable()
export class MarketsService {
  private readonly logger = new Logger(MarketsService.name);

  constructor(
    @InjectRepository(Market)
    private readonly marketRepository: Repository<Market>,
    @InjectRepository(Outcome)
    private readonly outcomeRepository: Repository<Outcome>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    private readonly opinionMarketService: OpinionMarketService,
  ) {}

  /**
   * Create a new market
   */
  async createMarket(
    creatorId: string,
    createDto: CreateMarketDto,
  ): Promise<CreateMarketResponseDto> {
    this.logger.log(`Creating market for creator ${creatorId}`);

    // Validate creator exists and is approved
    const creator = await this.creatorRepository.findOne({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Validate outcomes sum to 100
    const totalProbability = createDto.outcomes.reduce(
      (sum, outcome) => sum + outcome.initialProbability,
      0,
    );

    if (totalProbability !== 100) {
      throw new BadRequestException(
        'Sum of outcome probabilities must equal 100',
      );
    }

    // Calculate end time
    const endTime = new Date(Date.now() + createDto.duration * 1000);

    // Create market in database first
    const market = this.marketRepository.create({
      title: createDto.title,
      description: createDto.description,
      category: createDto.category,
      creatorId,
      duration: createDto.duration,
      endTime,
      resolutionCriteria: createDto.resolutionCriteria,
      evidenceLinks: createDto.evidenceLinks,
      tags: createDto.tags,
      status: MarketStatus.ACTIVE,
    });

    const savedMarket = await this.marketRepository.save(market);

    // Create outcomes
    const outcomes = createDto.outcomes.map((outcomeDto, index) =>
      this.outcomeRepository.create({
        marketId: savedMarket.id,
        outcomeIndex: index,
        text: outcomeDto.text,
        initialProbability: outcomeDto.initialProbability.toString(),
        currentProbability: outcomeDto.initialProbability.toString(),
      }),
    );

    await this.outcomeRepository.save(outcomes);

    // TODO: Create market on blockchain
    // For now, just save to database without blockchain deployment
    // The blockchain integration will be added in a future update
    this.logger.log(
      `Market created in database: ${savedMarket.id} (blockchain deployment pending)`,
    );

    // Load complete market with relations
    const completeMarket = await this.getMarketById(savedMarket.id);

    return {
      marketId: savedMarket.id,
      contractAddress: savedMarket.contractAddress ?? undefined,
      txHash: savedMarket.txHash ?? undefined,
      market: completeMarket,
    };
  }

  /**
   * Get markets with filters and pagination
   */
  async getMarkets(
    filters: MarketFiltersDto,
  ): Promise<MarketListResponseDto> {
    const {
      status,
      category,
      creatorId,
      search,
      sort = MarketSortBy.CREATED_AT,
      order = 'DESC',
      page = 1,
      limit = 10,
    } = filters;

    const queryBuilder = this.marketRepository
      .createQueryBuilder('market')
      .leftJoinAndSelect('market.creator', 'creator')
      .leftJoinAndSelect('creator.user', 'user')
      .leftJoinAndSelect('market.outcomes', 'outcomes');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('market.status = :status', { status });
    }

    if (category) {
      queryBuilder.andWhere('market.category = :category', { category });
    }

    if (creatorId) {
      queryBuilder.andWhere('market.creatorId = :creatorId', { creatorId });
    }

    if (search) {
      queryBuilder.andWhere(
        '(market.title ILIKE :search OR market.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`market.${sort}`, order);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [markets, total] = await queryBuilder.getManyAndCount();

    return {
      markets: markets.map((market) => this.mapToResponseDto(market)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get market by ID with full details
   */
  async getMarketById(id: string): Promise<MarketResponseDto> {
    const market = await this.marketRepository.findOne({
      where: { id },
      relations: ['creator', 'creator.user', 'outcomes'],
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    return this.mapToResponseDto(market);
  }

  /**
   * Get user's position in a market
   */
  async getUserPosition(
    marketId: string,
    walletAddress: string,
  ): Promise<UserPositionsResponseDto> {
    const market = await this.marketRepository.findOne({
      where: { id: marketId },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    const positions = await this.positionRepository.find({
      where: { marketId, walletAddress },
      relations: ['outcome'],
    });

    let totalValue = 0;
    let totalCostBasis = 0;
    let realizedPnl = 0;

    const positionDtos = positions.map((position) => {
      const shares = parseFloat(position.shares);
      const costBasis = parseFloat(position.costBasis);
      const avgPrice = parseFloat(position.averagePrice);

      totalCostBasis += costBasis;
      realizedPnl += parseFloat(position.realizedPnl);

      // Calculate current value based on current probability
      const currentPrice =
        parseFloat(position.outcome.currentProbability) / 100;
      const currentValue = shares * currentPrice;
      totalValue += currentValue;

      return {
        id: position.id,
        marketId: position.marketId,
        userId: position.userId,
        outcomeId: position.outcomeId,
        outcome: {
          id: position.outcome.id,
          marketId: position.outcome.marketId,
          outcomeIndex: position.outcome.outcomeIndex,
          text: position.outcome.text,
          initialProbability: position.outcome.initialProbability,
          currentProbability: position.outcome.currentProbability,
          totalShares: position.outcome.totalShares,
          totalStaked: position.outcome.totalStaked,
          createdAt: position.outcome.createdAt.toISOString(),
          updatedAt: position.outcome.updatedAt.toISOString(),
        },
        walletAddress: position.walletAddress,
        shares: position.shares,
        costBasis: position.costBasis,
        averagePrice: position.averagePrice,
        realizedPnl: position.realizedPnl,
        claimed: position.claimed,
        claimedAmount: position.claimedAmount ?? undefined,
        claimedAt: position.claimedAt?.toISOString(),
        createdAt: position.createdAt.toISOString(),
        updatedAt: position.updatedAt.toISOString(),
      };
    });

    const unrealizedPnl = totalValue - totalCostBasis;

    return {
      positions: positionDtos,
      totalValue: totalValue.toFixed(6),
      totalCostBasis: totalCostBasis.toFixed(6),
      unrealizedPnl: unrealizedPnl.toFixed(6),
      realizedPnl: realizedPnl.toFixed(6),
    };
  }

  /**
   * Get market trades
   */
  async getMarketTrades(
    marketId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<TradeListResponseDto> {
    const market = await this.marketRepository.findOne({
      where: { id: marketId },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    const skip = (page - 1) * limit;

    const [trades, total] = await this.tradeRepository.findAndCount({
      where: { marketId },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      trades: trades.map((trade) => ({
        id: trade.id,
        marketId: trade.marketId,
        userId: trade.userId,
        outcomeId: trade.outcomeId,
        walletAddress: trade.walletAddress,
        action: trade.action as any, // TradeAction and TradeActionResponse have same values
        shares: trade.shares,
        amount: trade.amount,
        price: trade.price,
        fee: trade.fee,
        txHash: trade.txHash ?? undefined,
        blockNumber: trade.blockNumber ?? undefined,
        blockTimestamp: trade.blockTimestamp?.toISOString(),
        createdAt: trade.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Prepare trade transaction (returns unsigned tx)
   */
  async prepareTrade(
    marketId: string,
    userId: string,
    walletAddress: string,
    tradeDto: TradeMarketDto,
  ): Promise<UnsignedTransactionResponseDto> {
    const market = await this.marketRepository.findOne({
      where: { id: marketId },
      relations: ['outcomes'],
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    if (market.status !== MarketStatus.ACTIVE) {
      throw new BadRequestException('Market is not active');
    }

    if (new Date() > market.endTime) {
      throw new BadRequestException('Market has ended');
    }

    const outcome = market.outcomes.find(
      (o) => o.outcomeIndex === tradeDto.outcome,
    );

    if (!outcome) {
      throw new BadRequestException('Invalid outcome index');
    }

    // Calculate expected shares and fee
    // This is simplified - you'd use AMM formulas in production
    const amount = parseFloat(tradeDto.amount);
    const currentPrice = parseFloat(outcome.currentProbability) / 100;
    const fee = amount * 0.02; // 2% fee
    const amountAfterFee = amount - fee;

    let expectedShares: number;
    let priceImpact: number;

    if (tradeDto.action === 'buy') {
      expectedShares = amountAfterFee / currentPrice;
      priceImpact = 0.5; // Simplified - calculate based on liquidity
    } else {
      // For sell, user is selling shares
      expectedShares = parseFloat(tradeDto.amount); // amount is in shares for sell
      priceImpact = 0.5;
    }

    // Build unsigned transaction
    // TODO: Get contract address from OpinionMarketService when method is available
    const unsignedTx = {
      to: market.contractAddress || '0x0000000000000000000000000000000000000000',
      data: this.buildTradeCalldata(marketId, tradeDto),
      value: '0', // USDC is ERC20, not native token
    };

    return {
      unsignedTx,
      expectedShares: expectedShares.toFixed(6),
      fee: fee.toFixed(6),
      priceImpact: priceImpact.toFixed(2),
    };
  }

  /**
   * Prepare claim transaction (returns unsigned tx)
   */
  async prepareClaim(
    marketId: string,
    userId: string,
    walletAddress: string,
  ): Promise<UnsignedTransactionResponseDto> {
    const market = await this.marketRepository.findOne({
      where: { id: marketId },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    if (market.status !== MarketStatus.RESOLVED) {
      throw new BadRequestException('Market is not resolved');
    }

    // Get user's winning position
    const positions = await this.positionRepository.find({
      where: {
        marketId,
        walletAddress,
        claimed: false,
      },
      relations: ['outcome'],
    });

    const winningPosition = positions.find(
      (p) => p.outcome.outcomeIndex === market.winningOutcomeIndex,
    );

    if (!winningPosition) {
      throw new BadRequestException('No winning position to claim');
    }

    const winnings = parseFloat(winningPosition.shares);

    // Build unsigned transaction
    // TODO: Get contract address from OpinionMarketService when method is available
    const unsignedTx = {
      to: market.contractAddress || '0x0000000000000000000000000000000000000000',
      data: this.buildClaimCalldata(marketId),
      value: '0',
    };

    return {
      unsignedTx,
      expectedShares: '0',
      fee: '0',
      priceImpact: '0',
    };
  }

  /**
   * Helper: Map entity to response DTO
   */
  private mapToResponseDto(market: Market): MarketResponseDto {
    return {
      id: market.id,
      title: market.title,
      description: market.description,
      category: market.category,
      status: market.status,
      contractAddress: market.contractAddress ?? undefined,
      txHash: market.txHash ?? undefined,
      creatorId: market.creatorId,
      creator: market.creator
        ? {
            id: market.creator.id,
            twitterHandle: market.creator.twitterHandle,
            user: market.creator.user
              ? {
                  displayName: market.creator.user.displayName,
                  profilePictureUrl: market.creator.user.profilePictureUrl,
                }
              : undefined,
          }
        : undefined,
      endTime: market.endTime.toISOString(),
      duration: market.duration,
      resolutionCriteria: market.resolutionCriteria ?? undefined,
      evidenceLinks: market.evidenceLinks ?? undefined,
      tags: market.tags ?? undefined,
      totalVolume: market.totalVolume,
      totalLiquidity: market.totalLiquidity,
      participantCount: market.participantCount,
      tradeCount: market.tradeCount,
      winningOutcomeIndex: market.winningOutcomeIndex ?? undefined,
      resolvedAt: market.resolvedAt?.toISOString(),
      createdAt: market.createdAt.toISOString(),
      updatedAt: market.updatedAt.toISOString(),
      outcomes: market.outcomes?.map((outcome) => ({
        id: outcome.id,
        marketId: outcome.marketId,
        outcomeIndex: outcome.outcomeIndex,
        text: outcome.text,
        initialProbability: outcome.initialProbability,
        currentProbability: outcome.currentProbability,
        totalShares: outcome.totalShares,
        totalStaked: outcome.totalStaked,
        createdAt: outcome.createdAt.toISOString(),
        updatedAt: outcome.updatedAt.toISOString(),
      })),
    };
  }

  /**
   * Helper: Build trade calldata
   */
  private buildTradeCalldata(marketId: string, tradeDto: TradeMarketDto): string {
    // This would use ethers.js to encode the function call
    // Placeholder for now
    return '0x';
  }

  /**
   * Helper: Build claim calldata
   */
  private buildClaimCalldata(marketId: string): string {
    // This would use ethers.js to encode the function call
    // Placeholder for now
    return '0x';
  }
}
