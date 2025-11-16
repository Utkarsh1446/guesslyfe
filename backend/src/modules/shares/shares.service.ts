import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { CreatorStatus } from "../../database/enums";
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
import { BuySharesDto } from './dto/buy-shares.dto';
import { SellSharesDto } from './dto/sell-shares.dto';
import {
  BuySharesResponseDto,
  SellSharesResponseDto,
  UnsignedTransactionDto,
} from './dto/unsigned-transaction.dto';
import { ShareChartDataDto, ChartDataPointDto } from './dto/chart-data.dto';

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
      where: { creator: { creatorAddress: creatorAddress.toLowerCase() } },
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });

    const history: ShareHistoryDto[] = [];

    for (const tx of transactions) {
      if (!tx.buyer) continue; // Skip if no buyer

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
        pricePerShare: this.formatUSDC(BigInt(tx.pricePerShare || 0)),
        totalPrice: this.formatUSDC(BigInt(tx.totalAmount)),
        protocolFee: this.formatUSDC(BigInt(tx.protocolFee)),
        creatorFee: this.formatUSDC(BigInt(tx.creatorFee)),
        transactionHash: tx.txHash || '',
        blockNumber: tx.blockNumber || 0,
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
      where: { status: CreatorStatus.APPROVED },
      relations: ['user'],
    });

    const trending: TrendingShareDto[] = [];

    for (const creator of creators) {
      if (!creator.creatorAddress) continue;

      // Calculate 24h volume
      const transactions24h = await this.shareTransactionRepository.find({
        where: {
          creator: { creatorAddress: creator.creatorAddress },
          timestamp: MoreThan(oneDayAgo),
        },
      });

      if (transactions24h.length === 0) continue;

      // Sum 24h volume
      let volume24h = BigInt(0);
      const uniqueTraders = new Set<string>();

      for (const tx of transactions24h) {
        volume24h += BigInt(tx.totalAmount);
        if (tx.buyer) uniqueTraders.add(tx.buyer.toLowerCase());
      }

      // Get current price (buy price for 1 share)
      if (!creator.creatorAddress) continue;

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
      const firstPrice = BigInt(sortedTxs[0].pricePerShare || 0);
      const lastPrice = BigInt(sortedTxs[sortedTxs.length - 1].pricePerShare || 0);
      const priceChange24h = firstPrice > BigInt(0)
        ? Number(((lastPrice - firstPrice) * BigInt(10000)) / firstPrice) / 100
        : 0;

      // Get current supply
      const supply = await this.creatorShareService.getCurrentSupply(creator.creatorAddress);

      trending.push({
        creatorAddress: creator.creatorAddress,
        twitterHandle: creator.user.twitterHandle,
        displayName: creator.user.displayName,
        profilePictureUrl: creator.profilePictureUrl || '',
        volume24h: this.formatUSDC(volume24h),
        priceChange24h,
        currentPrice,
        traders24h: uniqueTraders.size,
        totalSupply: supply.toString(),
      });
    }

    // Sort by 24h volume (descending)
    trending.sort((a, b) => parseFloat(b.volume24h) - parseFloat(a.volume24h));

    return trending.slice(0, limit);
  }

  /**
   * Prepare unsigned transaction for buying shares
   * NOTE: This generates the transaction data but does NOT execute it.
   * The frontend must sign and submit this transaction.
   */
  async prepareBuyTransaction(buyDto: BuySharesDto): Promise<BuySharesResponseDto> {
    const { creatorAddress, amount, maxPrice } = buyDto;

    // Validate creator and check shares unlocked
    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const volumeInfo = await this.creatorShareFactoryService.getVolumeInfo(creatorAddress);
    if (!volumeInfo.isUnlocked) {
      throw new BadRequestException('Creator shares are not yet unlocked for trading');
    }

    // Get share contract address
    const shareContractAddress = await this.creatorShareFactoryService.getShareContract(creatorAddress);
    if (!shareContractAddress) {
      throw new NotFoundException('Share contract not found');
    }

    // Get current price quote
    const priceQuote = await this.getBuyPriceQuote(creatorAddress, amount);

    // Validate maxPrice (slippage protection)
    const maxPriceInUSDC = parseFloat(maxPrice) * 1e6;
    const totalCostInUSDC = parseFloat(priceQuote.totalCost) * 1e6;

    if (totalCostInUSDC > maxPriceInUSDC) {
      throw new BadRequestException(
        `Price ${priceQuote.totalCost} USDC exceeds maxPrice ${maxPrice} USDC (slippage protection)`,
      );
    }

    // Encode function call: buyShares(uint256 amount)
    const amountInUnits = BigInt(amount) * BigInt(1e6);
    const shareContract = await this.contractsService.getCreatorShareContract(shareContractAddress);

    // Encode the function call
    const data = shareContract.interface.encodeFunctionData('buyShares', [amountInUnits]);

    const unsignedTx = new UnsignedTransactionDto({
      to: shareContractAddress,
      data,
      value: '0',
      gasLimit: '300000', // Estimate
      description: `Buy ${amount} shares of creator ${creatorAddress}`,
    });

    return new BuySharesResponseDto({
      unsignedTx,
      estimatedCost: priceQuote.totalCost,
      shares: amount.toString(),
      creatorAddress,
      shareContractAddress,
    });
  }

  /**
   * Prepare unsigned transaction for selling shares
   * NOTE: This generates the transaction data but does NOT execute it.
   * The frontend must sign and submit this transaction.
   */
  async prepareSellTransaction(sellDto: SellSharesDto): Promise<SellSharesResponseDto> {
    const { creatorAddress, amount, minPrice } = sellDto;

    // Validate creator and check shares unlocked
    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const volumeInfo = await this.creatorShareFactoryService.getVolumeInfo(creatorAddress);
    if (!volumeInfo.isUnlocked) {
      throw new BadRequestException('Creator shares are not yet unlocked for trading');
    }

    // Get share contract address
    const shareContractAddress = await this.creatorShareFactoryService.getShareContract(creatorAddress);
    if (!shareContractAddress) {
      throw new NotFoundException('Share contract not found');
    }

    // Get current price quote
    const priceQuote = await this.getSellPriceQuote(creatorAddress, amount);

    // Validate minPrice (slippage protection)
    const minPriceInUSDC = parseFloat(minPrice) * 1e6;
    const netProceedsInUSDC = parseFloat(priceQuote.totalCost) * 1e6; // totalCost is net proceeds for sells

    if (netProceedsInUSDC < minPriceInUSDC) {
      throw new BadRequestException(
        `Net proceeds ${priceQuote.totalCost} USDC below minPrice ${minPrice} USDC (slippage protection)`,
      );
    }

    // Encode function call: sellShares(uint256 amount)
    const amountInUnits = BigInt(amount) * BigInt(1e6);
    const shareContract = await this.contractsService.getCreatorShareContract(shareContractAddress);

    // Encode the function call
    const data = shareContract.interface.encodeFunctionData('sellShares', [amountInUnits]);

    const unsignedTx = new UnsignedTransactionDto({
      to: shareContractAddress,
      data,
      value: '0',
      gasLimit: '300000', // Estimate
      description: `Sell ${amount} shares of creator ${creatorAddress}`,
    });

    return new SellSharesResponseDto({
      unsignedTx,
      estimatedProceeds: priceQuote.totalCost, // Net proceeds after fees
      shares: amount.toString(),
      creatorAddress,
      shareContractAddress,
    });
  }

  /**
   * Get price chart data for creator shares
   */
  async getChartData(
    creatorAddress: string,
    timeframe: '24h' | '7d' | '30d' | 'all',
  ): Promise<ShareChartDataDto> {
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

    // Calculate time range
    let startTime: Date;
    const now = new Date();

    switch (timeframe) {
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
        startTime = new Date(0); // Beginning of time
        break;
    }

    // Get all transactions in time range
    const transactions = await this.shareTransactionRepository.find({
      where: {
        creator: { creatorAddress: creatorAddress.toLowerCase() },
        timestamp: MoreThan(startTime),
      },
      order: { timestamp: 'ASC' },
    });

    // Group transactions into time buckets
    const bucketSize = this.getChartBucketSize(timeframe);
    const dataPoints: ChartDataPointDto[] = [];

    // Create buckets
    const buckets = new Map<number, { volume: bigint; prices: bigint[]; txCount: number }>();

    for (const tx of transactions) {
      const bucketKey = Math.floor(tx.timestamp.getTime() / bucketSize) * bucketSize;

      const bucket = buckets.get(bucketKey) || { volume: BigInt(0), prices: [], txCount: 0 };
      bucket.volume += BigInt(tx.totalAmount);
      if (tx.pricePerShare) bucket.prices.push(BigInt(tx.pricePerShare));
      bucket.txCount += 1;
      buckets.set(bucketKey, bucket);
    }

    // Convert buckets to data points
    for (const [bucketKey, bucket] of Array.from(buckets.entries()).sort((a, b) => a[0] - b[0])) {
      // Calculate average price for this bucket
      const avgPrice = bucket.prices.reduce((sum, p) => sum + p, BigInt(0)) / BigInt(bucket.prices.length);

      dataPoints.push({
        timestamp: new Date(bucketKey),
        price: this.formatUSDC(avgPrice),
        volume: this.formatUSDC(bucket.volume),
        transactions: bucket.txCount,
      });
    }

    // Calculate statistics
    let lowPrice = BigInt(Number.MAX_SAFE_INTEGER);
    let highPrice = BigInt(0);
    let totalVolume = BigInt(0);
    let firstPrice = BigInt(0);
    let lastPrice = BigInt(0);

    if (transactions.length > 0) {
      for (const tx of transactions) {
        const price = BigInt(tx.pricePerShare || 0);
        if (price < lowPrice) lowPrice = price;
        if (price > highPrice) highPrice = price;
        totalVolume += BigInt(tx.totalAmount);
      }
      firstPrice = BigInt(transactions[0].pricePerShare || 0);
      lastPrice = BigInt(transactions[transactions.length - 1].pricePerShare || 0);
    }

    // Get current price
    const currentPriceQuote = await this.getBuyPriceQuote(creatorAddress, 1);
    const currentPrice = currentPriceQuote.pricePerShare;

    // Calculate price change
    const priceChange = firstPrice > BigInt(0)
      ? Number(((lastPrice - firstPrice) * BigInt(10000)) / firstPrice) / 100
      : 0;

    return new ShareChartDataDto({
      creatorAddress,
      timeframe,
      data: dataPoints,
      currentPrice,
      lowPrice: lowPrice === BigInt(Number.MAX_SAFE_INTEGER) ? '0' : this.formatUSDC(lowPrice),
      highPrice: this.formatUSDC(highPrice),
      totalVolume: this.formatUSDC(totalVolume),
      priceChange,
    });
  }

  /**
   * Helper: Get bucket size for chart data based on timeframe
   */
  private getChartBucketSize(timeframe: '24h' | '7d' | '30d' | 'all'): number {
    switch (timeframe) {
      case '24h':
        return 60 * 60 * 1000; // 1 hour buckets
      case '7d':
        return 6 * 60 * 60 * 1000; // 6 hour buckets
      case '30d':
        return 24 * 60 * 60 * 1000; // 24 hour buckets
      case 'all':
        return 7 * 24 * 60 * 60 * 1000; // 7 day buckets
    }
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
