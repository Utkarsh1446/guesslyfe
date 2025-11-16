import { CreatorStatus } from "../../database/enums";
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { OpinionMarket } from '../../database/entities/opinion-market.entity';
import { MarketPosition } from '../../database/entities/market-position.entity';
import { MarketTrade } from '../../database/entities/market-trade.entity';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { OpinionMarketService } from '../../contracts/opinion-market.service';
import { ContractsService } from '../../contracts/contracts.service';
import {
  MarketResponseDto,
  MarketPriceQuoteDto,
  MarketPositionDto,
  MarketTradeDto,
  TrendingMarketDto,
} from './dto/market-response.dto';
import { CreateMarketDto, CreateMarketResponseDto } from './dto/create-market.dto';
import { TradeMarketDto, TradeMarketResponseDto, ClaimWinningsDto, ClaimWinningsResponseDto } from './dto/trade-market.dto';
import { MarketActivityDto, UserPositionResponseDto } from './dto/market-activity.dto';

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
    private readonly contractsService: ContractsService,
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
      where: { marketId: BigInt(marketId) },
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
    // Validate bet amount
    if (betAmount <= 0) {
      throw new BadRequestException('Bet amount must be greater than 0');
    }

    const market = await this.opinionMarketRepository.findOne({
      where: { marketId: BigInt(marketId) },
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
    const totalShares = BigInt(marketInfo.yesShares) + BigInt(marketInfo.noShares);

    let expectedShares: bigint;
    let newYesShares = BigInt(marketInfo.yesShares);
    let newNoShares = BigInt(marketInfo.noShares);

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

    const pricePerShare = expectedShares > BigInt(0)
      ? betAmountInUnits / expectedShares
      : BigInt(0);

    return new MarketPriceQuoteDto({
      marketId,
      outcome,
      betAmount: betAmount.toString(),
      expectedShares: this.contractsService.formatUSDC(expectedShares),
      pricePerShare: this.contractsService.formatUSDC(pricePerShare * BigInt(1e6)),
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
      where: { marketId: BigInt(marketId) },
    });

    if (!market) {
      throw new NotFoundException(`Market with ID ${marketId} not found`);
    }

    const positions = await this.marketPositionRepository.find({
      where: { opinionMarket: { marketId: BigInt(marketId) } },
      order: { updatedAt: 'DESC' },
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
          ? BigInt(marketInfo.yesShares)
          : BigInt(marketInfo.noShares);

        if (totalWinningShares > BigInt(0)) {
          const winningsAmount = (winningShares * BigInt(marketInfo.liquidityPool)) / totalWinningShares;
          claimableWinnings = this.contractsService.formatUSDC(winningsAmount);
          currentValue = winningsAmount; // Use the BigInt directly, not the formatted string
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
        yesShares: this.contractsService.formatUSDC(yesShares),
        noShares: this.contractsService.formatUSDC(noShares),
        totalInvested: this.contractsService.formatUSDC(totalInvested),
        currentValue: this.contractsService.formatUSDC(currentValue),
        profitLoss: this.contractsService.formatUSDC(profitLoss),
        claimableWinnings,
        lastUpdated: position.updatedAt,
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
      where: { marketId: BigInt(marketId) },
    });

    if (!market) {
      throw new NotFoundException(`Market with ID ${marketId} not found`);
    }

    const trades = await this.marketTradeRepository.find({
      where: { opinionMarket: { marketId: BigInt(marketId) } },
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
        outcome: trade.outcome === 1,
        amount: this.contractsService.formatUSDC(amount),
        sharesPurchased: this.contractsService.formatUSDC(shares),
        pricePerShare: this.contractsService.formatUSDC(pricePerShare),
        transactionHash: trade.transactionHash || "",
        blockNumber: 0, // TODO: Add blockNumber to MarketTrade entity when blockchain integration is complete
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
      // Note: Using marketId column directly instead of relation since MarketTrade has marketId as a direct column
      const trades24h = await this.marketTradeRepository
        .createQueryBuilder('trade')
        .where('trade.marketId = :marketId', { marketId: market.id })
        .andWhere('trade.timestamp > :oneDayAgo', { oneDayAgo })
        .getMany();

      if (trades24h.length === 0) continue;

      // Calculate 24h volume
      let volume24h = BigInt(0);
      const uniqueTraders = new Set<string>();

      for (const trade of trades24h) {
        volume24h += BigInt(trade.amount);
        uniqueTraders.add(trade.userAddress.toLowerCase());
      }

      // Skip if marketId or creatorAddress is null
      if (!market.marketId || !market.creatorAddress) continue;

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
        marketId: market.marketId.toString(),
        question: market.question,
        creatorAddress: market.creatorAddress,
        creatorHandle: market.creator.user.twitterHandle,
        volume24h: this.contractsService.formatUSDC(volume24h),
        traders24h: uniqueTraders.size,
        yesProbability: probabilities.yesProbability,
        totalLiquidity: this.contractsService.formatUSDC(BigInt(marketInfo.liquidityPool)),
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
    if (!market.marketId) {
      throw new Error('Market has no marketId');
    }

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
      marketId: market.marketId.toString(),
      creatorAddress: market.creatorAddress || '',
      creatorHandle: market.creator.user.twitterHandle,
      creatorName: market.creator.user.displayName,
      question: market.question,
      description: market.description ?? undefined,
      category: market.category ?? undefined,
      endTime: market.endTime,
      liquidityPool: this.contractsService.formatUSDC(BigInt(marketInfo.liquidityPool)),
      yesProbability: probabilities.yesProbability,
      noProbability: probabilities.noProbability,
      totalYesShares: this.contractsService.formatUSDC(BigInt(marketInfo.yesShares)),
      totalNoShares: this.contractsService.formatUSDC(BigInt(marketInfo.noShares)),
      status,
      resolved: marketInfo.resolved,
      winningOutcome: marketInfo.resolved && marketInfo.winningOutcome !== null ? marketInfo.winningOutcome : undefined,
      cancelled: marketInfo.cancelled,
      totalVolume: this.contractsService.formatUSDC(BigInt(totalVolume.total || '0')),
      participantCount: parseInt(participantCount.count) || 0,
      createdAt: market.createdAt,
    });
  }

  /**
   * Create a new prediction market (Creator only)
   */
  async createMarket(
    creatorAddress: string,
    createDto: CreateMarketDto,
  ): Promise<CreateMarketResponseDto> {
    // Validate creator exists and is approved
    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (creator.status !== CreatorStatus.APPROVED) {
      throw new ForbiddenException('Creator is not approved to create markets');
    }

    // Validate outcomes sum to 100%
    const totalProbability = createDto.outcomes.reduce((sum, outcome) => sum + outcome.initialProbability, 0);
    if (Math.abs(totalProbability - 100) > 0.01) {
      throw new BadRequestException('Outcome probabilities must sum to 100%');
    }

    // For binary markets (YES/NO), we only support 2 outcomes
    if (createDto.outcomes.length !== 2) {
      throw new BadRequestException('Currently only binary (YES/NO) markets are supported (2 outcomes)');
    }

    // TODO: Implement getOpinionMarketContract and getContractAddress in ContractsService
    throw new BadRequestException('Market creation not yet implemented - missing contract methods');

    // Calculate end time
    // const endTime = new Date(Date.now() + createDto.duration * 1000);

    // Get OpinionMarket contract
    // const opinionMarketContract = await this.contractsService.getOpinionMarketContract();

    // Note: Virtual Liquidity is handled automatically by the smart contract
    // The contract uses 5000 USDC virtual reserves per outcome for price calculations
    // but these are not included in payouts

    // Encode function call: createMarket(string question, string description, uint256 duration)
    // const durationInSeconds = BigInt(createDto.duration);
    // const data = opinionMarketContract.interface.encodeFunctionData('createMarket', [
    //   createDto.title,
    //   createDto.description,
    //   durationInSeconds,
    // ]);

    // For now, we return an instruction for the creator to call the contract directly
    // In a production system, this would be done via backend wallet or unsigned transaction
    // Since this is a creator-only action, we'll simulate the contract call for testing

    // Simulate getting next market ID
    // const existingMarkets = await this.opinionMarketRepository.count();
    // const nextMarketId = (existingMarkets + 1).toString();

    // Save market to database
    // const market = this.opinionMarketRepository.create({
    //   creatorAddress: creatorAddress.toLowerCase(),
    //   creator,
    //   question: createDto.title,
    //   description: createDto.description,
    //   category: createDto.category,
    //   endTime,
    //   createdAt: new Date(),
    // });

    // await this.opinionMarketRepository.save(market);

    // return new CreateMarketResponseDto({
    //   marketId: nextMarketId,
    //   contractAddress: await this.contractsService.getContractAddress('OpinionMarket'),
    //   txHash: '0x0000000000000000000000000000000000000000000000000000000000000000', // Placeholder
    //   blockNumber: 0, // Placeholder - in production this would come from blockchain
    //   endTime,
    //   success: true,
    //   message: 'Market created successfully. Note: In production, this would trigger an on-chain transaction.',
    // });

    // TODO: Implement market creation when contract methods are available
    throw new BadRequestException('Market creation not yet implemented - missing contract methods');
  }

  /**
   * Get specific user position in a market
   */
  async getUserPosition(marketId: string, userAddress: string): Promise<UserPositionResponseDto> {
    const market = await this.opinionMarketRepository.findOne({
      where: { marketId: BigInt(marketId) },
    });

    if (!market) {
      throw new NotFoundException(`Market with ID ${marketId} not found`);
    }

    // Find user position
    const position = await this.marketPositionRepository.findOne({
      where: {
        opinionMarket: { marketId: BigInt(marketId) },
        userAddress: userAddress.toLowerCase(),
      },
    });

    if (!position) {
      // Return empty position if user hasn't traded
      return new UserPositionResponseDto({
        marketId,
        userAddress: userAddress.toLowerCase(),
        yesShares: '0.000000',
        noShares: '0.000000',
        totalInvested: '0.000000',
        currentValue: '0.000000',
        profitLoss: '0.000000',
        profitLossPercentage: 0,
        marketStatus: 'ACTIVE',
      });
    }

    // Get market info from blockchain
    const marketInfo = await this.opinionMarketService.getMarketInfo(BigInt(marketId));
    const probabilities = await this.opinionMarketService.getOutcomeProbabilities(BigInt(marketId));

    const yesShares = BigInt(position.yesShares);
    const noShares = BigInt(position.noShares);
    const totalInvested = BigInt(position.totalInvested);

    // Calculate current value and claimable winnings
    let currentValue = BigInt(0);
    let claimableWinnings: string | undefined;

    const status = marketInfo.resolved ? 'RESOLVED' : marketInfo.cancelled ? 'CANCELLED' : 'ACTIVE';

    if (marketInfo.resolved) {
      // Market resolved
      const winningShares = marketInfo.winningOutcome ? yesShares : noShares;
      const totalWinningShares = marketInfo.winningOutcome
        ? BigInt(marketInfo.yesShares)
        : BigInt(marketInfo.noShares);

      if (totalWinningShares > BigInt(0)) {
        const winningsAmount = (winningShares * BigInt(marketInfo.liquidityPool)) / totalWinningShares;
        claimableWinnings = this.contractsService.formatUSDC(winningsAmount);
        currentValue = winningsAmount;
      }
    } else {
      // Market active - estimate current value based on probabilities
      currentValue =
        (yesShares * BigInt(Math.floor(probabilities.yesProbability * 100)) +
          noShares * BigInt(Math.floor(probabilities.noProbability * 100))) /
        BigInt(100);
    }

    const profitLoss = currentValue - totalInvested;
    const profitLossPercentage =
      totalInvested > BigInt(0) ? (Number(profitLoss) / Number(totalInvested)) * 100 : 0;

    return new UserPositionResponseDto({
      marketId,
      userAddress: userAddress.toLowerCase(),
      yesShares: this.contractsService.formatUSDC(yesShares),
      noShares: this.contractsService.formatUSDC(noShares),
      totalInvested: this.contractsService.formatUSDC(totalInvested),
      currentValue: this.contractsService.formatUSDC(currentValue),
      profitLoss: this.contractsService.formatUSDC(profitLoss),
      profitLossPercentage,
      claimableWinnings,
      marketStatus: status,
    });
  }

  /**
   * Prepare unsigned transaction for placing a bet
   */
  async prepareTrade(tradeDto: TradeMarketDto, userAddress: string): Promise<TradeMarketResponseDto> {
    const { marketId, outcome, amount, minShares } = tradeDto;

    const market = await this.opinionMarketRepository.findOne({
      where: { marketId: BigInt(marketId) },
    });

    if (!market) {
      throw new NotFoundException(`Market with ID ${marketId} not found`);
    }

    // Get current market info from blockchain
    const marketInfo = await this.opinionMarketService.getMarketInfo(BigInt(marketId));

    if (marketInfo.resolved || marketInfo.cancelled) {
      throw new BadRequestException('Market is not active');
    }

    // Get price quote
    const priceQuote = await this.getBetPriceQuote(marketId, outcome ? 'YES' : 'NO', amount);

    // Validate slippage protection
    const expectedShares = parseFloat(priceQuote.expectedShares);
    const minSharesNum = parseFloat(minShares);

    if (expectedShares < minSharesNum) {
      throw new BadRequestException(
        `Expected shares ${expectedShares} is less than minimum ${minSharesNum} (slippage protection)`,
      );
    }

    // TODO: Implement getOpinionMarketContract and getContractAddress in ContractsService
    throw new BadRequestException('Bet transaction building not yet implemented - missing contract methods');

    // Get OpinionMarket contract
    // const opinionMarketContract = await this.contractsService.getOpinionMarketContract();

    // Encode function call: bet(uint256 marketId, bool outcome, uint256 amount)
    // const betAmountInUnits = BigInt(amount) * BigInt(1e6);
    // const data = opinionMarketContract.interface.encodeFunctionData('bet', [
    //   BigInt(marketId),
    //   outcome,
    //   betAmountInUnits,
    // ]);

    // const unsignedTx = {
    //   to: await this.contractsService.getContractAddress('OpinionMarket'),
    //   data,
    //   value: '0',
    //   gasLimit: '400000',
    //   description: `Bet ${amount} USDC on ${outcome ? 'YES' : 'NO'} for market ${marketId}`,
    // };

    // return new TradeMarketResponseDto({
    //   unsignedTx,
    //   expectedShares: priceQuote.expectedShares,
    //   marketId,
    //   outcome,
    //   amount: amount.toString(),
    //   currentProbability: priceQuote.currentProbability,
    //   newProbability: priceQuote.newProbability,
    // });
  }

  /**
   * Prepare unsigned transaction for claiming winnings
   */
  async prepareClaim(claimDto: ClaimWinningsDto, userAddress: string): Promise<ClaimWinningsResponseDto> {
    const { marketId } = claimDto;

    const market = await this.opinionMarketRepository.findOne({
      where: { marketId: BigInt(marketId) },
    });

    if (!market) {
      throw new NotFoundException(`Market with ID ${marketId} not found`);
    }

    // Get market info from blockchain
    const marketInfo = await this.opinionMarketService.getMarketInfo(BigInt(marketId));

    if (!marketInfo.resolved) {
      throw new BadRequestException('Market is not yet resolved');
    }

    // Find user position
    const position = await this.marketPositionRepository.findOne({
      where: {
        opinionMarket: { marketId: BigInt(marketId) },
        userAddress: userAddress.toLowerCase(),
      },
    });

    if (!position) {
      throw new NotFoundException('No position found for this user in this market');
    }

    const yesShares = BigInt(position.yesShares);
    const noShares = BigInt(position.noShares);

    // Calculate winnings
    const winningShares = marketInfo.winningOutcome ? yesShares : noShares;

    if (winningShares === BigInt(0)) {
      throw new BadRequestException('You have no winning shares to claim');
    }

    const totalWinningShares = marketInfo.winningOutcome
      ? BigInt(marketInfo.yesShares)
      : BigInt(marketInfo.noShares);

    const winningsAmount =
      totalWinningShares > BigInt(0)
        ? (winningShares * BigInt(marketInfo.liquidityPool)) / totalWinningShares
        : BigInt(0);

    if (winningsAmount === BigInt(0)) {
      throw new BadRequestException('No winnings to claim');
    }

    // TODO: Implement getOpinionMarketContract and getContractAddress in ContractsService
    throw new BadRequestException('Claim winnings transaction building not yet implemented - missing contract methods');

    // Get OpinionMarket contract
    // const opinionMarketContract = await this.contractsService.getOpinionMarketContract();

    // Encode function call: claimWinnings(uint256 marketId)
    // const data = opinionMarketContract.interface.encodeFunctionData('claimWinnings', [BigInt(marketId)]);

    // const unsignedTx = {
    //   to: await this.contractsService.getContractAddress('OpinionMarket'),
    //   data,
    //   value: '0',
    //   gasLimit: '300000',
    //   description: `Claim ${this.contractsService.formatUSDC(winningsAmount)} USDC winnings from market ${marketId}`,
    // };

    // return new ClaimWinningsResponseDto({
    //   unsignedTx,
    //   winnings: this.contractsService.formatUSDC(winningsAmount),
    //   marketId,
    //   winningOutcome: marketInfo.winningOutcome ?? undefined,
    //   winningShares: this.contractsService.formatUSDC(winningShares),
    // });
  }

  /**
   * Get all activity for a market
   */
  async getMarketActivity(
    marketId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<MarketActivityDto[]> {
    const market = await this.opinionMarketRepository.findOne({
      where: { marketId: BigInt(marketId) },
      relations: ['creator', 'creator.user'],
    });

    if (!market) {
      throw new NotFoundException(`Market with ID ${marketId} not found`);
    }

    const activities: MarketActivityDto[] = [];

    // Add market creation event
    if (offset === 0) {
      activities.push({
        id: `create-${market.marketId}`,
        type: 'CREATED',
        userAddress: market.creatorAddress ?? undefined,
        userHandle: market.creator.user.twitterHandle,
        description: `Market created: "${market.question}"`,
        timestamp: market.createdAt,
      });
    }

    // Get trades
    const trades = await this.marketTradeRepository.find({
      where: { opinionMarket: { marketId: BigInt(marketId) } },
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });

    for (const trade of trades) {
      const user = await this.userRepository.findOne({
        where: { walletAddress: trade.userAddress.toLowerCase() },
      });

      const amount = BigInt(trade.amount);
      const outcomeText = trade.outcome ? 'YES' : 'NO';

      activities.push({
        id: `trade-${trade.id}`,
        type: 'TRADE',
        userAddress: trade.userAddress,
        userHandle: user?.twitterHandle,
        description: `Bet ${this.contractsService.formatUSDC(amount)} USDC on ${outcomeText}`,
        amount: this.contractsService.formatUSDC(amount),
        outcome: trade.outcome === 1,
        transactionHash: trade.transactionHash || "",
        timestamp: trade.timestamp,
      });
    }

    // Check if market is resolved or cancelled
    const marketInfo = await this.opinionMarketService.getMarketInfo(BigInt(marketId));

    if (marketInfo.resolved) {
      const outcomeText = marketInfo.winningOutcome ? 'YES' : 'NO';
      activities.push({
        id: `resolved-${market.marketId}`,
        type: 'RESOLVED',
        userAddress: market.creatorAddress ?? undefined,
        userHandle: market.creator.user.twitterHandle,
        description: `Market resolved: ${outcomeText} won`,
        outcome: marketInfo.winningOutcome ?? undefined,
        timestamp: new Date(), // In production, get from blockchain event
      });
    }

    if (marketInfo.cancelled) {
      activities.push({
        id: `cancelled-${market.marketId}`,
        type: 'CANCELLED',
        userAddress: market.creatorAddress ?? undefined,
        userHandle: market.creator.user.twitterHandle,
        description: 'Market cancelled',
        timestamp: new Date(), // In production, get from blockchain event
      });
    }

    // Sort by timestamp descending
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return activities;
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
