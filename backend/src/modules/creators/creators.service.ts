import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { ShareTransaction } from '../../database/entities/share-transaction.entity';
import { OpinionMarket } from '../../database/entities/opinion-market.entity';
import { MarketTrade } from '../../database/entities/market-trade.entity';
import { CreatorShareService } from '../../contracts/creator-share.service';
import { CreatorShareFactoryService } from '../../contracts/creator-share-factory.service';
import { OpinionMarketService } from '../../contracts/opinion-market.service';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';
import {
  CreatorResponseDto,
  CreatorShareInfoDto,
  ShareholderDto,
  CreatorMarketDto,
} from './dto/creator-response.dto';

@Injectable()
export class CreatorsService {
  constructor(
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ShareTransaction)
    private readonly shareTransactionRepository: Repository<ShareTransaction>,
    @InjectRepository(OpinionMarket)
    private readonly opinionMarketRepository: Repository<OpinionMarket>,
    @InjectRepository(MarketTrade)
    private readonly marketTradeRepository: Repository<MarketTrade>,
    private readonly creatorShareService: CreatorShareService,
    private readonly creatorShareFactoryService: CreatorShareFactoryService,
    private readonly opinionMarketService: OpinionMarketService,
  ) {}

  /**
   * Apply to become a creator
   */
  async applyToBeCreator(userId: string, createDto: CreateCreatorDto): Promise<CreatorResponseDto> {
    // Get user
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['creator'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.creator) {
      throw new BadRequestException('User is already a creator');
    }

    // Check if wallet address is already taken
    const existingCreator = await this.creatorRepository.findOne({
      where: { creatorAddress: createDto.creatorAddress.toLowerCase() },
    });

    if (existingCreator) {
      throw new BadRequestException('Wallet address already registered as creator');
    }

    // Link wallet to user if not already linked
    if (!user.walletAddress) {
      user.walletAddress = createDto.creatorAddress.toLowerCase();
      await this.userRepository.save(user);
    } else if (user.walletAddress !== createDto.creatorAddress.toLowerCase()) {
      throw new BadRequestException('Wallet address does not match user wallet');
    }

    // Create creator profile (pending approval)
    const creator = this.creatorRepository.create({
      user,
      creatorAddress: createDto.creatorAddress.toLowerCase(),
      bio: createDto.bio,
      profilePictureUrl: createDto.profilePictureUrl || user.profilePictureUrl,
      websiteUrl: createDto.websiteUrl,
      status: 'PENDING',
    });

    await this.creatorRepository.save(creator);

    return this.getCreatorByAddress(creator.creatorAddress);
  }

  /**
   * Get all creators with filtering and pagination
   */
  async getAllCreators(
    status?: 'PENDING' | 'APPROVED' | 'REJECTED',
    page: number = 1,
    limit: number = 20,
  ): Promise<{ creators: CreatorResponseDto[]; total: number; page: number; totalPages: number }> {
    const queryBuilder = this.creatorRepository
      .createQueryBuilder('creator')
      .leftJoinAndSelect('creator.user', 'user')
      .orderBy('creator.createdAt', 'DESC');

    // Filter by status (default: only show APPROVED)
    if (status) {
      queryBuilder.where('creator.status = :status', { status });
    } else {
      queryBuilder.where('creator.status = :status', { status: 'APPROVED' });
    }

    const [creators, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const creatorResponses = await Promise.all(
      creators.map((creator) => this.buildCreatorResponse(creator)),
    );

    return {
      creators: creatorResponses,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get creator by address
   */
  async getCreatorByAddress(creatorAddress: string): Promise<CreatorResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
      relations: ['user'],
    });

    if (!creator) {
      throw new NotFoundException(`Creator with address ${creatorAddress} not found`);
    }

    return this.buildCreatorResponse(creator);
  }

  /**
   * Get creator by user ID
   */
  async getCreatorByUserId(userId: string): Promise<CreatorResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!creator) {
      throw new NotFoundException('User is not a creator');
    }

    return this.buildCreatorResponse(creator);
  }

  /**
   * Update creator profile
   */
  async updateCreator(userId: string, updateDto: UpdateCreatorDto): Promise<CreatorResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });

    if (!creator) {
      throw new NotFoundException('User is not a creator');
    }

    // Update fields
    if (updateDto.bio !== undefined) {
      creator.bio = updateDto.bio;
    }
    if (updateDto.profilePictureUrl !== undefined) {
      creator.profilePictureUrl = updateDto.profilePictureUrl;
    }
    if (updateDto.websiteUrl !== undefined) {
      creator.websiteUrl = updateDto.websiteUrl;
    }

    await this.creatorRepository.save(creator);

    return this.buildCreatorResponse(creator);
  }

  /**
   * Approve creator application (admin only)
   */
  async approveCreator(creatorAddress: string, adminUserId: string): Promise<CreatorResponseDto> {
    const admin = await this.userRepository.findOne({ where: { id: adminUserId } });
    if (!admin || !admin.isAdmin) {
      throw new ForbiddenException('Only admins can approve creators');
    }

    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
      relations: ['user'],
    });

    if (!creator) {
      throw new NotFoundException(`Creator with address ${creatorAddress} not found`);
    }

    creator.status = 'APPROVED';
    await this.creatorRepository.save(creator);

    return this.buildCreatorResponse(creator);
  }

  /**
   * Reject creator application (admin only)
   */
  async rejectCreator(creatorAddress: string, adminUserId: string): Promise<CreatorResponseDto> {
    const admin = await this.userRepository.findOne({ where: { id: adminUserId } });
    if (!admin || !admin.isAdmin) {
      throw new ForbiddenException('Only admins can reject creators');
    }

    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
      relations: ['user'],
    });

    if (!creator) {
      throw new NotFoundException(`Creator with address ${creatorAddress} not found`);
    }

    creator.status = 'REJECTED';
    await this.creatorRepository.save(creator);

    return this.buildCreatorResponse(creator);
  }

  /**
   * Get creator share information
   */
  async getCreatorShareInfo(creatorAddress: string): Promise<CreatorShareInfoDto> {
    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
    });

    if (!creator) {
      throw new NotFoundException(`Creator with address ${creatorAddress} not found`);
    }

    // Get share contract address
    const shareContract = await this.creatorShareFactoryService.getShareContract(creatorAddress);
    if (!shareContract) {
      throw new NotFoundException('Creator shares not yet created');
    }

    // Get volume info
    const volumeInfo = await this.creatorShareFactoryService.getVolumeInfo(creatorAddress);

    // Get current supply
    const supply = await this.creatorShareService.getCurrentSupply(creatorAddress);

    // Get buy/sell prices for 1 share
    const oneShare = BigInt(1e6); // 1 share = 1e6 smallest units
    const [buyPrice, sellPrice] = await Promise.all([
      this.creatorShareService.getBuyPrice(creatorAddress, oneShare),
      this.creatorShareService.getSellPrice(creatorAddress, oneShare),
    ]);

    // Count unique shareholders
    const shareholderCount = await this.shareTransactionRepository
      .createQueryBuilder('tx')
      .select('COUNT(DISTINCT tx.buyer)', 'count')
      .where('tx.creatorShareCreatorAddress = :address', { address: creatorAddress.toLowerCase() })
      .getRawOne();

    return {
      creatorAddress,
      shareContractAddress: shareContract,
      currentSupply: supply.supplyFormatted,
      shareholderCount: parseInt(shareholderCount.count) || 0,
      buyPriceForOne: buyPrice.priceFormatted,
      sellPriceForOne: sellPrice.priceFormatted,
      totalVolume: volumeInfo.currentVolumeFormatted,
      isUnlocked: volumeInfo.isUnlocked,
    };
  }

  /**
   * Get list of shareholders for a creator
   */
  async getShareholderList(
    creatorAddress: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ShareholderDto[]> {
    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
    });

    if (!creator) {
      throw new NotFoundException(`Creator with address ${creatorAddress} not found`);
    }

    // Get all share transactions
    const transactions = await this.shareTransactionRepository.find({
      where: { creatorShare: { creatorAddress: creatorAddress.toLowerCase() } },
      order: { timestamp: 'DESC' },
    });

    // Calculate holdings per address
    const holdingsMap = new Map<string, bigint>();

    for (const tx of transactions) {
      const currentHolding = holdingsMap.get(tx.buyer) || BigInt(0);
      if (tx.transactionType === 'BUY') {
        holdingsMap.set(tx.buyer, currentHolding + BigInt(tx.shares));
      } else if (tx.transactionType === 'SELL') {
        holdingsMap.set(tx.buyer, currentHolding - BigInt(tx.shares));
      }
    }

    // Get total supply for percentage calculation
    const supply = await this.creatorShareService.getCurrentSupply(creatorAddress);
    const totalSupply = BigInt(supply.supply);

    // Build shareholder list
    const shareholders: ShareholderDto[] = [];

    for (const [address, shares] of holdingsMap.entries()) {
      if (shares <= BigInt(0)) continue; // Skip if no shares

      // Try to find user by wallet address
      const user = await this.userRepository.findOne({
        where: { walletAddress: address.toLowerCase() },
      });

      const percentageOfSupply = totalSupply > BigInt(0)
        ? Number((shares * BigInt(10000)) / totalSupply) / 100
        : 0;

      shareholders.push({
        address,
        sharesHeld: this.formatUSDC(shares),
        percentageOfSupply,
        twitterHandle: user?.twitterHandle,
        displayName: user?.displayName,
      });
    }

    // Sort by shares held (descending)
    shareholders.sort((a, b) => parseFloat(b.sharesHeld) - parseFloat(a.sharesHeld));

    return shareholders.slice(offset, offset + limit);
  }

  /**
   * Get markets created by creator
   */
  async getCreatorMarkets(
    creatorAddress: string,
    status?: 'ACTIVE' | 'RESOLVED' | 'CANCELLED',
    limit: number = 20,
    offset: number = 0,
  ): Promise<CreatorMarketDto[]> {
    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
    });

    if (!creator) {
      throw new NotFoundException(`Creator with address ${creatorAddress} not found`);
    }

    const queryBuilder = this.opinionMarketRepository
      .createQueryBuilder('market')
      .where('market.creatorAddress = :address', { address: creatorAddress.toLowerCase() })
      .orderBy('market.createdAt', 'DESC')
      .skip(offset)
      .take(limit);

    const markets = await queryBuilder.getMany();

    const marketDtos: CreatorMarketDto[] = [];

    for (const market of markets) {
      // Get on-chain market info
      const marketInfo = await this.opinionMarketService.getMarketInfo(BigInt(market.marketId));
      const probabilities = await this.opinionMarketService.getOutcomeProbabilities(
        BigInt(market.marketId),
      );

      // Count unique participants
      const participantCount = await this.marketTradeRepository
        .createQueryBuilder('trade')
        .select('COUNT(DISTINCT trade.userAddress)', 'count')
        .where('trade.opinionMarketMarketId = :marketId', { marketId: market.marketId })
        .getRawOne();

      // Calculate total volume
      const totalVolume = await this.marketTradeRepository
        .createQueryBuilder('trade')
        .select('SUM(trade.amount)', 'total')
        .where('trade.opinionMarketMarketId = :marketId', { marketId: market.marketId })
        .getRawOne();

      const marketStatus = marketInfo.resolved
        ? 'RESOLVED'
        : marketInfo.cancelled
        ? 'CANCELLED'
        : 'ACTIVE';

      // Apply status filter if specified
      if (status && marketStatus !== status) continue;

      marketDtos.push({
        marketId: market.marketId.toString(),
        question: market.question,
        description: market.description,
        endTime: market.endTime,
        liquidityPool: this.formatUSDC(BigInt(marketInfo.liquidityPool)),
        yesProbability: probabilities.yesProbability,
        noProbability: probabilities.noProbability,
        status: marketStatus,
        winningOutcome: marketInfo.resolved ? marketInfo.winningOutcome : undefined,
        totalVolume: this.formatUSDC(BigInt(totalVolume.total || '0')),
        participantCount: parseInt(participantCount.count) || 0,
        createdAt: market.createdAt,
      });
    }

    return marketDtos;
  }

  /**
   * Helper: Build creator response DTO
   */
  private async buildCreatorResponse(creator: Creator): Promise<CreatorResponseDto> {
    // Get volume info from blockchain
    let shareContractAddress: string | null = null;
    let currentVolume = '0';
    let volumeThreshold = '0';
    let remainingVolume = '0';
    let sharesUnlocked = false;

    try {
      const shareContract = await this.creatorShareFactoryService.getShareContract(
        creator.creatorAddress,
      );
      shareContractAddress = shareContract;

      if (shareContract) {
        const volumeInfo = await this.creatorShareFactoryService.getVolumeInfo(
          creator.creatorAddress,
        );
        currentVolume = volumeInfo.currentVolumeFormatted;
        volumeThreshold = volumeInfo.thresholdFormatted;
        remainingVolume = volumeInfo.remainingVolumeFormatted;
        sharesUnlocked = volumeInfo.isUnlocked;
      }
    } catch (error) {
      // Creator shares might not be created yet
    }

    return new CreatorResponseDto({
      id: creator.id,
      creatorAddress: creator.creatorAddress,
      twitterHandle: creator.user.twitterHandle,
      displayName: creator.user.displayName,
      bio: creator.bio,
      profilePictureUrl: creator.profilePictureUrl,
      websiteUrl: creator.websiteUrl,
      twitterFollowers: creator.user.twitterFollowers,
      shareContractAddress,
      sharesUnlocked,
      currentVolume,
      volumeThreshold,
      remainingVolume,
      status: creator.status,
      createdAt: creator.createdAt,
      updatedAt: creator.updatedAt,
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
