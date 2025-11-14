import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { CreatorShare } from '../../database/entities/creator-share.entity';
import { ShareTransaction } from '../../database/entities/share-transaction.entity';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { CreatorShareService } from '../../contracts/creator-share.service';
import { CreatorShareFactoryService } from '../../contracts/creator-share-factory.service';
import { ContractsService } from '../../contracts/contracts.service';
import {
  SharePriceQuoteDto,
  ShareHistoryDto,
  TrendingShareDto,
} from './dto/share-response.dto';

@Injectable()
export class SharesService {
  private readonly FEE_PRECISION = 10000; // Basis points
  private readonly PROTOCOL_FEE_BPS = 250; // 2.5%
  private readonly CREATOR_FEE_BPS = 250; // 2.5%

  constructor(
    @InjectRepository(CreatorShare)
    private readonly creatorShareRepository: Repository<CreatorShare>,
    @InjectRepository(ShareTransaction)
    private readonly shareTransactionRepository: Repository<ShareTransaction>,
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly creatorShareService: CreatorShareService,
    private readonly creatorShareFactoryService: CreatorShareFactoryService,
    private readonly contractsService: ContractsService,
  ) {}

  /**
   * Get buy price quote for creator shares
   * NOTE: This is READ-ONLY. Actual trading happens on frontend via user's wallet.
   */
  async getBuyPriceQuote(creatorAddress: string, amount: number): Promise<SharePriceQuoteDto> {
    // Validate creator exists
    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Check if shares are unlocked
    const volumeInfo = await this.creatorShareFactoryService.getVolumeInfo(creatorAddress);
    if (!volumeInfo.isUnlocked) {
      throw new BadRequestException('Creator shares are not yet unlocked for trading');
    }

    // Convert amount to smallest units (6 decimals like USDC)
    const amountInUnits = BigInt(amount) * BigInt(1e6);

    // Get buy price from smart contract
    const priceResult = await this.creatorShareService.getBuyPrice(creatorAddress, amountInUnits);
    const basePrice = BigInt(priceResult.priceInUSDC);

    // Calculate fees
    const protocolFee = (basePrice * BigInt(this.PROTOCOL_FEE_BPS)) / BigInt(this.FEE_PRECISION);
    const creatorFee = (basePrice * BigInt(this.CREATOR_FEE_BPS)) / BigInt(this.FEE_PRECISION);
    const totalCost = basePrice + protocolFee + creatorFee;

    // Calculate price per share
    const pricePerShare = basePrice / amountInUnits;

    return new SharePriceQuoteDto({
      creatorAddress,
      amount: amount.toString(),
      priceInUSDC: this.formatUSDC(basePrice),
      pricePerShare: this.formatUSDC(pricePerShare * BigInt(1e6)),
      protocolFee: this.formatUSDC(protocolFee),
      creatorFee: this.formatUSDC(creatorFee),
      totalCost: this.formatUSDC(totalCost),
    });
  }

  /**
   * Get sell price quote for creator shares
   * NOTE: This is READ-ONLY. Actual trading happens on frontend via user's wallet.
   */
  async getSellPriceQuote(creatorAddress: string, amount: number): Promise<SharePriceQuoteDto> {
    // Validate creator exists
    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Check if shares exist
    const volumeInfo = await this.creatorShareFactoryService.getVolumeInfo(creatorAddress);
    if (!volumeInfo.isUnlocked) {
      throw new BadRequestException('Creator shares are not yet unlocked for trading');
    }

    // Convert amount to smallest units
    const amountInUnits = BigInt(amount) * BigInt(1e6);

    // Get sell price from smart contract
    const priceResult = await this.creatorShareService.getSellPrice(creatorAddress, amountInUnits);
    const basePrice = BigInt(priceResult.priceInUSDC);

    // Calculate fees (deducted from proceeds)
    const protocolFee = (basePrice * BigInt(this.PROTOCOL_FEE_BPS)) / BigInt(this.FEE_PRECISION);
    const creatorFee = (basePrice * BigInt(this.CREATOR_FEE_BPS)) / BigInt(this.FEE_PRECISION);
    const netProceeds = basePrice - protocolFee - creatorFee;

    // Calculate price per share
    const pricePerShare = basePrice / amountInUnits;

    return new SharePriceQuoteDto({
      creatorAddress,
      amount: amount.toString(),
      priceInUSDC: this.formatUSDC(basePrice),
      pricePerShare: this.formatUSDC(pricePerShare * BigInt(1e6)),
      protocolFee: this.formatUSDC(protocolFee),
      creatorFee: this.formatUSDC(creatorFee),
      totalCost: this.formatUSDC(netProceeds), // For sells, this is net proceeds
    });
  }

