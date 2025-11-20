import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { Creator } from '../../database/entities/creator.entity';
import { CreatorShare } from '../../database/entities/creator-share.entity';
import { ShareTransaction } from '../../database/entities/share-transaction.entity';
import { CreatorShareService } from '../../contracts/creator-share.service';
import { ContractsService } from '../../contracts/contracts.service';
import {
  SharePriceResponseDto,
  SharePriceQueryDto,
  TradeAction,
  BuySharesDto,
  BuySharesResponseDto,
  SellSharesDto,
  SellSharesResponseDto,
  ShareHoldingsResponseDto,
  ShareHoldingDto,
  PortfolioSummaryDto,
  ShareTransactionListResponseDto,
  ShareTransactionDto,
  PaginationDto,
  ShareChartResponseDto,
  ShareChartDataPointDto,
  ShareChartSummaryDto,
  ChartTimeframe,
  ChartInterval,
} from './dto';

@Injectable()
export class SharesService {
  private readonly logger = new Logger(SharesService.name);

  constructor(
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    @InjectRepository(CreatorShare)
    private readonly creatorShareRepository: Repository<CreatorShare>,
    @InjectRepository(ShareTransaction)
    private readonly shareTransactionRepository: Repository<ShareTransaction>,
    private readonly creatorShareService: CreatorShareService,
    private readonly contractsService: ContractsService,
  ) {}

  /**
   * Get share price quote (buy or sell)
   */
  async getSharePrice(
    creatorId: string,
    query: SharePriceQueryDto,
  ): Promise<SharePriceResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (!creator.sharesUnlocked || !creator.shareContractAddress) {
      throw new BadRequestException('Creator shares not yet unlocked');
    }

    const amount = BigInt(query.amount);
    const currentSupply = await this.creatorShareService.getCurrentSupply(
      creator.shareContractAddress,
    );

    let priceInfo;
    let newSupply;

    if (query.action === TradeAction.BUY) {
      priceInfo = await this.creatorShareService.getBuyPrice(
        creator.shareContractAddress,
        amount,
      );
      newSupply = currentSupply + amount;
    } else {
      priceInfo = await this.creatorShareService.getSellPrice(
        creator.shareContractAddress,
        amount,
      );
      newSupply = currentSupply - amount;
    }

    const totalCost = parseFloat(priceInfo.priceFormatted);
    const pricePerShare = totalCost / query.amount;
    const priceImpact = this.calculatePriceImpact(
      currentSupply,
      newSupply,
      query.action,
    );

