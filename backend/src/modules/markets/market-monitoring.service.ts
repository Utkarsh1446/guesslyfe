import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Market } from '../../database/entities/market.entity';
import { MarketStatus } from '../../database/enums';

@Injectable()
export class MarketMonitoringService {
  private readonly logger = new Logger(MarketMonitoringService.name);

  constructor(
    @InjectRepository(Market)
    private readonly marketRepository: Repository<Market>,
  ) {}

  /**
   * Check for markets ending soon (every 5 minutes)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkMarketsEndingSoon() {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const marketsEndingSoon = await this.marketRepository.find({
        where: {
          status: MarketStatus.ACTIVE,
          endTime: LessThan(oneHourFromNow),
        },
        relations: ['creator', 'creator.user'],
      });

      if (marketsEndingSoon.length > 0) {
        this.logger.log(
          `Found ${marketsEndingSoon.length} markets ending within 1 hour`,
        );

        // TODO: Send notifications to participants
        // This would integrate with a notification service
        for (const market of marketsEndingSoon) {
          this.logger.log(
            `Market "${market.title}" (${market.id}) ends at ${market.endTime}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error checking markets ending soon', error);
    }
  }

  /**
   * Check for expired markets that should be resolved (every 10 minutes)
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkExpiredMarkets() {
    try {
      const now = new Date();

      const expiredMarkets = await this.marketRepository.find({
        where: {
          status: MarketStatus.ACTIVE,
          endTime: LessThan(now),
        },
        relations: ['creator'],
      });

      if (expiredMarkets.length > 0) {
        this.logger.log(
          `Found ${expiredMarkets.length} expired markets awaiting resolution`,
        );

        // TODO: Notify creators to resolve their markets
        for (const market of expiredMarkets) {
          this.logger.log(
            `Market "${market.title}" (${market.id}) expired at ${market.endTime}`,
          );

          // You could auto-resolve markets based on external data sources
          // or send notifications to creators to manually resolve
        }
      }
    } catch (error) {
      this.logger.error('Error checking expired markets', error);
    }
  }

  /**
   * Update market statistics (every hour)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateMarketStatistics() {
    try {
      const activeMarkets = await this.marketRepository.find({
        where: {
          status: MarketStatus.ACTIVE,
        },
      });

      this.logger.log(`Updating statistics for ${activeMarkets.length} active markets`);

      // Update statistics for each market
      for (const market of activeMarkets) {
        // Statistics are updated in real-time via event listeners
        // This is a backup/reconciliation job

        // You could add logic here to:
        // - Recalculate probabilities based on latest trades
        // - Update liquidity metrics
        // - Detect anomalies
        // - Generate analytics
      }

      this.logger.log('Market statistics update completed');
    } catch (error) {
      this.logger.error('Error updating market statistics', error);
    }
  }

  /**
   * Clean up old resolved markets (daily at midnight)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async archiveOldMarkets() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldMarkets = await this.marketRepository.find({
        where: {
          status: MarketStatus.RESOLVED,
          resolvedAt: LessThan(thirtyDaysAgo),
        },
      });

      if (oldMarkets.length > 0) {
        this.logger.log(
          `Found ${oldMarkets.length} resolved markets older than 30 days`,
        );

        // TODO: Archive to cold storage or cleanup
        // For now, just log
        this.logger.log('Market archiving would happen here');
      }
    } catch (error) {
      this.logger.error('Error archiving old markets', error);
    }
  }

  /**
   * Detect suspicious activity (every 15 minutes)
   */
  @Cron('*/15 * * * *')
  async detectSuspiciousActivity() {
    try {
      // Monitor for:
      // - Unusual trading patterns
      // - Market manipulation attempts
      // - Rapid price movements
      // - Wash trading

      const recentMarkets = await this.marketRepository.find({
        where: {
          status: MarketStatus.ACTIVE,
          createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
        },
        relations: ['trades'],
      });

      for (const market of recentMarkets) {
        // Example: Check if market has unusually high volume for its age
        const volumePerHour = parseFloat(market.totalVolume) /
          ((Date.now() - market.createdAt.getTime()) / (1000 * 60 * 60));

        if (volumePerHour > 10000) {
          this.logger.warn(
            `Suspicious volume detected in market ${market.id}: $${volumePerHour.toFixed(2)}/hour`,
          );
          // TODO: Flag for manual review
        }
      }
    } catch (error) {
      this.logger.error('Error detecting suspicious activity', error);
    }
  }
}