  /**
   * Get trading history for a creator's shares
   */
  async getShareHistory(
    creatorAddress: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ShareHistoryDto[]> {
    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const transactions = await this.shareTransactionRepository.find({
      where: { creatorShare: { creatorAddress: creatorAddress.toLowerCase() } },
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });

    const history: ShareHistoryDto[] = [];

    for (const tx of transactions) {
      // Try to find user by wallet address
      const user = await this.userRepository.findOne({
        where: { walletAddress: tx.buyer.toLowerCase() },
      });

      history.push({
        id: tx.id,
        transactionType: tx.transactionType,
        trader: tx.buyer,
        traderHandle: user?.twitterHandle,
        shares: this.formatUSDC(BigInt(tx.shares)),
        pricePerShare: this.formatUSDC(BigInt(tx.pricePerShare)),
        totalPrice: this.formatUSDC(BigInt(tx.totalPrice)),
        protocolFee: this.formatUSDC(BigInt(tx.protocolFee)),
        creatorFee: this.formatUSDC(BigInt(tx.creatorFee)),
        transactionHash: tx.transactionHash,
        blockNumber: tx.blockNumber,
        timestamp: tx.timestamp,
      });
    }

    return history;
  }

  /**
   * Get trending shares by 24h volume
   */
  async getTrendingShares(limit: number = 10): Promise<TrendingShareDto[]> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Get all creators with their 24h volume
    const creators = await this.creatorRepository.find({
      where: { status: 'APPROVED' },
      relations: ['user', 'creatorShare'],
    });

    const trending: TrendingShareDto[] = [];

    for (const creator of creators) {
      if (!creator.creatorShare) continue;

      // Calculate 24h volume
      const transactions24h = await this.shareTransactionRepository.find({
        where: {
          creatorShare: { creatorAddress: creator.creatorAddress },
          timestamp: MoreThan(oneDayAgo),
        },
      });

      if (transactions24h.length === 0) continue;

      // Sum 24h volume
      let volume24h = BigInt(0);
      const uniqueTraders = new Set<string>();

      for (const tx of transactions24h) {
        volume24h += BigInt(tx.totalPrice);
        uniqueTraders.add(tx.buyer.toLowerCase());
      }

      // Get current price (buy price for 1 share)
      let currentPrice = '0';
      try {
        const priceQuote = await this.getBuyPriceQuote(creator.creatorAddress, 1);
        currentPrice = priceQuote.pricePerShare;
      } catch (error) {
        continue; // Skip if shares not unlocked
      }

      // Calculate 24h price change
      // Get first and last transaction prices
      const sortedTxs = transactions24h.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      const firstPrice = BigInt(sortedTxs[0].pricePerShare);
      const lastPrice = BigInt(sortedTxs[sortedTxs.length - 1].pricePerShare);
      const priceChange24h = firstPrice > BigInt(0)
        ? Number(((lastPrice - firstPrice) * BigInt(10000)) / firstPrice) / 100
        : 0;

      // Get current supply
      const supply = await this.creatorShareService.getCurrentSupply(creator.creatorAddress);

      trending.push({
        creatorAddress: creator.creatorAddress,
        twitterHandle: creator.user.twitterHandle,
        displayName: creator.user.displayName,
        profilePictureUrl: creator.profilePictureUrl,
        volume24h: this.formatUSDC(volume24h),
        priceChange24h,
        currentPrice,
        traders24h: uniqueTraders.size,
        totalSupply: supply.supplyFormatted,
      });
    }

    // Sort by 24h volume (descending)
    trending.sort((a, b) => parseFloat(b.volume24h) - parseFloat(a.volume24h));

    return trending.slice(0, limit);
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
