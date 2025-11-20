import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Creator } from '../../database/entities/creator.entity';
import { CreatorStatus, MarketStatus } from '../../database/enums';
import { User } from '../../database/entities/user.entity';
import { Market } from '../../database/entities/market.entity';
import { CreatorShare } from '../../database/entities/creator-share.entity';
import { ShareTransaction } from '../../database/entities/share-transaction.entity';
import { CreatorResponseDto } from './dto/creator-response.dto';
import { ApplyCreatorDto } from './dto/apply-creator.dto';
import {
  EligibilityCheckResponseDto,
  VolumeProgressResponseDto,
  ShareholdersResponseDto,
  PerformanceResponseDto,
  MarketVolumeDto,
  ShareholderDto,
} from './dto';

@Injectable()
export class CreatorsService {
  private readonly logger = new Logger(CreatorsService.name);

  constructor(
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Market)
    private readonly marketRepository: Repository<Market>,
    @InjectRepository(CreatorShare)
    private readonly creatorShareRepository: Repository<CreatorShare>,
    @InjectRepository(ShareTransaction)
    private readonly shareTransactionRepository: Repository<ShareTransaction>,
  ) {}

  /**
   * Apply to become a creator
   */
  async applyCreator(userId: string, applyDto: ApplyCreatorDto): Promise<CreatorResponseDto> {
    // Check if user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['creator'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.creator) {
      throw new BadRequestException('User already has a creator profile');
    }

    // Create creator profile with PENDING status
    const creator = this.creatorRepository.create({
      userId: user.id,
      twitterId: user.twitterId,
      twitterHandle: user.twitterHandle,
      followerCount: user.followerCount,
      status: CreatorStatus.PENDING,
    });

    await this.creatorRepository.save(creator);
    this.logger.log(`Creator application submitted: @${user.twitterHandle}`);

    return this.mapToResponseDto(creator);
  }

  /**
   * Get creator by share contract address
   */
  async getCreatorByAddress(address: string): Promise<CreatorResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { shareContractAddress: address.toLowerCase() },
      relations: ['user'],
    });

    if (!creator) {
      throw new NotFoundException(`Creator with address ${address} not found`);
    }

    return this.mapToResponseDto(creator);
  }

  /**
   * Get creator by user ID
   */
  async getCreatorByUserId(userId: string): Promise<CreatorResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!creator) {
      throw new NotFoundException('Creator profile not found');
    }

    return this.mapToResponseDto(creator);
  }

  /**
   * List all creators (filterable by status)
   */
  async listCreators(status?: CreatorStatus): Promise<CreatorResponseDto[]> {
    const where = status ? { status } : {};

    const creators = await this.creatorRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    return creators.map(creator => this.mapToResponseDto(creator));
  }

  /**
   * Approve creator (admin only)
   */
  async approveCreator(creatorId: string): Promise<CreatorResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { id: creatorId },
      relations: ['user'],
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (creator.status !== CreatorStatus.PENDING) {
      throw new BadRequestException(`Creator is already ${creator.status}`);
    }

    creator.status = CreatorStatus.ACTIVE;
    await this.creatorRepository.save(creator);

    this.logger.log(`Creator activated: @${creator.twitterHandle}`);

    return this.mapToResponseDto(creator);
  }

  /**
   * Reject creator (admin only)
   */
  async rejectCreator(creatorId: string): Promise<CreatorResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { id: creatorId },
      relations: ['user'],
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (creator.status !== CreatorStatus.PENDING) {
      throw new BadRequestException(`Creator is already ${creator.status}`);
    }

    creator.status = CreatorStatus.SUSPENDED;
    await this.creatorRepository.save(creator);

    this.logger.log(`Creator suspended: @${creator.twitterHandle}`);

    return this.mapToResponseDto(creator);
  }

  /**
   * Check if user meets creator eligibility requirements
   */
  async checkEligibility(userId: string): Promise<EligibilityCheckResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Define tier thresholds
    const tiers = [
      { name: '50K-500K', minFollowers: 50000, maxFollowers: 500000 },
      { name: '500K-5M', minFollowers: 500000, maxFollowers: 5000000 },
      { name: '5M+', minFollowers: 5000000, maxFollowers: Infinity },
    ];

    const userTier = tiers.find(
      (tier) => user.followerCount >= tier.minFollowers && user.followerCount < tier.maxFollowers,
    );

    // Requirements
    const followersMet = user.followerCount >= 50000;
    // TODO: Fetch these from Twitter API
    const engagementRate = 0; // Placeholder - would fetch from Twitter
    const postCount30d = 0; // Placeholder - would fetch from Twitter
    const engagementMet = engagementRate >= 0.01; // 1%
    const postCountMet = postCount30d >= 15;

    const eligible = followersMet && engagementMet && postCountMet;

    return {
      eligible,
      bypassed: false,
      tier: userTier?.name || null,
      requirements: {
        followerCount: {
          required: 50000,
          current: user.followerCount,
          met: followersMet,
        },
        engagementRate: {
          required: 0.01,
          current: engagementRate,
          met: engagementMet,
        },
        postCount30d: {
          required: 15,
          current: postCount30d,
          met: postCountMet,
        },
      },
      alternativeStake: !eligible
        ? {
            amount: 100,
            refundable: true,
          }
        : null,
    };
  }

  /**
   * Get creator's volume progress toward share unlock
   */
  async getVolumeProgress(creatorId: string): Promise<VolumeProgressResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Get all markets for this creator
    const markets = await this.marketRepository.find({
      where: { creatorId },
      order: { createdAt: 'DESC' },
    });

    const marketVolumes: MarketVolumeDto[] = markets.map((market) => ({
      id: market.id,
      title: market.title,
      volume: Number(market.totalVolume) || 0,
      status: market.status,
      createdAt: market.createdAt.toISOString(),
    }));

    const totalVolume = creator.totalMarketVolume || 0;
    const threshold = 30000;
    const progress = (totalVolume / threshold) * 100;
    const remaining = Math.max(0, threshold - totalVolume);

    return {
      creatorId: creator.id,
      totalVolume,
      threshold,
      progress: Math.min(100, progress),
      remaining,
      sharesUnlocked: creator.sharesUnlocked,
      markets: marketVolumes,
    };
  }

  /**
   * Get list of shareholders for creator
   */
  async getShareholders(
    creatorId: string,
    page: number = 1,
    limit: number = 20,
    sort: 'shares' | 'value' = 'shares',
  ): Promise<ShareholdersResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (!creator.shareContractAddress) {
      return {
        shareholders: [],
        totalHolders: 0,
        totalSupply: 0,
        pagination: {
          page,
          limit,
          total: 0,
        },
      };
    }

    // Get shareholders
    const [shareholders, total] = await this.creatorShareRepository.findAndCount({
      where: { creatorId },
      relations: ['creator'],
      skip: (page - 1) * limit,
      take: limit,
      order: sort === 'shares' ? { sharesHeld: 'DESC' } : { totalInvested: 'DESC' },
    });

    const totalSupply = creator.totalShares || 0;

    // Find users for addresses
    const addresses = shareholders.map((s) => s.holderAddress);
    const users = await this.userRepository.find({
      where: addresses.map((addr) => ({ walletAddress: addr })),
    });

    const userMap = new Map(users.map((u) => [u.walletAddress?.toLowerCase(), u]));

    const shareholderDtos: ShareholderDto[] = shareholders.map((holder) => {
      const user = userMap.get(holder.holderAddress.toLowerCase());
      const currentValue = holder.sharesHeld * (holder.averageBuyPrice || 0); // Simplified
      const totalInvested = holder.totalInvested || 0;

      return {
        address: holder.holderAddress,
        twitterHandle: user?.twitterHandle || null,
        sharesHeld: holder.sharesHeld,
        percentOfSupply: totalSupply > 0 ? (holder.sharesHeld / totalSupply) * 100 : 0,
        averageBuyPrice: holder.averageBuyPrice || 0,
        currentValue,
        unrealizedPnL: currentValue - totalInvested,
      };
    });

    return {
      shareholders: shareholderDtos,
      totalHolders: total,
      totalSupply,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Get creator performance metrics
   */
  async getPerformance(
    creatorId: string,
    timeframe: '7d' | '30d' | '90d' | 'all' = 'all',
  ): Promise<PerformanceResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Calculate date filter
    let startDate = new Date(0);
    if (timeframe !== 'all') {
      const days = parseInt(timeframe);
      startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
    }

    // Get markets
    const allMarkets = await this.marketRepository.find({
      where: { creatorId },
    });

    const resolvedMarkets = allMarkets.filter((m) => m.status === MarketStatus.RESOLVED);
    const totalVolume = allMarkets.reduce((sum, m) => sum + Number(m.totalVolume || 0), 0);
    const marketsCreated = allMarkets.length;
    const marketsResolved = resolvedMarkets.length;

    // Calculate resolution accuracy (placeholder - would need more logic)
    const resolutionAccuracy = marketsResolved > 0 ? 0.85 : 0;

    const averageMarketVolume =
      marketsCreated > 0 ? totalVolume / marketsCreated : 0;

    // Revenue calculation (2.5% of volume)
    const totalRevenue = totalVolume * 0.025;
    const marketFees = totalRevenue * 0.8; // 80% from markets
    const shareFees = totalRevenue * 0.2; // 20% from shares

    // Share performance
    let sharePerformance = null;
    if (creator.shareContractAddress) {
      const shareholders = await this.creatorShareRepository.count({
        where: { creatorId },
      });

      sharePerformance = {
        currentPrice: 2.5, // Would need to fetch from blockchain
        allTimeHigh: 3.0,
        allTimeLow: 0.5,
        holders: shareholders,
        totalSupply: creator.totalShares || 0,
      };
    }

    return {
      performance: {
        totalVolume,
        marketsCreated,
        marketsResolved,
        resolutionAccuracy,
        averageMarketVolume,
        totalRevenue,
        revenueBreakdown: {
          marketFees,
          shareFees,
        },
        sharePerformance,
      },
    };
  }

  /**
   * Map Creator entity to response DTO
   */
  private mapToResponseDto(creator: Creator): CreatorResponseDto {
    return {
      id: creator.id,
      userId: creator.userId,
      twitterId: creator.twitterId,
      twitterHandle: creator.twitterHandle,
      followerCount: creator.followerCount,
      engagementRate: creator.engagementRate,
      postCount30d: creator.postCount30d,
      qualifiedAt: creator.qualifiedAt,
      stakePaid: creator.stakePaid,
      stakeAmount: creator.stakeAmount,
      stakeReturned: creator.stakeReturned,
      totalMarketVolume: creator.totalMarketVolume,
      sharesUnlocked: creator.sharesUnlocked,
      sharesUnlockedAt: creator.sharesUnlockedAt,
      shareContractAddress: creator.shareContractAddress,
      totalShares: creator.totalShares,
      status: creator.status,
      createdAt: creator.createdAt,
      updatedAt: creator.updatedAt,
    };
  }
}