    return {
      action: query.action,
      amount: query.amount,
      pricePerShare,
      totalCost,
      fee: 0, // No fee on buy
      priceImpact,
      currentSupply: Number(currentSupply),
      newSupply: Number(newSupply),
    };
  }

  /**
   * Prepare buy shares transaction
   */
  async prepareBuyTransaction(
    userId: string,
    buyDto: BuySharesDto,
  ): Promise<BuySharesResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { id: buyDto.creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (!creator.sharesUnlocked || !creator.shareContractAddress) {
      throw new BadRequestException('Creator shares not yet unlocked');
    }

    const amount = BigInt(buyDto.amount);
    const priceInfo = await this.creatorShareService.getBuyPrice(
      creator.shareContractAddress,
      amount,
    );

    const estimatedCost = parseFloat(priceInfo.priceFormatted);

    // Check max price if provided
    if (buyDto.maxPrice && estimatedCost > buyDto.maxPrice) {
      throw new BadRequestException(
        `Price ${estimatedCost} exceeds maximum ${buyDto.maxPrice}`,
      );
    }

    // Get contract instance
    const contract = this.contractsService.getCreatorShareContract(
      creator.shareContractAddress,
    );

    // Prepare transaction data
    const txData = await contract.buyShares.populateTransaction(amount);

    return {
      success: true,
      unsignedTx: {
        to: creator.shareContractAddress,
        data: txData.data || '0x',
        value: '0',
        gasLimit: '200000',
      },
      expectedShares: buyDto.amount,
      estimatedCost,
      fee: 0,
    };
  }

  /**
   * Prepare sell shares transaction
   */
  async prepareSellTransaction(
    userId: string,
    sellDto: SellSharesDto,
  ): Promise<SellSharesResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { id: sellDto.creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (!creator.sharesUnlocked || !creator.shareContractAddress) {
      throw new BadRequestException('Creator shares not yet unlocked');
    }

    const amount = BigInt(sellDto.amount);
    const priceInfo = await this.creatorShareService.getSellPrice(
      creator.shareContractAddress,
      amount,
    );

    const grossProceeds = parseFloat(priceInfo.priceFormatted);

    // 5% total fee: 2.5% platform, 2.5% to shareholders
    const totalFee = grossProceeds * 0.05;
    const platformFee = totalFee / 2;
    const shareholderFee = totalFee / 2;
    const expectedProceeds = grossProceeds - totalFee;

    // Check min price if provided
    if (sellDto.minPrice && expectedProceeds < sellDto.minPrice) {
      throw new BadRequestException(
        `Proceeds ${expectedProceeds} below minimum ${sellDto.minPrice}`,
      );
    }

    // Get contract instance
    const contract = this.contractsService.getCreatorShareContract(
      creator.shareContractAddress,
    );

    // Prepare transaction data
    const txData = await contract.sellShares.populateTransaction(amount);

    return {
      success: true,
      unsignedTx: {
        to: creator.shareContractAddress,
        data: txData.data || '0x',
        value: '0',
        gasLimit: '200000',
      },
      expectedProceeds,
      fee: totalFee,
      feeBreakdown: {
        platform: platformFee,
        shareholders: shareholderFee,
      },
    };
  }

  /**
   * Get user's share holdings portfolio
   */
  async getUserPortfolio(address: string): Promise<ShareHoldingsResponseDto> {
    const holdings = await this.creatorShareRepository.find({
      where: { holderAddress: address.toLowerCase() },
      relations: ['creator', 'creator.user'],
    });

    if (holdings.length === 0) {
      return {
        holdings: [],
        summary: {
          totalValue: 0,
          totalInvested: 0,
          totalPnL: 0,
          totalPnLPercent: 0,
        },
      };
    }

    // Get current prices for all holdings
    const holdingDtos: (ShareHoldingDto | null)[] = await Promise.all(
      holdings.map(async (holding) => {
        const creator = holding.creator;

        if (!creator.shareContractAddress) {
          // Shares not yet deployed
          return null;
        }

        let currentPrice = 0;
        try {
          const priceInfo = await this.creatorShareService.getSellPrice(
            creator.shareContractAddress,
            BigInt(1),
          );
          currentPrice = parseFloat(priceInfo.priceFormatted);
        } catch (error) {
          this.logger.warn(
            `Failed to get price for creator ${creator.id}: ${error.message}`,
          );
        }

        const currentSupply = await this.creatorShareService.getCurrentSupply(
          creator.shareContractAddress,
        );

        const totalValue = currentPrice * holding.sharesHeld;
        const totalInvested = holding.totalInvested || 0;
        const unrealizedPnL = totalValue - totalInvested;
        const unrealizedPnLPercent =
          totalInvested > 0 ? (unrealizedPnL / totalInvested) * 100 : 0;
        const percentOfSupply =
          Number(currentSupply) > 0
            ? (holding.sharesHeld / Number(currentSupply)) * 100
            : 0;

        return {
          creatorId: creator.id,
          creatorName: creator.user?.displayName || creator.twitterHandle,
          creatorHandle: creator.twitterHandle,
          sharesHeld: holding.sharesHeld,
          averageBuyPrice: holding.averageBuyPrice || 0,
          currentPrice,
          totalValue,
          totalInvested,
          unrealizedPnL,
          unrealizedPnLPercent,
          percentOfSupply,
        };
      }),
    );

    // Filter out null values
    const validHoldings = holdingDtos.filter((h) => h !== null) as ShareHoldingDto[];

    // Calculate summary
    const summary: PortfolioSummaryDto = validHoldings.reduce(
      (acc, holding) => ({
        totalValue: acc.totalValue + holding.totalValue,
        totalInvested: acc.totalInvested + holding.totalInvested,
        totalPnL: acc.totalPnL + holding.unrealizedPnL,
        totalPnLPercent: 0, // Calculate after
      }),
      {
        totalValue: 0,
        totalInvested: 0,
        totalPnL: 0,
        totalPnLPercent: 0,
      },
    );

    summary.totalPnLPercent =
      summary.totalInvested > 0
        ? (summary.totalPnL / summary.totalInvested) * 100
        : 0;

    return {
      holdings: validHoldings,
      summary,
    };
  }

  /**
   * Get transaction history for a creator's shares
   */
  async getTransactionHistory(
    creatorId: string,
    page: number = 1,
    limit: number = 20,
    type?: 'BUY' | 'SELL',
    address?: string,
  ): Promise<ShareTransactionListResponseDto> {
    const where: any = { creatorId };

    if (type) {
      where.transactionType = type;
    }

    if (address) {
      where.buyerAddress = address.toLowerCase();
    }

    const [transactions, total] = await this.shareTransactionRepository.findAndCount({
      where,
      order: { timestamp: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const transactionDtos: ShareTransactionDto[] = transactions.map((tx) => ({
      id: tx.id,
      type: tx.transactionType,
      buyer: tx.buyerAddress,
      seller: tx.sellerAddress,
      shares: tx.shares,
      pricePerShare: tx.pricePerShare || 0,
      totalAmount: tx.totalAmount || 0,
      fee: tx.fees || 0,
      txHash: tx.txHash,
      timestamp: tx.timestamp.toISOString(),
    }));

    const pagination: PaginationDto = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return {
      transactions: transactionDtos,
      pagination,
    };
  }

  /**
   * Get chart data for share price history
   */
  async getChartData(
    creatorId: string,
    timeframe: ChartTimeframe = ChartTimeframe.DAYS_7,
    interval: ChartInterval = ChartInterval.HOUR_1,
  ): Promise<ShareChartResponseDto> {
    const creator = await this.creatorRepository.findOne({
      where: { id: creatorId },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    if (!creator.shareContractAddress) {
      throw new BadRequestException('Creator shares not deployed');
    }

    // Calculate timeframe start
    const now = new Date();
    let startDate = new Date();

    switch (timeframe) {
      case ChartTimeframe.HOUR_24:
        startDate.setHours(now.getHours() - 24);
        break;
      case ChartTimeframe.DAYS_7:
        startDate.setDate(now.getDate() - 7);
        break;
      case ChartTimeframe.DAYS_30:
        startDate.setDate(now.getDate() - 30);
        break;
      case ChartTimeframe.ALL:
        startDate = new Date(0); // Beginning of time
        break;
    }

    // Get transactions in timeframe
    const transactions = await this.shareTransactionRepository.find({
      where: {
        creatorId,
        timestamp: MoreThan(startDate),
      },
      order: { timestamp: 'ASC' },
    });

    // Get current price
    let currentPrice = 0;
    try {
      const priceInfo = await this.creatorShareService.getSellPrice(
        creator.shareContractAddress,
        BigInt(1),
      );
      currentPrice = parseFloat(priceInfo.priceFormatted);
    } catch (error) {
      this.logger.warn(`Failed to get current price: ${error.message}`);
    }

    // Aggregate data by interval
    const dataPoints = this.aggregateChartData(transactions, interval);

    // Calculate 24h stats
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentTransactions = transactions.filter(
      (tx) => tx.timestamp > yesterday,
    );

    const volume24h = recentTransactions.reduce(
      (sum, tx) => sum + (tx.totalAmount || 0),
      0,
    );

    const price24hAgo =
      recentTransactions.length > 0
        ? recentTransactions[0].pricePerShare || currentPrice
        : currentPrice;

    const priceChange24h = currentPrice - price24hAgo;
    const priceChangePercent24h =
      price24hAgo > 0 ? (priceChange24h / price24hAgo) * 100 : 0;

    // Calculate all-time high/low
    const allPrices = transactions
      .map((tx) => tx.pricePerShare || 0)
      .filter((p) => p > 0);

    const allTimeHigh = allPrices.length > 0 ? Math.max(...allPrices) : currentPrice;
    const allTimeLow = allPrices.length > 0 ? Math.min(...allPrices) : currentPrice;

    const summary: ShareChartSummaryDto = {
      currentPrice,
      priceChange24h,
      priceChangePercent24h,
      volume24h,
      allTimeHigh,
      allTimeLow,
    };

    return {
      data: dataPoints,
      summary,
    };
  }

  // Helper methods

  private calculatePriceImpact(
    currentSupply: bigint,
    newSupply: bigint,
    action: TradeAction,
  ): number {
    if (currentSupply === BigInt(0)) return 0;

    const supplyChange =
      action === TradeAction.BUY
        ? Number(newSupply - currentSupply)
        : Number(currentSupply - newSupply);

    return (supplyChange / Number(currentSupply)) * 100;
  }

  private aggregateChartData(
    transactions: ShareTransaction[],
    interval: ChartInterval,
  ): ShareChartDataPointDto[] {
    if (transactions.length === 0) return [];

    // Group transactions by interval
    const intervalMs = this.getIntervalMs(interval);
    const grouped = new Map<number, ShareTransaction[]>();

    transactions.forEach((tx) => {
      const bucket = Math.floor(tx.timestamp.getTime() / intervalMs) * intervalMs;
      if (!grouped.has(bucket)) {
        grouped.set(bucket, []);
      }
      grouped.get(bucket)!.push(tx); // Non-null assertion - we just set it above
    });

    // Create data points
    const dataPoints: ShareChartDataPointDto[] = [];

    grouped.forEach((txs, timestamp) => {
      const avgPrice =
        txs.reduce((sum, tx) => sum + (tx.pricePerShare || 0), 0) / txs.length;
      const volume = txs.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);
      const lastTx = txs[txs.length - 1];

      dataPoints.push({
        timestamp: new Date(timestamp).toISOString(),
        price: avgPrice,
        volume,
        supply: 0, // Would need to track supply changes
      });
    });

    return dataPoints.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }

  private getIntervalMs(interval: ChartInterval): number {
    switch (interval) {
      case ChartInterval.HOUR_1:
        return 60 * 60 * 1000;
      case ChartInterval.HOUR_4:
        return 4 * 60 * 60 * 1000;
      case ChartInterval.DAY_1:
        return 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000;
    }
  }
}
