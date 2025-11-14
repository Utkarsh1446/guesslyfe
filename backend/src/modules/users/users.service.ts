import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { ShareTransaction } from '../../database/entities/share-transaction.entity';
import { MarketPosition } from '../../database/entities/market-position.entity';
import { MarketTrade } from '../../database/entities/market-trade.entity';
import { DividendClaim } from '../../database/entities/dividend-claim.entity';
import { CreatorShareService } from '../../contracts/creator-share.service';
import { CreatorShareFactoryService } from '../../contracts/creator-share-factory.service';
import { OpinionMarketService } from '../../contracts/opinion-market.service';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  UserResponseDto,
  UserPortfolioDto,
  UserMarketPositionDto,
  TransactionHistoryDto,
} from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ShareTransaction)
    private readonly shareTransactionRepository: Repository<ShareTransaction>,
    @InjectRepository(MarketPosition)
    private readonly marketPositionRepository: Repository<MarketPosition>,
    @InjectRepository(MarketTrade)
    private readonly marketTradeRepository: Repository<MarketTrade>,
    @InjectRepository(DividendClaim)
    private readonly dividendClaimRepository: Repository<DividendClaim>,
    private readonly creatorShareService: CreatorShareService,
    private readonly creatorShareFactoryService: CreatorShareFactoryService,
    private readonly opinionMarketService: OpinionMarketService,
  ) {}

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['creator'],
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return new UserResponseDto({
      id: user.id,
      twitterId: user.twitterId,
      twitterHandle: user.twitterHandle,
      displayName: user.displayName,
      bio: user.bio,
      profilePictureUrl: user.profilePictureUrl,
      walletAddress: user.walletAddress,
      isCreator: !!user.creator,
      twitterFollowers: user.twitterFollowers,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
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
      throw new NotFoundException(`User with handle @${handle} not found`);
    }

    return this.getUserById(user.id);
  }

  /**
   * Get user by wallet address
   */
  async getUserByWallet(walletAddress: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
      relations: ['creator'],
    });

    if (!user) {
      throw new NotFoundException(`User with wallet ${walletAddress} not found`);
    }

    return this.getUserById(user.id);
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updateDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if wallet address is already taken
    if (updateDto.walletAddress && updateDto.walletAddress !== user.walletAddress) {
      const existingUser = await this.userRepository.findOne({
        where: { walletAddress: updateDto.walletAddress.toLowerCase() },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Wallet address already linked to another account');
      }
    }

    // Update fields
    if (updateDto.displayName !== undefined) {
      user.displayName = updateDto.displayName;
    }
    if (updateDto.bio !== undefined) {
      user.bio = updateDto.bio;
    }
    if (updateDto.profilePictureUrl !== undefined) {
      user.profilePictureUrl = updateDto.profilePictureUrl;
    }
    if (updateDto.walletAddress !== undefined) {
      user.walletAddress = updateDto.walletAddress.toLowerCase();
    }

    await this.userRepository.save(user);

    return this.getUserById(userId);
  }

  /**
   * Get user's share portfolio
   */
  async getUserPortfolio(userId: string): Promise<UserPortfolioDto[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.walletAddress) {
      return []; // No wallet = no portfolio
    }

    // Get all share transactions for this user
    const transactions = await this.shareTransactionRepository.find({
      where: { buyer: user.walletAddress },
      relations: ['creatorShare', 'creatorShare.creator', 'creatorShare.creator.user'],
      order: { timestamp: 'DESC' },
    });

    // Group by creator and calculate portfolio
    const portfolioMap = new Map<string, {
      creatorAddress: string;
      creatorHandle: string;
      creatorName: string;
      totalShares: bigint;
      totalInvested: bigint;
      totalDividends: bigint;
    }>();

    for (const tx of transactions) {
      const creatorAddress = tx.creatorShare.creatorAddress;
      const existing = portfolioMap.get(creatorAddress) || {
        creatorAddress,
        creatorHandle: tx.creatorShare.creator.user.twitterHandle,
        creatorName: tx.creatorShare.creator.user.displayName,
        totalShares: BigInt(0),
        totalInvested: BigInt(0),
        totalDividends: BigInt(0),
      };

      if (tx.transactionType === 'BUY') {
        existing.totalShares += BigInt(tx.shares);
        existing.totalInvested += BigInt(tx.totalPrice);
      } else if (tx.transactionType === 'SELL') {
        existing.totalShares -= BigInt(tx.shares);
        existing.totalInvested -= BigInt(tx.totalPrice);
      }

      portfolioMap.set(creatorAddress, existing);
    }

    // Get dividend claims
    const dividendClaims = await this.dividendClaimRepository.find({
      where: { claimer: user.walletAddress },
      relations: ['claimableDividend', 'claimableDividend.dividendEpoch'],
    });

    for (const claim of dividendClaims) {
      const creatorAddress = claim.claimableDividend.dividendEpoch.creatorAddress;
      const existing = portfolioMap.get(creatorAddress);
      if (existing) {
        existing.totalDividends += BigInt(claim.amount);
      }
    }

    // Build portfolio with current prices
    const portfolio: UserPortfolioDto[] = [];

    for (const [creatorAddress, data] of portfolioMap.entries()) {
      if (data.totalShares <= BigInt(0)) continue; // Skip if no shares held

      // Get current share contract
      const shareContract = await this.creatorShareFactoryService.getShareContract(creatorAddress);
      if (!shareContract) continue;

      // Get current holder balance (on-chain source of truth)
      const currentBalance = await this.creatorShareService.getShareholderBalance(
        creatorAddress,
        user.walletAddress,
      );

      if (BigInt(currentBalance.balance) <= BigInt(0)) continue;

      // Get current sell price
      const sellPrice = await this.creatorShareService.getSellPrice(
        creatorAddress,
        BigInt(currentBalance.balance),
      );

      const currentValue = BigInt(sellPrice.priceInUSDC);
      const averageBuyPrice = data.totalInvested / data.totalShares;
      const profitLoss = currentValue - data.totalInvested;
      const profitLossPercentage = Number((profitLoss * BigInt(10000)) / data.totalInvested) / 100;

      portfolio.push({
        creatorAddress,
        creatorHandle: data.creatorHandle,
        creatorName: data.creatorName,
        sharesHeld: currentBalance.balanceFormatted,
        averageBuyPrice: this.formatUSDC(averageBuyPrice),
        currentValue: sellPrice.priceFormatted,
        profitLoss: this.formatUSDC(profitLoss),
        profitLossPercentage,
        totalDividendsEarned: this.formatUSDC(data.totalDividends),
      });
    }

    return portfolio.sort((a, b) => parseFloat(b.currentValue) - parseFloat(a.currentValue));
  }

  /**
   * Get user's market positions
   */
  async getUserMarketPositions(userId: string): Promise<UserMarketPositionDto[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.walletAddress) {
      return [];
    }

    // Get all market positions
    const positions = await this.marketPositionRepository.find({
      where: { userAddress: user.walletAddress },
      relations: ['opinionMarket'],
      order: { lastUpdated: 'DESC' },
    });

    const result: UserMarketPositionDto[] = [];

    for (const position of positions) {
      const marketInfo = await this.opinionMarketService.getMarketInfo(
        BigInt(position.opinionMarket.marketId),
      );

      // Calculate current value
      const yesShares = BigInt(position.yesShares);
      const noShares = BigInt(position.noShares);
      const totalInvested = BigInt(position.totalInvested);

      let currentValue = BigInt(0);
      let claimableWinnings: string | undefined;

      if (marketInfo.resolved) {
        // Market resolved - calculate winnings
        const winningShares = marketInfo.winningOutcome ? yesShares : noShares;
        claimableWinnings = this.formatUSDC(winningShares * BigInt(marketInfo.liquidityPool) / BigInt(marketInfo.totalYesShares + marketInfo.totalNoShares));
        currentValue = BigInt(claimableWinnings.replace('.', '').padEnd(6, '0'));
      } else {
        // Market active - estimate current value based on probabilities
        const probabilities = await this.opinionMarketService.getOutcomeProbabilities(
          BigInt(position.opinionMarket.marketId),
        );
        currentValue = (yesShares * BigInt(Math.floor(probabilities.yesProbability * 100)) +
                       noShares * BigInt(Math.floor(probabilities.noProbability * 100))) / BigInt(100);
      }

      result.push({
        marketId: position.opinionMarket.marketId.toString(),
        question: position.opinionMarket.question,
        creatorAddress: position.opinionMarket.creatorAddress,
        yesShares: this.formatUSDC(yesShares),
        noShares: this.formatUSDC(noShares),
        totalInvested: this.formatUSDC(totalInvested),
        currentValue: this.formatUSDC(currentValue),
        status: marketInfo.resolved ? 'RESOLVED' : (marketInfo.cancelled ? 'CANCELLED' : 'ACTIVE'),
        endTime: new Date(Number(marketInfo.endTime) * 1000),
        winningOutcome: marketInfo.resolved ? marketInfo.winningOutcome : undefined,
        claimableWinnings,
      });
    }

    return result;
  }

  /**
   * Get user's transaction history
   */
  async getTransactionHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<TransactionHistoryDto[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.walletAddress) {
      return [];
    }

    const transactions: TransactionHistoryDto[] = [];

    // Get share transactions
    const shareTransactions = await this.shareTransactionRepository.find({
      where: { buyer: user.walletAddress },
      relations: ['creatorShare'],
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });

    for (const tx of shareTransactions) {
      transactions.push({
        id: tx.id,
        type: tx.transactionType === 'BUY' ? 'SHARE_BUY' : 'SHARE_SELL',
        transactionHash: tx.transactionHash,
        relatedAddress: tx.creatorShare.creatorAddress,
        amount: this.formatUSDC(BigInt(tx.totalPrice)),
        shares: this.formatUSDC(BigInt(tx.shares)),
        timestamp: tx.timestamp,
        status: 'SUCCESS',
        details: {
          pricePerShare: this.formatUSDC(BigInt(tx.pricePerShare)),
          protocolFee: this.formatUSDC(BigInt(tx.protocolFee)),
          creatorFee: this.formatUSDC(BigInt(tx.creatorFee)),
        },
      });
    }

    // Get market trades
    const marketTrades = await this.marketTradeRepository.find({
      where: { userAddress: user.walletAddress },
      relations: ['opinionMarket'],
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });

    for (const trade of marketTrades) {
      transactions.push({
        id: trade.id,
        type: 'MARKET_BET',
        transactionHash: trade.transactionHash,
        relatedAddress: trade.opinionMarket.creatorAddress,
        amount: this.formatUSDC(BigInt(trade.amount)),
        shares: this.formatUSDC(BigInt(trade.sharesPurchased)),
        timestamp: trade.timestamp,
        status: 'SUCCESS',
        details: {
          outcome: trade.outcome ? 'YES' : 'NO',
          question: trade.opinionMarket.question,
        },
      });
    }

    // Get dividend claims
    const dividendClaims = await this.dividendClaimRepository.find({
      where: { claimer: user.walletAddress },
      relations: ['claimableDividend', 'claimableDividend.dividendEpoch'],
      order: { claimedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    for (const claim of dividendClaims) {
      transactions.push({
        id: claim.id,
        type: 'DIVIDEND_CLAIM',
        transactionHash: claim.transactionHash,
        relatedAddress: claim.claimableDividend.dividendEpoch.creatorAddress,
        amount: this.formatUSDC(BigInt(claim.amount)),
        shares: '0',
        timestamp: claim.claimedAt,
        status: 'SUCCESS',
        details: {
          epochNumber: claim.claimableDividend.dividendEpoch.epochNumber,
        },
      });
    }

    // Sort all transactions by timestamp
    return transactions
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
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
