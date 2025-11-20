import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Or } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { CreatorShare } from '../../database/entities/creator-share.entity';
import { ShareTransaction } from '../../database/entities/share-transaction.entity';
import { Position } from '../../database/entities/position.entity';
import { Trade } from '../../database/entities/trade.entity';
import { Market } from '../../database/entities/market.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserPortfolioResponseDto, ShareHoldingDto, MarketPositionDto } from './dto/user-portfolio-response.dto';
import { UserActivityResponseDto, UserActivityDto, ActivityType } from './dto/user-activity-response.dto';
import { UserSearchResponseDto } from './dto/user-search-response.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CreatorShare)
    private readonly creatorShareRepository: Repository<CreatorShare>,
    @InjectRepository(ShareTransaction)
    private readonly shareTransactionRepository: Repository<ShareTransaction>,
    @InjectRepository(Position)
    private readonly positionRepository: Repository<Position>,
    @InjectRepository(Trade)
    private readonly tradeRepository: Repository<Trade>,
    @InjectRepository(Market)
    private readonly marketRepository: Repository<Market>,
  ) {}

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.mapToResponseDto(user);
  }

  /**
   * Get user by Twitter handle
   */
  async getUserByHandle(handle: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { twitterHandle: handle },
      relations: ['creator'],
    });

    if (!user) {
      throw new NotFoundException(`User @${handle} not found`);
    }

    return this.mapToResponseDto(user);
  }

  /**
   * Get user by wallet address
   */
  async getUserByWallet(address: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { walletAddress: address.toLowerCase() },
      relations: ['creator'],
    });

    if (!user) {
      throw new NotFoundException(`User with wallet ${address} not found`);
    }

    return this.mapToResponseDto(user);
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updateDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['creator'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update bio if provided
    if (updateDto.bio !== undefined) {
      user.bio = updateDto.bio;
    }

    // Update wallet address if provided
    if (updateDto.walletAddress !== undefined) {
      // Check if wallet is already linked to another user
      const existingUser = await this.userRepository.findOne({
        where: { walletAddress: updateDto.walletAddress.toLowerCase() },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Wallet address is already linked to another user');
      }

      user.walletAddress = updateDto.walletAddress.toLowerCase();
    }

    await this.userRepository.save(user);
    this.logger.log(`Updated user: ${user.twitterHandle}`);

    return this.mapToResponseDto(user);
  }

  /**
   * Get user portfolio (shares + market positions)
   */
  async getUserPortfolio(
    address: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<UserPortfolioResponseDto> {
    // Get share holdings
    const [shareHoldings, totalShares] = await this.creatorShareRepository.findAndCount({
      where: { holderAddress: address.toLowerCase() },
      relations: ['creator', 'creator.user'],
      skip: (page - 1) * limit,
      take: limit,
    });

    const shares: ShareHoldingDto[] = shareHoldings.map((holding) => ({
      creatorId: holding.creator.id,
      creatorName: holding.creator.user?.displayName || holding.creator.twitterHandle,
      sharesHeld: holding.sharesHeld,
      averageBuyPrice: holding.averageBuyPrice || 0,
      currentPrice: 0, // Would need to fetch from blockchain
      totalValue: 0,
      unrealizedPnL: 0,
    }));

    // Get market positions
    const [positions, totalPositions] = await this.positionRepository.findAndCount({
      where: { walletAddress: address.toLowerCase() },
      relations: ['market', 'outcome'],
      skip: (page - 1) * limit,
      take: limit,
    });

    const marketPositions: MarketPositionDto[] = positions.map((position) => {
      const sharesNum = Number(position.shares || 0);
      const costBasisNum = Number(position.costBasis || 0);
      // Simplified current value - in production, multiply shares by current outcome price
      const currentValueNum = sharesNum; // TODO: multiply by current outcome price

      return {
        marketId: position.market.id,
        marketTitle: position.market.title,
        outcome: position.outcome.outcomeIndex,
        shares: sharesNum,
        costBasis: costBasisNum,
        currentValue: currentValueNum,
        status: position.market.status,
      };
    });

    const sharesValue = shares.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    const positionsValue = marketPositions.reduce((sum, item) => sum + (item.currentValue || 0), 0);
    const totalValue = sharesValue + positionsValue;

    const totalInvested = [
      ...shareHoldings.map((h) => Number(h.totalInvested) || 0),
      ...positions.map((p) => Number(p.costBasis) || 0),
    ].reduce((sum, val) => sum + val, 0);

    return {
      portfolio: {
        totalValue,
        totalPnL: totalValue - totalInvested,
        shares,
        marketPositions,
      },
      pagination: {
        page,
        limit,
        total: totalShares + totalPositions,
      },
    };
  }

  /**
   * Get user activity feed
   */
  async getUserActivity(
    address: string,
    page: number = 1,
    limit: number = 20,
    type?: ActivityType,
  ): Promise<UserActivityResponseDto> {
    const activities: UserActivityDto[] = [];

    // Get share transactions
    const shareTransactions = await this.shareTransactionRepository.find({
      where: [
        { buyerAddress: address.toLowerCase() },
        { sellerAddress: address.toLowerCase() },
      ],
      order: { timestamp: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    shareTransactions.forEach((tx) => {
      const isBuy = tx.buyerAddress?.toLowerCase() === address.toLowerCase();
      activities.push({
        id: tx.id,
        type: isBuy ? ActivityType.SHARE_BUY : ActivityType.SHARE_SELL,
        description: `${isBuy ? 'Bought' : 'Sold'} ${tx.shares} shares for ${tx.totalAmount} USDC`,
        amount: tx.totalAmount || 0,
        timestamp: tx.timestamp.toISOString(),
      });
    });

    // Get market trades
    const marketTrades = await this.tradeRepository.find({
      where: { walletAddress: address.toLowerCase() },
      relations: ['market'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });

    marketTrades.forEach((trade) => {
      activities.push({
        id: trade.id,
        type: ActivityType.MARKET_TRADE,
        description: `Traded in market: ${trade.market.title}`,
        amount: Number(trade.amount || 0),
        timestamp: trade.createdAt.toISOString(),
      });
    });

    // Sort by timestamp
    activities.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return {
      activities: activities.slice(0, limit),
      pagination: {
        page,
        limit,
        total: shareTransactions.length + marketTrades.length,
      },
    };
  }

  /**
   * Search users by handle or name
   */
  async searchUsers(
    query: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<UserSearchResponseDto> {
    const [users, total] = await this.userRepository.findAndCount({
      where: [
        { twitterHandle: Like(`%${query}%`) },
        { displayName: Like(`%${query}%`) },
      ],
      relations: ['creator'],
      skip: (page - 1) * limit,
      take: limit,
      order: { followerCount: 'DESC' },
    });

    return {
      users: users.map((user) => this.mapToResponseDto(user)),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  /**
   * Map User entity to response DTO
   */
  private mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      twitterId: user.twitterId,
      twitterHandle: user.twitterHandle,
      displayName: user.displayName,
      profilePictureUrl: user.profilePictureUrl,
      bio: user.bio,
      walletAddress: user.walletAddress,
      followerCount: user.followerCount,
      followingCount: user.followingCount,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      isCreator: !!user.creator,
    };
  }
}
