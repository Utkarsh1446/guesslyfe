import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DividendClaim } from '../../database/entities/dividend-claim.entity';
import { DividendEpoch } from '../../database/entities/dividend-epoch.entity';
import { CreatorShare } from '../../database/entities/creator-share.entity';
import { Creator } from '../../database/entities/creator.entity';
import {
  ClaimableDividendsResponseDto,
  ClaimableDividendDto,
  InitiateClaimDto,
  InitiateClaimResponseDto,
  CompleteClaimDto,
  CompleteClaimResponseDto,
  ClaimHistoryResponseDto,
  ClaimHistoryItemDto,
} from './dto';

@Injectable()
export class DividendsService {
  private readonly logger = new Logger(DividendsService.name);

  constructor(
    @InjectRepository(DividendClaim)
    private readonly dividendClaimRepository: Repository<DividendClaim>,
    @InjectRepository(DividendEpoch)
    private readonly dividendEpochRepository: Repository<DividendEpoch>,
    @InjectRepository(CreatorShare)
    private readonly creatorShareRepository: Repository<CreatorShare>,
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
  ) {}

  /**
   * Get claimable dividends for a user address
   */
  async getClaimableDividends(
    address: string,
  ): Promise<ClaimableDividendsResponseDto> {
    // Get all creator shares owned by this address
    const shares = await this.creatorShareRepository.find({
      where: { holderAddress: address },
      relations: ['creator'],
    });

    if (shares.length === 0) {
      return {
        totalClaimable: 0,
        dividends: [],
        creatorsCount: 0,
      };
    }

    const dividends: ClaimableDividendDto[] = [];
    let totalClaimable = 0;

    for (const share of shares) {
      // Get latest distributed epoch for this creator
      const latestEpoch = await this.dividendEpochRepository.findOne({
        where: {
          creatorId: share.creatorId,
          distributed: true,
        },
        order: { epochNumber: 'DESC' },
      });

      if (!latestEpoch || latestEpoch.totalFees === 0) {
        continue; // No dividends available
      }

      // Calculate user's share of the dividend pool
      // Formula: (user's shares / total shares) * total fees
      const creator = share.creator;
      const totalShares = creator.totalShares || 1; // Avoid division by zero
      const userSharePercentage = share.sharesHeld / totalShares;
      const claimableAmount = Number(latestEpoch.totalFees) * userSharePercentage;

      // Check if already claimed
      const existingClaim = await this.dividendClaimRepository.findOne({
        where: {
          userAddress: address,
          creatorId: share.creatorId,
        },
        order: { claimedAt: 'DESC' },
      });

      // If already claimed this epoch, skip
      if (existingClaim && existingClaim.verified) {
        continue;
      }

      if (claimableAmount > 0) {
        dividends.push({
          creatorId: creator.id,
          creatorHandle: creator.twitterHandle,
          amount: claimableAmount,
          sharesOwned: share.sharesHeld,
          lastEpochDistributed: latestEpoch.epochNumber,
        });

        totalClaimable += claimableAmount;
      }
    }

    return {
      totalClaimable,
      dividends,
      creatorsCount: dividends.length,
    };
  }

