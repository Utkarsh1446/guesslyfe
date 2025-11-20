import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ContractsService } from './contracts.service';

export interface MarketInfo {
  marketId: bigint;
  creator: string;
  question: string;
  endTime: bigint;
  liquidityPool: string;
  totalYesShares: string;
  totalNoShares: string;
  resolved: boolean;
  winningOutcome: boolean;
  cancelled: boolean;
}

export interface UserPosition {
  yesShares: bigint;
  noShares: bigint;
  yesSharesFormatted: string;
  noSharesFormatted: string;
  hasClaimed: boolean;
}

export interface OutcomeProbabilities {
  yesProbability: number; // 0-100
  noProbability: number; // 0-100
  yesShares: bigint;
  noShares: bigint;
}

@Injectable()
export class OpinionMarketService {
  private readonly logger = new Logger(OpinionMarketService.name);

  constructor(private readonly contractsService: ContractsService) {
    this.logger.log('OpinionMarketService initialized');
  }

  /**
   * Get detailed market information
   * @param marketId - The market ID
   * @returns Market details including question, endTime, liquidity, and resolution status
   */
  async getMarketInfo(marketId: bigint): Promise<MarketInfo> {
    try {
      const contract = this.contractsService.getContract('opinionMarket');

      const market = await contract.markets(marketId);

      return {
        marketId,
        creator: market.creator,
        question: market.question,
        endTime: market.endTime,
        liquidityPool: this.contractsService.formatUSDC(market.totalLiquidity),
        totalYesShares: this.contractsService.formatToken(market.yesShares),
        totalNoShares: this.contractsService.formatToken(market.noShares),
        resolved: market.isResolved || false,
        winningOutcome: market.isResolved ? market.winningOutcome : false,
        cancelled: market.isCancelled || false,
      };
    } catch (error) {
      this.logger.error(`Failed to get market info for market ${marketId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user's position in a market
   * @param marketId - The market ID
   * @param userAddress - The user's wallet address
   * @returns User's YES and NO share balances and claim status
   */
  async getUserPosition(marketId: bigint, userAddress: string): Promise<UserPosition> {
    try {
      const contract = this.contractsService.getContract('opinionMarket');

      const position = await contract.userPositions(marketId, userAddress);

      return {
        yesShares: position.yesShares,
        noShares: position.noShares,
        yesSharesFormatted: this.contractsService.formatToken(position.yesShares),
        noSharesFormatted: this.contractsService.formatToken(position.noShares),
        hasClaimed: position.hasClaimed,
      };
    } catch (error) {
      this.logger.error(`Failed to get user position for market ${marketId}, user ${userAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate outcome probabilities based on AMM formula
   * @param marketId - The market ID
   * @returns YES and NO probabilities (0-100)
   */
  async getOutcomeProbabilities(marketId: bigint): Promise<OutcomeProbabilities> {
    try {
      const marketInfo = await this.getMarketInfo(marketId);

      const yesShares = parseFloat(marketInfo.totalYesShares);
      const noShares = parseFloat(marketInfo.totalNoShares);

      // AMM probability calculation: P(YES) = NO_shares / (YES_shares + NO_shares)
      const totalShares = yesShares + noShares;

      let yesProbability = 0;
      let noProbability = 0;

      if (totalShares > 0) {
        yesProbability = (noShares / totalShares) * 100;
        noProbability = (yesShares / totalShares) * 100;
      } else {
        // Default to 50/50 if no shares exist
        yesProbability = 50;
        noProbability = 50;
      }

      return {
        yesProbability: Math.round(yesProbability * 100) / 100, // Round to 2 decimals
        noProbability: Math.round(noProbability * 100) / 100,
        yesShares: BigInt(yesShares * 1e6),
        noShares: BigInt(noShares * 1e6),
      };
    } catch (error) {
      this.logger.error(`Failed to calculate probabilities for market ${marketId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get buy price for an outcome
   * @param marketId - The market ID
   * @param isYes - True for YES, false for NO
   * @param amount - Amount of shares to buy
   * @returns Price in USDC
   */
  async getBuyPrice(marketId: bigint, isYes: boolean, amount: bigint): Promise<bigint> {
    try {
      const contract = this.contractsService.getContract('opinionMarket');
      return await contract.getBuyPrice(marketId, isYes, amount);
    } catch (error) {
      this.logger.error(`Failed to get buy price for market ${marketId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get sell price for an outcome
   * @param marketId - The market ID
   * @param isYes - True for YES, false for NO
   * @param amount - Amount of shares to sell
   * @returns Price in USDC
   */
  async getSellPrice(marketId: bigint, isYes: boolean, amount: bigint): Promise<bigint> {
    try {
      const contract = this.contractsService.getContract('opinionMarket');
      return await contract.getSellPrice(marketId, isYes, amount);
    } catch (error) {
      this.logger.error(`Failed to get sell price for market ${marketId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if market has ended
   * @param marketId - The market ID
   * @returns True if market end time has passed
   */
  async hasMarketEnded(marketId: bigint): Promise<boolean> {
    try {
      const marketInfo = await this.getMarketInfo(marketId);
      const currentTime = BigInt(Math.floor(Date.now() / 1000));
      return currentTime >= marketInfo.endTime;
    } catch (error) {
      this.logger.error(`Failed to check if market ended for ${marketId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate potential winnings for a user
   * @param marketId - The market ID
   * @param userAddress - The user's wallet address
   * @returns Potential winnings in USDC (only if market is resolved)
   */
  async calculatePotentialWinnings(marketId: bigint, userAddress: string): Promise<bigint> {
    try {
      const contract = this.contractsService.getContract('opinionMarket');
      const [marketInfo, position] = await Promise.all([
        this.getMarketInfo(marketId),
        this.getUserPosition(marketId, userAddress),
      ]);

      if (!marketInfo.resolved) {
        return BigInt(0);
      }

      const winningShares = marketInfo.winningOutcome ? position.yesShares : position.noShares;

      if (winningShares === BigInt(0)) {
        return BigInt(0);
      }

      // Call contract to calculate exact payout
      return await contract.calculatePayout(marketId, userAddress);
    } catch (error) {
      this.logger.error(`Failed to calculate winnings for market ${marketId}, user ${userAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get total number of markets
   * @returns Total market count
   */
  async getTotalMarkets(): Promise<number> {
    try {
      const contract = this.contractsService.getContract('opinionMarket');
      const count = await contract.totalMarkets();
      return Number(count);
    } catch (error) {
      this.logger.error(`Failed to get total markets: ${error.message}`);
      throw error;
    }
  }

  /**
   * Listen to market events
   * @param callbacks - Callback functions for different market events
   */
  listenToMarketEvents(callbacks: {
    onMarketCreated?: (marketId: bigint, creator: string, question: string, endTime: bigint) => void;
    onBetPlaced?: (marketId: bigint, user: string, isYes: boolean, amount: bigint, cost: bigint) => void;
    onMarketResolved?: (marketId: bigint, winningOutcome: boolean, timestamp: bigint) => void;
    onWinningsClaimed?: (marketId: bigint, user: string, payout: bigint) => void;
  }) {
    try {
      const contract = this.contractsService.getContract('opinionMarket');

      // Listen to MarketCreated events
      if (callbacks.onMarketCreated) {
        contract.on('MarketCreated', (marketId, creator, question, endTime, timestamp) => {
          this.logger.log(`MarketCreated: ${marketId} by ${creator} - "${question}"`);
          callbacks.onMarketCreated?.(marketId, creator, question, endTime);
        });
      }

      // Listen to BetPlaced events
      if (callbacks.onBetPlaced) {
        contract.on('BetPlaced', (marketId, user, isYes, amount, cost, timestamp) => {
          this.logger.log(`BetPlaced: Market ${marketId}, User ${user}, ${isYes ? 'YES' : 'NO'}, Amount ${amount}`);
          callbacks.onBetPlaced?.(marketId, user, isYes, amount, cost);
        });
      }

      // Listen to MarketResolved events
      if (callbacks.onMarketResolved) {
        contract.on('MarketResolved', (marketId, winningOutcome, timestamp) => {
          this.logger.log(`MarketResolved: ${marketId} -> ${winningOutcome ? 'YES' : 'NO'}`);
          callbacks.onMarketResolved?.(marketId, winningOutcome, timestamp);
        });
      }

      // Listen to WinningsClaimed events
      if (callbacks.onWinningsClaimed) {
        contract.on('WinningsClaimed', (marketId, user, payout, timestamp) => {
          this.logger.log(`WinningsClaimed: Market ${marketId}, User ${user}, Payout ${payout}`);
          callbacks.onWinningsClaimed?.(marketId, user, payout);
        });
      }

      this.logger.log('Market event listeners setup');
    } catch (error) {
      this.logger.error(`Failed to setup market event listeners: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    try {
      const contract = this.contractsService.getContract('opinionMarket');
      contract.removeAllListeners();
      this.logger.log('All event listeners removed from OpinionMarket');
    } catch (error) {
      this.logger.error(`Failed to remove event listeners: ${error.message}`);
      throw error;
    }
  }
}
