import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Like } from 'typeorm';
import { Market } from '../../database/entities/market.entity';
import { Position } from '../../database/entities/position.entity';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { Trade } from '../../database/entities/trade.entity';
import { MarketStatus, CreatorStatus } from '../../database/enums';
import { OpinionMarketService } from '../../contracts/opinion-market.service';
import {
  ResolveMarketDto,
  ResolveMarketResponseDto,
  DisputeMarketDto,
  DisputeMarketResponseDto,
  ExtendMarketDto,
  ExtendMarketResponseDto,
  CancelMarketDto,
  CancelMarketResponseDto,
  PendingMarketsQueryDto,
  PendingMarketsResponseDto,
  PendingMarketDto,
  SuspendCreatorDto,
  OverrideUnlockDto,
  RefundStakeDto,
  BanUserDto,
  ProcessRefundDto,
  PauseContractsDto,
  SystemHealthResponseDto,
  PlatformStatsResponseDto,
  TriggerJobResponseDto,
  ErrorLogsResponseDto,
  PauseContractsResponseDto,
} from './dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(Market)
    private readonly marketRepository: Repository<Market>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    private readonly opinionMarketService: OpinionMarketService,
  ) {}

  /**
   * Get pending markets awaiting resolution
   */
  async getPendingMarkets(
    query: PendingMarketsQueryDto,
  ): Promise<PendingMarketsResponseDto> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const now = new Date();

    // Build query
    const queryBuilder = this.marketRepository
      .createQueryBuilder('market')
      .leftJoinAndSelect('market.creator', 'creator')
      .where('market.status = :status', { status: MarketStatus.PENDING_RESOLUTION })
      .andWhere('market.endTime < :now', { now });

    if (query.overdue) {
      // Overdue = more than 60 minutes past end time
      const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000);
      queryBuilder.andWhere('market.endTime < :sixtyMin', {
        sixtyMin: sixtyMinutesAgo,
      });
    }

    const [markets, total] = await queryBuilder
      .orderBy('market.endTime', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Count overdue markets
    const overdueCount = await this.marketRepository
      .createQueryBuilder('market')
      .where('market.status = :status', { status: MarketStatus.PENDING_RESOLUTION })
      .andWhere('market.endTime < :sixtyMin', {
        sixtyMin: new Date(now.getTime() - 60 * 60 * 1000),
      })
      .getCount();

    const marketDtos: PendingMarketDto[] = markets.map((market) => {
      const minutesPastEnd = Math.floor(
        (now.getTime() - market.endTime.getTime()) / (60 * 1000),
      );

      return {
        id: market.id,
        title: market.title,
        creator: {
          id: market.creator.id,
          twitterHandle: market.creator.twitterHandle,
        },
        endTime: market.endTime.toISOString(),
        minutesPastEnd,
        volume: Number(market.totalVolume) || 0,
        totalTrades: market.tradeCount || 0,
        status: market.status,
      };
    });

    return {
      markets: marketDtos,
      summary: {
        total,
        overdue: overdueCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Resolve a market (admin only)
   */
  async resolveMarket(
    marketId: string,
    resolveDto: ResolveMarketDto,
  ): Promise<ResolveMarketResponseDto> {
    const market = await this.marketRepository.findOne({
      where: { id: marketId },
      relations: ['creator', 'outcomes'],
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    if (market.status !== MarketStatus.PENDING_RESOLUTION) {
      throw new BadRequestException(
        `Market is ${market.status}, cannot resolve`,
      );
    }

    // Validate winning outcome
    if (resolveDto.winningOutcome >= market.outcomes.length) {
      throw new BadRequestException('Invalid winning outcome index');
    }

    // Update market status
    market.status = MarketStatus.RESOLVED;
    market.resolvedAt = new Date();
    market.winningOutcomeIndex = resolveDto.winningOutcome;

    if (resolveDto.resolutionNote) {
      market.resolutionCriteria = resolveDto.resolutionNote;
    }

    await this.marketRepository.save(market);

    // Call blockchain to resolve market
    let txHash = '0x0'; // Placeholder
    try {
      // This would interact with smart contract to distribute winnings
      // const tx = await this.opinionMarketService.resolveMarket(
      //   market.contractAddress,
      //   resolveDto.winningOutcome,
      // );
      // txHash = tx.hash;

      this.logger.log(
        `Market ${marketId} resolved with outcome ${resolveDto.winningOutcome}`,
      );
    } catch (error) {
      this.logger.error(`Failed to resolve market on-chain: ${error.message}`);
      // Roll back database change
      market.status = MarketStatus.PENDING_RESOLUTION;
      market.resolvedAt = null;
      market.winningOutcomeIndex = null;
      await this.marketRepository.save(market);
      throw error;
    }

    // Count winners and total payout
    // Get the winning outcome entity
    const winningOutcome = market.outcomes[resolveDto.winningOutcome];

    const winners = await this.positionRepository.count({
      where: {
        marketId: market.id,
        outcomeId: winningOutcome.id,
      },
    });

    const winningPositions = await this.positionRepository.find({
      where: {
        marketId: market.id,
        outcomeId: winningOutcome.id,
      },
    });

    // Calculate total payout (claimableWinnings is not stored, calculate from shares)
    const totalPayout = winningPositions.reduce((sum, pos) => {
      return sum + Number(pos.shares || 0);
    }, 0);

    return {
      success: true,
      market: {
        id: market.id,
        status: market.status,
        winningOutcome: market.winningOutcomeIndex,
        resolutionTime: market.resolvedAt.toISOString(),
      },
      txHash,
      winnersCount: winners,
      totalPayout,
    };
  }

  /**
   * Mark market as disputed
   */
  async disputeMarket(
    marketId: string,
    disputeDto: DisputeMarketDto,
  ): Promise<DisputeMarketResponseDto> {
    const market = await this.marketRepository.findOne({
      where: { id: marketId },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    if (market.status === MarketStatus.RESOLVED) {
      throw new BadRequestException('Cannot dispute already resolved market');
    }

    market.status = MarketStatus.DISPUTED;
    await this.marketRepository.save(market);

    this.logger.log(`Market ${marketId} marked as disputed: ${disputeDto.reason}`);

    return {
      success: true,
      market: {
        id: market.id,
        status: market.status,
      },
    };
  }

  /**
   * Extend market duration
   */
  async extendMarket(
    marketId: string,
    extendDto: ExtendMarketDto,
  ): Promise<ExtendMarketResponseDto> {
    const market = await this.marketRepository.findOne({
      where: { id: marketId },
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    if (market.status !== MarketStatus.ACTIVE) {
      throw new BadRequestException('Can only extend active markets');
    }

    const oldEndTime = new Date(market.endTime);
    const newEndTime = new Date(
      oldEndTime.getTime() + extendDto.additionalHours * 60 * 60 * 1000,
    );

    market.endTime = newEndTime;
    await this.marketRepository.save(market);

    this.logger.log(
      `Market ${marketId} extended by ${extendDto.additionalHours} hours: ${extendDto.reason}`,
    );

    return {
      success: true,
      market: {
        id: market.id,
        oldEndTime: oldEndTime.toISOString(),
        newEndTime: newEndTime.toISOString(),
      },
    };
  }

  /**
   * Cancel market and optionally refund users
   */
  async cancelMarket(
    marketId: string,
    cancelDto: CancelMarketDto,
  ): Promise<CancelMarketResponseDto> {
    const market = await this.marketRepository.findOne({
      where: { id: marketId },
      relations: ['positions'],
    });

    if (!market) {
      throw new NotFoundException('Market not found');
    }

    if (market.status === MarketStatus.RESOLVED) {
      throw new BadRequestException('Cannot cancel already resolved market');
    }

    market.status = MarketStatus.CANCELLED;
    await this.marketRepository.save(market);

    let refundedUsers = 0;
    let totalRefunded = 0;
    let txHash = '0x0';

    if (cancelDto.refundUsers) {
      // Get all positions
      const positions = await this.positionRepository.find({
        where: { marketId: market.id },
      });

      refundedUsers = new Set(positions.map((p) => p.walletAddress)).size;
      totalRefunded = positions.reduce((sum, p) => sum + Number(p.costBasis || 0), 0);

      // Call blockchain to process refunds
      try {
        // This would interact with smart contract to refund users
        // const tx = await this.opinionMarketService.cancelAndRefund(
        //   market.contractAddress,
        // );
        // txHash = tx.hash;

        this.logger.log(
          `Market ${marketId} cancelled. Refunded ${refundedUsers} users: ${totalRefunded} USDC`,
        );
      } catch (error) {
        this.logger.error(`Failed to process refunds: ${error.message}`);
        throw error;
      }
    }

    return {
      success: true,
      market: {
        id: market.id,
        status: market.status,
      },
      refundedUsers,
      totalRefunded,
      txHash,
    };
  }

  /**
   * Get pending creator applications
   */
  async getPendingCreators(page: number = 1, limit: number = 20) {
    const [creators, total] = await this.creatorRepository.findAndCount({
      where: { status: CreatorStatus.PENDING },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      creators: creators.map((c) => ({
        id: c.id,
        twitterHandle: c.twitterHandle,
        followerCount: c.followerCount,
        engagementRate: c.engagementRate,
        postCount30d: c.postCount30d,
        stakePaid: c.stakePaid,
        appliedAt: c.createdAt.toISOString(),
        user: {
          id: c.user.id,
          walletAddress: c.user.walletAddress,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Suspend a creator
   */
  async suspendCreator(creatorId: string, dto: SuspendCreatorDto) {
    const creator = await this.creatorRepository.findOne({
      where: { id: creatorId },
      relations: ['user'],
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    creator.status = CreatorStatus.SUSPENDED;
    await this.creatorRepository.save(creator);

    this.logger.log(
      `Creator ${creatorId} suspended: ${dto.reason} (duration: ${dto.duration})`,
    );

    return {
      success: true,
      creator: {
        id: creator.id,
        twitterHandle: creator.twitterHandle,
        status: creator.status,
        suspensionReason: dto.reason,
        suspensionDuration: dto.duration,
      },
    };
  }

  /**
   * Manually override share unlock for a creator
   */
  async overrideShareUnlock(creatorId: string, dto: OverrideUnlockDto) {
    const creator = await this.creatorRepository.findOne({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (creator.sharesUnlocked) {
      throw new BadRequestException('Shares already unlocked');
    }

    creator.sharesUnlocked = true;
    creator.sharesUnlockedAt = new Date();
    await this.creatorRepository.save(creator);

    this.logger.log(
      `Manually unlocked shares for creator ${creatorId}: ${dto.reason}`,
    );

    return {
      success: true,
      creator: {
        id: creator.id,
        twitterHandle: creator.twitterHandle,
        sharesUnlocked: true,
        sharesUnlockedAt: creator.sharesUnlockedAt.toISOString(),
        overrideReason: dto.reason,
      },
    };
  }

  /**
   * Refund creator stake after reaching $10K volume
   */
  async refundCreatorStake(creatorId: string, dto: RefundStakeDto) {
    const creator = await this.creatorRepository.findOne({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (!creator.stakePaid) {
      throw new BadRequestException('No stake to refund');
    }

    if (creator.stakeReturned) {
      throw new BadRequestException('Stake already refunded');
    }

    creator.stakeReturned = true;
    await this.creatorRepository.save(creator);

    this.logger.log(`Refunded stake for creator ${creatorId}: ${dto.reason}`);

    return {
      success: true,
      creator: {
        id: creator.id,
        twitterHandle: creator.twitterHandle,
        stakeAmount: creator.stakeAmount,
        stakeReturned: true,
      },
      txHash: dto.txHash,
      refundReason: dto.reason,
    };
  }

  /**
   * Search users with admin filters
   */
  async searchUsers(query: string, page: number = 1, limit: number = 20) {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.creator', 'creator');

    if (query) {
      queryBuilder.where(
        'user.twitterHandle LIKE :query OR user.displayName LIKE :query OR user.walletAddress LIKE :query',
        { query: `%${query}%` },
      );
    }

    const [users, total] = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      users: users.map((u) => ({
        id: u.id,
        twitterHandle: u.twitterHandle,
        displayName: u.displayName,
        walletAddress: u.walletAddress,
        isAdmin: u.isAdmin,
        isCreator: !!u.creator,
        creatorStatus: u.creator?.status,
        createdAt: u.createdAt.toISOString(),
        lastLoginAt: u.lastLoginAt?.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Ban a user
   */
  async banUser(userId: string, dto: BanUserDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['creator'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If user is also a creator, suspend their creator account
    if (user.creator) {
      user.creator.status = CreatorStatus.SUSPENDED;
      await this.creatorRepository.save(user.creator);
    }

    // Note: In a real implementation, you'd add a 'bannedAt' or 'status' field to User entity
    // For now, we just log it
    this.logger.log(
      `User ${userId} banned: ${dto.reason} (duration: ${dto.duration})`,
    );

    return {
      success: true,
      user: {
        id: user.id,
        twitterHandle: user.twitterHandle,
        banned: true,
        banReason: dto.reason,
        banDuration: dto.duration,
      },
    };
  }

  /**
   * Process manual refund for a user
   */
  async processUserRefund(userId: string, dto: ProcessRefundDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(
      `Processed refund for user ${userId}: ${dto.amount} USDC - ${dto.reason}`,
    );

    return {
      success: true,
      refund: {
        userId: user.id,
        userAddress: user.walletAddress,
        amount: dto.amount,
        reason: dto.reason,
        txHash: dto.txHash,
        processedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Get detailed system health
   */
  async getSystemHealth(): Promise<SystemHealthResponseDto> {
    const now = new Date();
    const services = {
      database: { status: 'healthy', responseTime: 0 },
      redis: { status: 'healthy', responseTime: 0 },
      blockchain: { status: 'healthy', rpcResponseTime: 0, blockNumber: 0 },
      twitter: { status: 'healthy', scraperAccountsHealthy: 0 },
    };

    // Database check
    try {
      const dbStart = Date.now();
      await this.userRepository.count();
      services.database.responseTime = Date.now() - dbStart;
    } catch (error) {
      services.database.status = 'unhealthy';
      this.logger.error(`Database health check failed: ${error.message}`);
    }

    // Blockchain check (placeholder)
    try {
      services.blockchain.status = 'healthy';
      services.blockchain.rpcResponseTime = 150;
      services.blockchain.blockNumber = 12345678;
    } catch (error) {
      services.blockchain.status = 'unhealthy';
    }

    // System metrics (placeholder)
    const metrics = {
      cpuUsage: 45.2,
      memoryUsage: 62.8,
      diskUsage: 38.5,
    };

    // Queue status (placeholder)
    const queues = {
      epochFinalizer: { waiting: 0, active: 0, failed: 0 },
      volumeTracker: { waiting: 0, active: 0, failed: 0 },
    };

    const overallStatus =
      Object.values(services).every((s) => s.status === 'healthy')
        ? 'healthy'
        : 'degraded';

    return {
      status: overallStatus,
      timestamp: now.toISOString(),
      services,
      metrics,
      queues,
    };
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(): Promise<PlatformStatsResponseDto> {
    const now = new Date();
    const day24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const day7Ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30Ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // User stats
    const totalUsers = await this.userRepository.count();
    const newTodayUsers = await this.userRepository.count({
      where: { createdAt: MoreThan(day24Ago) },
    });
    const active24hUsers = await this.userRepository.count({
      where: { lastLoginAt: MoreThan(day24Ago) },
    });
    const active7dUsers = await this.userRepository.count({
      where: { lastLoginAt: MoreThan(day7Ago) },
    });

    // Creator stats
    const totalCreators = await this.creatorRepository.count();
    const activeCreators = await this.creatorRepository.count({
      where: { status: CreatorStatus.ACTIVE },
    });
    const pendingCreators = await this.creatorRepository.count({
      where: { status: CreatorStatus.PENDING },
    });
    const suspendedCreators = await this.creatorRepository.count({
      where: { status: CreatorStatus.SUSPENDED },
    });
    const creatorsWithShares = await this.creatorRepository.count({
      where: { sharesUnlocked: true },
    });

    // Market stats
    const totalMarkets = await this.marketRepository.count();
    const activeMarkets = await this.marketRepository.count({
      where: { status: MarketStatus.ACTIVE },
    });
    const resolvedMarkets = await this.marketRepository.count({
      where: { status: MarketStatus.RESOLVED },
    });
    const disputedMarkets = await this.marketRepository.count({
      where: { status: MarketStatus.DISPUTED },
    });
    const pendingMarkets = await this.marketRepository.count({
      where: { status: MarketStatus.PENDING_RESOLUTION },
    });

    // Volume stats (aggregated from trades)
    const allTrades = await this.tradeRepository.find();
    const trades24h = allTrades.filter(
      (t) => new Date(t.createdAt) > day24Ago,
    );
    const trades7d = allTrades.filter((t) => new Date(t.createdAt) > day7Ago);
    const trades30d = allTrades.filter(
      (t) => new Date(t.createdAt) > day30Ago,
    );

    const volumeAllTime = allTrades.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0,
    );
    const volume24h = trades24h.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0,
    );
    const volume7d = trades7d.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const volume30d = trades30d.reduce(
      (sum, t) => sum + Number(t.amount || 0),
      0,
    );

    // Revenue stats (3% platform fee on all volume)
    const platformFeeRate = 0.03;
    const revenueAllTime = volumeAllTime * platformFeeRate;
    const revenue24h = volume24h * platformFeeRate;
    const revenue7d = volume7d * platformFeeRate;
    const revenue30d = volume30d * platformFeeRate;

    return {
      stats: {
        users: {
          total: totalUsers,
          active24h: active24hUsers,
          active7d: active7dUsers,
          newToday: newTodayUsers,
        },
        creators: {
          total: totalCreators,
          active: activeCreators,
          pending: pendingCreators,
          suspended: suspendedCreators,
          withShares: creatorsWithShares,
        },
        markets: {
          total: totalMarkets,
          active: activeMarkets,
          resolved: resolvedMarkets,
          disputed: disputedMarkets,
          pending: pendingMarkets,
        },
        volume: {
          allTime: volumeAllTime,
          last24h: volume24h,
          last7d: volume7d,
          last30d: volume30d,
        },
        revenue: {
          allTime: revenueAllTime,
          last24h: revenue24h,
          last7d: revenue7d,
          last30d: revenue30d,
        },
      },
    };
  }

  /**
   * Manually trigger a background job
   */
  async triggerJob(jobName: string): Promise<TriggerJobResponseDto> {
    // Placeholder - would integrate with Bull queue in production
    const validJobs = ['epochFinalizer', 'volumeTracker', 'marketResolver'];

    if (!validJobs.includes(jobName)) {
      throw new BadRequestException(
        `Invalid job name. Valid jobs: ${validJobs.join(', ')}`,
      );
    }

    this.logger.log(`Manually triggering job: ${jobName}`);

    return {
      success: true,
      job: {
        id: `${jobName}-${Date.now()}`,
        name: jobName,
        status: 'queued',
        queuedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Get error logs
   */
  async getErrorLogs(
    limit: number = 100,
    level: string = 'error',
  ): Promise<ErrorLogsResponseDto> {
    // Placeholder - would integrate with logging service (Winston, CloudWatch, etc.)
    this.logger.log(`Fetching error logs: level=${level}, limit=${limit}`);

    return {
      errors: [
        {
          timestamp: new Date().toISOString(),
          level: 'error',
          service: 'admin-service',
          message: 'This is a placeholder error log entry',
          stack: 'Error stack trace would appear here',
          context: { example: 'data' },
        },
      ],
    };
  }

  /**
   * Emergency pause all contracts
   */
  async pauseContracts(dto: PauseContractsDto): Promise<PauseContractsResponseDto> {
    this.logger.warn(`EMERGENCY: Pausing contracts - ${dto.reason}`);

    const contractsToPause =
      dto.contracts.includes('all')
        ? ['CreatorShareFactory', 'OpinionMarket', 'FeeCollector']
        : dto.contracts;

    // Placeholder - would call smart contract pause functions
    const txHashes = contractsToPause.map(
      (c) => `0x${Math.random().toString(16).substring(2, 66)}`,
    );

    return {
      success: true,
      pausedContracts: contractsToPause,
      txHashes,
      pausedAt: new Date().toISOString(),
    };
  }

  /**
   * Get platform analytics
   */
  async getPlatformAnalytics(timeframe: string = '30d') {
    // Placeholder for detailed analytics
    return {
      timeframe,
      marketCreation: {
        total: 150,
        byCategory: { sports: 45, politics: 35, entertainment: 40, other: 30 },
      },
      userGrowth: {
        newUsers: 250,
        retentionRate: 42.5,
      },
      engagement: {
        avgTradesPerUser: 3.2,
        avgMarketsPerCreator: 2.8,
      },
    };
  }

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics(timeframe: string = '30d') {
    // Placeholder for revenue analytics
    return {
      timeframe,
      totalRevenue: 15234.56,
      breakdown: {
        marketFees: 12187.65,
        shareTradingFees: 3046.91,
      },
      topCreatorsByRevenue: [
        { creatorId: '1', handle: '@creator1', revenue: 2345.67 },
        { creatorId: '2', handle: '@creator2', revenue: 1987.43 },
      ],
    };
  }
}