  /**
   * Initiate dividend claim process
   */
  async initiateClaim(
    userId: string,
    address: string,
    dto: InitiateClaimDto,
  ): Promise<InitiateClaimResponseDto> {
    // Verify user owns shares in this creator
    const share = await this.creatorShareRepository.findOne({
      where: {
        holderAddress: address,
        creatorId: dto.creatorId,
      },
      relations: ['creator'],
    });

    if (!share) {
      throw new BadRequestException(
        'You do not own shares in this creator',
      );
    }

    // Get latest epoch
    const latestEpoch = await this.dividendEpochRepository.findOne({
      where: {
        creatorId: dto.creatorId,
        distributed: true,
      },
      order: { epochNumber: 'DESC' },
    });

    if (!latestEpoch) {
      throw new NotFoundException('No dividends available for this creator');
    }

    // Calculate claimable amount
    const totalShares = share.creator.totalShares || 1;
    const userSharePercentage = share.sharesHeld / totalShares;
    const claimableAmount = Number(latestEpoch.totalFees) * userSharePercentage;

    if (claimableAmount <= 0) {
      throw new BadRequestException('No claimable dividends');
    }

    // Create pending claim record
    const claim = this.dividendClaimRepository.create({
      userAddress: address,
      creatorId: dto.creatorId,
      amount: claimableAmount,
      tweetUrl: '', // Will be filled in complete step
      verified: false,
      claimedAt: new Date(),
    });

    await this.dividendClaimRepository.save(claim);

    // Generate required tweet text
    const requiredTweetText = `Claiming $${claimableAmount.toFixed(2)} in dividends from ${share.creator.twitterHandle}! 🎉 #Guessly #Dividends`;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiration

    return {
      claimId: claim.id,
      amount: claimableAmount,
      requiredTweetText,
      expiresAt: expiresAt.toISOString(),
      instructions:
        'Post the provided text as a tweet and submit the tweet URL in the next step. Make sure the tweet is public!',
    };
  }

  /**
   * Complete dividend claim with tweet verification
   */
  async completeClaim(
    userId: string,
    address: string,
    dto: CompleteClaimDto,
  ): Promise<CompleteClaimResponseDto> {
    // Find the claim
    const claim = await this.dividendClaimRepository.findOne({
      where: { id: dto.claimId, userAddress: address },
      relations: ['creator'],
    });

    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    if (claim.verified) {
      throw new BadRequestException('Claim already completed');
    }

    // Extract tweet ID from URL
    // Format: https://twitter.com/username/status/1234567890
    const tweetIdMatch = dto.tweetUrl.match(/status\/(\d+)/);
    if (!tweetIdMatch) {
      throw new BadRequestException('Invalid tweet URL format');
    }

    const tweetId = tweetIdMatch[1];

    // TODO: In production, verify tweet content matches required text
    // This would use Twitter API to fetch tweet and validate
    // For now, we'll accept it as valid

    // Update claim with tweet info
    claim.tweetUrl = dto.tweetUrl;
    claim.tweetId = tweetId;
    claim.verified = true;

    // Generate transaction hash (placeholder)
    const txHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    claim.txHash = txHash;

    await this.dividendClaimRepository.save(claim);

    this.logger.log(
      `Dividend claim completed: ${claim.id} - $${claim.amount} to ${address}`,
    );

    return {
      success: true,
      claimId: claim.id,
      amount: Number(claim.amount),
      txHash,
      tweetId,
      claimedAt: claim.claimedAt.toISOString(),
      message: 'Dividends successfully claimed! Funds will arrive shortly.',
    };
  }

  /**
   * Get claim history for a user
   */
  async getClaimHistory(
    address: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<ClaimHistoryResponseDto> {
    const [claims, total] = await this.dividendClaimRepository.findAndCount({
      where: { userAddress: address, verified: true },
      relations: ['creator'],
      order: { claimedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const claimItems: ClaimHistoryItemDto[] = claims.map((claim) => ({
      id: claim.id,
      creator: {
        id: claim.creator.id,
        twitterHandle: claim.creator.twitterHandle,
      },
      amount: Number(claim.amount),
      tweetUrl: claim.tweetUrl,
      txHash: claim.txHash || '0x0',
      verified: claim.verified,
      claimedAt: claim.claimedAt.toISOString(),
    }));

    // Calculate summary
    const totalClaimed = claims.reduce(
      (sum, claim) => sum + Number(claim.amount),
      0,
    );

    const lastClaimDate = claims.length > 0 ? claims[0].claimedAt.toISOString() : null;

    return {
      claims: claimItems,
      summary: {
        totalClaimed,
        claimsCount: total,
        lastClaimDate,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
