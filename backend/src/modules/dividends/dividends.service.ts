import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DividendEpoch } from '../../database/entities/dividend-epoch.entity';
import { ClaimableDividend } from '../../database/entities/claimable-dividend.entity';
import { DividendClaim } from '../../database/entities/dividend-claim.entity';
import { Creator } from '../../database/entities/creator.entity';
import { User } from '../../database/entities/user.entity';
import { CreatorShareService } from '../../contracts/creator-share.service';
import {
  DividendEpochDto,
  ClaimableDividendDto,
  DividendClaimDto,
  CurrentEpochInfoDto,
} from './dto/dividend-response.dto';

@Injectable()
export class DividendsService {
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
        totalShares: supply.supplyFormatted,
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
        : supply.supplyFormatted,
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
        blockNumber: claim.blockNumber,
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

    return claims.map((claim) => ({
      id: claim.id,
      creatorAddress: claim.claimableDividend.dividendEpoch.creatorAddress,
      epochNumber: claim.claimableDividend.dividendEpoch.epochNumber,
      claimer: claim.claimer,
      claimerHandle: user.twitterHandle,
      amount: this.formatUSDC(BigInt(claim.amount)),
      transactionHash: claim.transactionHash,
      blockNumber: claim.blockNumber,
      claimedAt: claim.claimedAt,
    }));
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
      creatorAddress: epoch.creatorAddress,
      epochNumber: epoch.epochNumber,
      startTime: epoch.startTime,
      endTime: epoch.endTime,
      totalDividends: this.formatUSDC(totalDividends),
      totalSharesAtSnapshot: this.formatUSDC(BigInt(epoch.totalSharesAtSnapshot)),
      isFinalized: epoch.isFinalized,
      finalizedAt: epoch.finalizedAt,
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
      creatorAddress: claimable.dividendEpoch.creatorAddress,
      epochNumber: claimable.dividendEpoch.epochNumber,
      shareholder: claimable.shareholder,
      sharesHeld: this.formatUSDC(BigInt(claimable.sharesHeld)),
      claimableAmount: this.formatUSDC(BigInt(claimable.claimableAmount)),
      isClaimed: claimable.isClaimed,
      claimedAt: claimable.claimedAt,
      transactionHash: claimable.transactionHash,
      epochEndTime: claimable.dividendEpoch.endTime,
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
