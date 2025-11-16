/**
 * Blockchain Service Mock
 *
 * Mock blockchain interactions for testing
 */

export class MockBlockchainService {
  private transactions: Map<string, any> = new Map();
  private transactionCounter = 0;

  /**
   * Mock buying creator shares
   */
  async buyShares(
    creatorAddress: string,
    amount: string,
    maxPrice: string,
  ): Promise<{
    transactionHash: string;
    sharesPurchased: string;
    totalCost: string;
    newPrice: string;
  }> {
    const txHash = this.generateTransactionHash();

    const result = {
      transactionHash: txHash,
      sharesPurchased: amount,
      totalCost: (BigInt(amount) * BigInt(1000000) / BigInt(1000000000000000000)).toString(), // Simple calculation
      newPrice: '1100000', // $1.10
    };

    this.transactions.set(txHash, {
      type: 'BUY_SHARES',
      creatorAddress,
      amount,
      maxPrice,
      result,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Mock selling creator shares
   */
  async sellShares(
    creatorAddress: string,
    amount: string,
    minPrice: string,
  ): Promise<{
    transactionHash: string;
    sharesSold: string;
    totalReceived: string;
    newPrice: string;
  }> {
    const txHash = this.generateTransactionHash();

    const result = {
      transactionHash: txHash,
      sharesSold: amount,
      totalReceived: (BigInt(amount) * BigInt(1000000) / BigInt(1000000000000000000)).toString(),
      newPrice: '900000', // $0.90
    };

    this.transactions.set(txHash, {
      type: 'SELL_SHARES',
      creatorAddress,
      amount,
      minPrice,
      result,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Mock creating opinion market
   */
  async createMarket(
    question: string,
    endTime: number,
    initialLiquidity: string,
  ): Promise<{
    transactionHash: string;
    marketAddress: string;
  }> {
    const txHash = this.generateTransactionHash();
    const marketAddress = this.generateAddress();

    const result = {
      transactionHash: txHash,
      marketAddress,
    };

    this.transactions.set(txHash, {
      type: 'CREATE_MARKET',
      question,
      endTime,
      initialLiquidity,
      result,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Mock buying market position
   */
  async buyMarketShares(
    marketAddress: string,
    outcome: boolean,
    amount: string,
  ): Promise<{
    transactionHash: string;
    sharesPurchased: string;
    totalCost: string;
  }> {
    const txHash = this.generateTransactionHash();

    const result = {
      transactionHash: txHash,
      sharesPurchased: amount,
      totalCost: amount, // 1:1 for simplicity
    };

    this.transactions.set(txHash, {
      type: 'BUY_MARKET_SHARES',
      marketAddress,
      outcome,
      amount,
      result,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Mock selling market position
   */
  async sellMarketShares(
    marketAddress: string,
    outcome: boolean,
    amount: string,
  ): Promise<{
    transactionHash: string;
    sharesSold: string;
    totalReceived: string;
  }> {
    const txHash = this.generateTransactionHash();

    const result = {
      transactionHash: txHash,
      sharesSold: amount,
      totalReceived: amount,
    };

    this.transactions.set(txHash, {
      type: 'SELL_MARKET_SHARES',
      marketAddress,
      outcome,
      amount,
      result,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Mock resolving market
   */
  async resolveMarket(
    marketAddress: string,
    outcome: boolean,
  ): Promise<{
    transactionHash: string;
  }> {
    const txHash = this.generateTransactionHash();

    this.transactions.set(txHash, {
      type: 'RESOLVE_MARKET',
      marketAddress,
      outcome,
      timestamp: new Date(),
    });

    return { transactionHash: txHash };
  }

  /**
   * Mock claiming dividends
   */
  async claimDividends(
    epochId: string,
    creatorAddress: string,
  ): Promise<{
    transactionHash: string;
    amountClaimed: string;
  }> {
    const txHash = this.generateTransactionHash();

    const result = {
      transactionHash: txHash,
      amountClaimed: '50000000', // $50 in USDC
    };

    this.transactions.set(txHash, {
      type: 'CLAIM_DIVIDENDS',
      epochId,
      creatorAddress,
      result,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Get transaction by hash
   */
  getTransaction(txHash: string): any {
    return this.transactions.get(txHash);
  }

  /**
   * Check if transaction is confirmed
   */
  async isTransactionConfirmed(txHash: string): Promise<boolean> {
    return this.transactions.has(txHash);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<any> {
    const tx = this.transactions.get(txHash);
    if (!tx) {
      return null;
    }

    return {
      transactionHash: txHash,
      blockNumber: 12345,
      blockHash: this.generateTransactionHash(),
      status: 1, // Success
      gasUsed: '50000',
      logs: [],
    };
  }

  /**
   * Reset mock state
   */
  reset(): void {
    this.transactions.clear();
    this.transactionCounter = 0;
  }

  /**
   * Generate mock transaction hash
   */
  private generateTransactionHash(): string {
    this.transactionCounter++;
    const hex = this.transactionCounter.toString(16).padStart(64, '0');
    return `0x${hex}`;
  }

  /**
   * Generate mock address
   */
  private generateAddress(): string {
    const random = Math.random().toString(16).substring(2, 42).padEnd(40, '0');
    return `0x${random}`;
  }
}

export const mockBlockchainService = new MockBlockchainService();
