import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DividendEpoch } from '../../database/entities/dividend-epoch.entity';
import { ClaimableDividend } from '../../database/entities/claimable-dividend.entity';
import { DividendClaim } from '../../database/entities/dividend-claim.entity';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { CreatorShareService } from '../../contracts/creator-share.service';
import { TwitterService } from '../twitter/twitter.service';
import { ContractsService } from '../../contracts/contracts.service';
import {
  DividendEpochDto,
  ClaimableDividendDto,
  DividendClaimDto,
  CurrentEpochInfoDto,
} from './dto/dividend-response.dto';
import {
  ClaimableDividendsResponseDto,
  ClaimableByCreatorDto,
  InitiateClaimResponseDto,
  CompleteClaimResponseDto,
} from './dto/dividend-claim-workflow.dto';

@Injectable()
export class DividendsService {
  private readonly MIN_CLAIM_AMOUNT = 5; // $5 USDC minimum
  private readonly MIN_CLAIM_DAYS = 7; // 7 days minimum wait

  constructor(
    @InjectRepository(DividendEpoch)
    private readonly dividendEpochRepository: Repository<DividendEpoch>,
    @InjectRepository(ClaimableDividend)
    private readonly claimableDividendRepository: Repository<ClaimableDividend>,
    @InjectRepository(DividendClaim)
    private readonly dividendClaimRepository: Repository<DividendClaim>,
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly creatorShareService: CreatorShareService,
    private readonly twitterService: TwitterService,
    private readonly contractsService: ContractsService,
  ) {}

  /**
   * Get dividend epochs for a creator
   */
  async getCreatorEpochs(
    creatorAddress: string,
    limit: number = 20,
    offset: number = 0,
  ): Promise<DividendEpochDto[]> {
    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    const epochs = await this.dividendEpochRepository.find({
      where: { creatorAddress: creatorAddress.toLowerCase() },
      order: { epochNumber: 'DESC' },
      take: limit,
      skip: offset,
    });

    return Promise.all(epochs.map((epoch) => this.buildEpochDto(epoch)));
  }

  /**
   * Get current epoch info for a creator
   */
  async getCurrentEpochInfo(creatorAddress: string): Promise<CurrentEpochInfoDto> {
    const creator = await this.creatorRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
    });

    if (!creator) {
      throw new NotFoundException('Creator not found');
    }

    // Get latest epoch
    const currentEpoch = await this.dividendEpochRepository.findOne({
      where: { creatorAddress: creatorAddress.toLowerCase() },
      order: { epochNumber: 'DESC' },
    });

    if (!currentEpoch) {
      // No epochs created yet
      const supply = await this.creatorShareService.getCurrentSupply(creatorAddress);

      return new CurrentEpochInfoDto({
        creatorAddress,
        currentEpochNumber: 0,
        currentEpochStart: new Date(),
        currentEpochEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        hoursRemaining: 168,
        isFinalized: false,
        accumulatedDividends: '0',
        totalShares: supply.toString(),
      });
    }

    // Calculate hours remaining
    const now = Date.now();
    const endTime = currentEpoch.endTime.getTime();
    const hoursRemaining = Math.max(0, Math.floor((endTime - now) / (1000 * 60 * 60)));

    // Get previous epoch
    let previousEpoch: DividendEpochDto | undefined;
    if (currentEpoch.epochNumber > 1) {
      const prevEpoch = await this.dividendEpochRepository.findOne({
        where: {
          creatorAddress: creatorAddress.toLowerCase(),
          epochNumber: currentEpoch.epochNumber - 1,
        },
      });

      if (prevEpoch) {
        previousEpoch = await this.buildEpochDto(prevEpoch);
      }
    }

    // Get current total supply
    const supply = await this.creatorShareService.getCurrentSupply(creatorAddress);

    return new CurrentEpochInfoDto({
      creatorAddress,
      currentEpochNumber: currentEpoch.epochNumber,
      currentEpochStart: currentEpoch.startTime,
      currentEpochEnd: currentEpoch.endTime,
      hoursRemaining,
      isFinalized: currentEpoch.isFinalized,
      accumulatedDividends: this.formatUSDC(BigInt(currentEpoch.totalDividends)),
      totalShares: currentEpoch.isFinalized
        ? this.formatUSDC(BigInt(currentEpoch.totalSharesAtSnapshot))
        : supply.toString(),
      previousEpoch,
    });
  }

  /**
   * Get epoch details by ID
   */
  async getEpochById(epochId: string): Promise<DividendEpochDto> {
    const epoch = await this.dividendEpochRepository.findOne({
      where: { id: epochId },
    });

    if (!epoch) {
      throw new NotFoundException(`Dividend epoch with ID ${epochId} not found`);
    }

    return this.buildEpochDto(epoch);
  }

  /**
   * Get all claims for an epoch
   */
  async getEpochClaims(
    epochId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<DividendClaimDto[]> {
    const epoch = await this.dividendEpochRepository.findOne({
      where: { id: epochId },
    });

    if (!epoch) {
      throw new NotFoundException(`Dividend epoch with ID ${epochId} not found`);
    }

    const claims = await this.dividendClaimRepository.find({
      where: { claimableDividend: { dividendEpoch: { id: epochId } } },
      relations: ['claimableDividend', 'claimableDividend.dividendEpoch'],
      order: { claimedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    const claimDtos: DividendClaimDto[] = [];

    for (const claim of claims) {
      if (!claim.claimer || !claim.claimableDividend?.dividendEpoch?.creatorAddress || !claim.transactionHash) {
        continue; // Skip invalid claims
      }

      // Try to find user by wallet address
      const user = await this.userRepository.findOne({
        where: { walletAddress: claim.claimer.toLowerCase() },
      });

      claimDtos.push({
        id: claim.id,
        creatorAddress: claim.claimableDividend.dividendEpoch.creatorAddress,
        epochNumber: claim.claimableDividend.dividendEpoch.epochNumber,
        claimer: claim.claimer,
        claimerHandle: user?.twitterHandle,
        amount: this.formatUSDC(BigInt(claim.amount)),
        transactionHash: claim.transactionHash,
        blockNumber: claim.blockNumber || 0,
        claimedAt: claim.claimedAt,
      });
    }

    return claimDtos;
  }

  /**
   * Get user's claimable dividends
   */
  async getUserClaimableDividends(userId: string): Promise<ClaimableDividendDto[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.walletAddress) {
      return []; // No wallet = no dividends
    }

    const claimable = await this.claimableDividendRepository.find({
      where: {
        shareholder: user.walletAddress.toLowerCase(),
        isClaimed: false,
      },
      relations: ['dividendEpoch'],
      order: { dividendEpoch: { epochNumber: 'DESC' } },
    });

    return claimable.map((c) => this.buildClaimableDto(c));
  }

  /**
   * Get user's dividend claim history
   */
  async getUserClaimHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<DividendClaimDto[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.walletAddress) {
      return [];
    }

    const claims = await this.dividendClaimRepository.find({
      where: { claimer: user.walletAddress.toLowerCase() },
      relations: ['claimableDividend', 'claimableDividend.dividendEpoch'],
      order: { claimedAt: 'DESC' },
      take: limit,
      skip: offset,
    });

    return claims
      .filter(claim =>
        claim.claimer &&
        claim.claimableDividend?.dividendEpoch?.creatorAddress &&
        claim.transactionHash
      )
      .map((claim) => ({
        id: claim.id,
        creatorAddress: claim.claimableDividend!.dividendEpoch!.creatorAddress!,
        epochNumber: claim.claimableDividend!.dividendEpoch!.epochNumber,
        claimer: claim.claimer!,
        claimerHandle: user.twitterHandle,
        amount: this.formatUSDC(BigInt(claim.amount)),
        transactionHash: claim.transactionHash!,
        blockNumber: claim.blockNumber || 0,
        claimedAt: claim.claimedAt,
      })) as DividendClaimDto[];
  }

  /**
   * Helper: Build epoch DTO
   */
  private async buildEpochDto(epoch: DividendEpoch): Promise<DividendEpochDto> {
    // Count claims
    const claimCount = await this.dividendClaimRepository.count({
      where: { claimableDividend: { dividendEpoch: { id: epoch.id } } },
    });

    // Calculate total claimed
    const claimedResult = await this.dividendClaimRepository
      .createQueryBuilder('claim')
      .select('SUM(claim.amount)', 'total')
      .innerJoin('claim.claimableDividend', 'claimable')
      .where('claimable.dividendEpochId = :epochId', { epochId: epoch.id })
      .getRawOne();

    const totalClaimed = BigInt(claimedResult.total || '0');
    const totalDividends = BigInt(epoch.totalDividends);
    const totalUnclaimed = totalDividends - totalClaimed;

    return new DividendEpochDto({
      id: epoch.id,
      creatorAddress: epoch.creatorAddress || '',
      epochNumber: epoch.epochNumber,
      startTime: epoch.startTime,
      endTime: epoch.endTime,
      totalDividends: this.formatUSDC(totalDividends),
      totalSharesAtSnapshot: this.formatUSDC(BigInt(epoch.totalSharesAtSnapshot)),
      isFinalized: epoch.isFinalized,
      finalizedAt: epoch.finalizedAt || undefined,
      totalClaimed: this.formatUSDC(totalClaimed),
      totalUnclaimed: this.formatUSDC(totalUnclaimed),
      claimantCount: claimCount,
      createdAt: epoch.createdAt,
    });
  }

  /**
   * Helper: Build claimable DTO
   */
  private buildClaimableDto(claimable: ClaimableDividend): ClaimableDividendDto {
    return new ClaimableDividendDto({
      id: claimable.id,
      creatorAddress: claimable.dividendEpoch?.creatorAddress || '',
      epochNumber: claimable.dividendEpoch?.epochNumber || 0,
      shareholder: claimable.shareholder || '',
      sharesHeld: this.formatUSDC(BigInt(claimable.sharesHeld)),
      claimableAmount: this.formatUSDC(BigInt(claimable.claimableAmount)),
      isClaimed: claimable.isClaimed,
      claimedAt: claimable.claimedAt || undefined,
      transactionHash: claimable.transactionHash || undefined,
      epochEndTime: claimable.dividendEpoch?.endTime || new Date(),
    });
  }

  /**
   * Get claimable dividends with requirements check
   */
  async getClaimableDividends(userAddress: string): Promise<ClaimableDividendsResponseDto> {
    const claimable = await this.claimableDividendRepository.find({
      where: {
        shareholder: userAddress.toLowerCase(),
        isClaimed: false,
      },
      relations: ['dividendEpoch'],
      order: { dividendEpoch: { epochNumber: 'ASC' } },
    });

    if (claimable.length === 0) {
      return new ClaimableDividendsResponseDto({
        total: '0.000000',
        byCreator: [],
        requirements: {
          minAmount: this.MIN_CLAIM_AMOUNT,
          minDays: this.MIN_CLAIM_DAYS,
        },
        canClaim: false,
        userAddress,
      });
    }

    // Group by creator
    const byCreatorMap = new Map<string, ClaimableDividend[]>();

    for (const c of claimable) {
      const creatorAddress = c.dividendEpoch?.creatorAddress;
      if (!creatorAddress) continue;

      if (!byCreatorMap.has(creatorAddress)) {
        byCreatorMap.set(creatorAddress, []);
      }
      byCreatorMap.get(creatorAddress)!.push(c);
    }

    const byCreator: ClaimableByCreatorDto[] = [];
    let totalAmount = BigInt(0);

    for (const [creatorAddress, dividends] of byCreatorMap.entries()) {
      // Get creator info
      const creator = await this.creatorRepository.findOne({
        where: { creatorAddress: creatorAddress.toLowerCase() },
        relations: ['user'],
      });

      if (!creator) continue;

      // Calculate total for this creator
      const creatorTotal = dividends.reduce(
        (sum, d) => sum + BigInt(d.claimableAmount),
        BigInt(0),
      );

      totalAmount += creatorTotal;

      // Get earliest and latest epochs
      const epochs = dividends.map((d) => d.dividendEpoch).filter((e): e is NonNullable<typeof e> => e !== null);
      if (epochs.length === 0) continue;

      const earliestEpoch = Math.min(...epochs.map((e) => e.epochNumber));
      const latestEpoch = Math.max(...epochs.map((e) => e.epochNumber));

      // Calculate days since first claimable
      const sortedEpochs = epochs.sort((a, b) => a.endTime.getTime() - b.endTime.getTime());
      const firstEndTime = sortedEpochs[0].endTime; // Safe: epochs.length > 0 is guaranteed by check above
      const daysSinceFirst = Math.floor((Date.now() - firstEndTime.getTime()) / (1000 * 60 * 60 * 24));

      // Check if meets requirements
      const creatorAmount = parseFloat(this.formatUSDC(creatorTotal));
      const canClaim =
        creatorAmount >= this.MIN_CLAIM_AMOUNT || daysSinceFirst >= this.MIN_CLAIM_DAYS;

      byCreator.push(
        new ClaimableByCreatorDto({
          creatorAddress,
          creatorHandle: '@' + creator.user.twitterHandle,
          amount: this.formatUSDC(creatorTotal),
          epochCount: dividends.length,
          earliestEpoch,
          latestEpoch,
          canClaim,
          daysSinceFirst,
        }),
      );
    }

    // Sort by amount descending
    byCreator.sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));

    // Can claim if any creator meets requirements
    const canClaim = byCreator.some((c) => c.canClaim);

    return new ClaimableDividendsResponseDto({
      total: this.formatUSDC(totalAmount),
      byCreator,
      requirements: {
        minAmount: this.MIN_CLAIM_AMOUNT,
        minDays: this.MIN_CLAIM_DAYS,
      },
      canClaim,
      userAddress,
    });
  }

  /**
   * Initiate claim process - generate tweet text
   */
  async initiateClaim(userId: string, creatorIds: string[]): Promise<InitiateClaimResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.walletAddress) {
      throw new NotFoundException('User or wallet address not found');
    }

    if (creatorIds.length === 0) {
      throw new BadRequestException('At least one creator must be specified');
    }

    // Get claimable dividends for these creators
    const claimable = await this.claimableDividendRepository.find({
      where: {
        shareholder: user.walletAddress.toLowerCase(),
        isClaimed: false,
      },
      relations: ['dividendEpoch'],
    });

    const relevantDividends = claimable.filter((c) =>
      c.dividendEpoch?.creatorAddress && creatorIds.includes(c.dividendEpoch.creatorAddress.toLowerCase()),
    );

    if (relevantDividends.length === 0) {
      throw new BadRequestException('No claimable dividends found for specified creators');
    }

    // Get creator handles
    const creatorHandles: string[] = [];
    let totalAmount = BigInt(0);

    const uniqueCreators = new Set(
      relevantDividends
        .map((d) => d.dividendEpoch?.creatorAddress)
        .filter((addr): addr is string => addr !== null && addr !== undefined)
    );

    for (const creatorAddress of uniqueCreators) {
      if (!creatorAddress) continue;

      const creator = await this.creatorRepository.findOne({
        where: { creatorAddress: creatorAddress.toLowerCase() },
        relations: ['user'],
      });

      if (creator) {
        creatorHandles.push('@' + creator.user.twitterHandle);
      }

      // Calculate total for this creator
      const creatorDividends = relevantDividends.filter(
        (d) => d.dividendEpoch?.creatorAddress === creatorAddress,
      );
      totalAmount += creatorDividends.reduce(
        (sum, d) => sum + BigInt(d.claimableAmount),
        BigInt(0),
      );
    }

    // Generate tweet text
    const tweetText = this.generateClaimTweetText(creatorHandles, totalAmount);

    // Generate tracking ID (timestamp + user ID hash)
    const tweetTrackingId = `claim-${Date.now()}-${user.id.slice(0, 8)}`;

    // Set expiration (1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    return new InitiateClaimResponseDto({
      tweetText,
      tweetTrackingId,
      totalAmount: this.formatUSDC(totalAmount),
      creatorHandles,
      expiresAt,
    });
  }

  /**
   * Complete claim process - verify tweet and return unsigned transaction
   */
  async completeClaim(
    userId: string,
    tweetUrl: string,
    creatorIds: string[],
  ): Promise<CompleteClaimResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user || !user.walletAddress || !user.twitterId) {
      throw new NotFoundException('User, wallet address, or Twitter ID not found');
    }

    if (creatorIds.length === 0) {
      throw new BadRequestException('At least one creator must be specified');
    }

    // Get creator handles for verification
    const creatorHandles: string[] = [];
    for (const creatorId of creatorIds) {
      const creator = await this.creatorRepository.findOne({
        where: { creatorAddress: creatorId.toLowerCase() },
        relations: ['user'],
      });

      if (creator) {
        creatorHandles.push('@' + creator.user.twitterHandle);
      }
    }

    // Verify tweet
    const verification = await this.twitterService.verifyTweet(
      tweetUrl,
      user.twitterId,
      creatorHandles,
    );

    if (!verification.isValid) {
      throw new BadRequestException(
        `Tweet verification failed: ${verification.errors.join(', ')}`,
      );
    }

    // Get claimable dividends
    const claimable = await this.claimableDividendRepository.find({
      where: {
        shareholder: user.walletAddress.toLowerCase(),
        isClaimed: false,
      },
      relations: ['dividendEpoch'],
    });

    const relevantDividends = claimable.filter((c) =>
      c.dividendEpoch?.creatorAddress && creatorIds.includes(c.dividendEpoch.creatorAddress.toLowerCase()),
    );

    if (relevantDividends.length === 0) {
      throw new BadRequestException('No claimable dividends found');
    }

    // Calculate total amount
    const totalAmount = relevantDividends.reduce(
      (sum, d) => sum + BigInt(d.claimableAmount),
      BigInt(0),
    );

    // TODO: Implement getCreatorShareFactoryContract and getContractAddress in ContractsService
    throw new BadRequestException('Claim workflow not yet implemented - missing contract methods');

    // Get CreatorShareFactory contract
    // const factoryContract = await this.contractsService.getCreatorShareFactoryContract();

    // Encode function call: claimDividends(address[] creators)
    // const data = factoryContract.interface.encodeFunctionData('claimDividends', [
    //   creatorIds.map((id) => id.toLowerCase()),
    // ]);

    // const unsignedTx = {
    //   to: await this.contractsService.getContractAddress('CreatorShareFactory'),
    //   data,
    //   value: '0',
    //   gasLimit: '500000',
    //   description: `Claim ${this.formatUSDC(totalAmount)} USDC in dividends from ${creatorIds.length} creator(s)`,
    // };

    // return new CompleteClaimResponseDto({
    //   unsignedTx,
    //   amount: this.formatUSDC(totalAmount),
    //   creators: creatorIds,
    //   tweetId: verification.tweetId,
    //   tweetVerified: true,
    // });
  }

  /**
   * Helper: Generate tweet text for claiming
   */
  private generateClaimTweetText(creatorHandles: string[], amount: bigint): string {
    const formattedAmount = this.formatUSDC(amount);

    if (creatorHandles.length === 1) {
      return `Claiming $${formattedAmount} in dividends from ${creatorHandles[0]} on @guesslydotfun! 💰`;
    } else if (creatorHandles.length === 2) {
      return `Claiming $${formattedAmount} in dividends from ${creatorHandles[0]} and ${creatorHandles[1]} on @guesslydotfun! 💰`;
    } else {
      const first = creatorHandles.slice(0, 2).join(', ');
      const remaining = creatorHandles.length - 2;
      return `Claiming $${formattedAmount} in dividends from ${first} and ${remaining} other creator${remaining > 1 ? 's' : ''} on @guesslydotfun! 💰`;
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
