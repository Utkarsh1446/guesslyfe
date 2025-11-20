import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ContractsService } from './contracts.service';

export interface GasEstimate {
  gasLimit: bigint;
  gasPrice: bigint;
  maxFeePerGas: bigint | null;
  maxPriorityFeePerGas: bigint | null;
  estimatedCost: bigint;
  estimatedCostFormatted: string;
}

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  blockNumber: number | null;
  gasUsed: bigint | null;
  effectiveGasPrice: bigint | null;
  confirmations: number;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  constructor(private readonly contractsService: ContractsService) {
    this.logger.log('BlockchainService initialized');
  }

  /**
   * Get current gas price from the network
   * @returns Gas price information
   */
  async getCurrentGasPrice(): Promise<GasEstimate> {
    try {
      const provider = this.contractsService.getProvider();
      const feeData = await provider.getFeeData();

      const gasLimit = BigInt(21000); // Standard transfer gas limit
      const gasPrice = feeData.gasPrice || BigInt(0);
      const maxFeePerGas = feeData.maxFeePerGas;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

      const estimatedCost = gasLimit * gasPrice;

      return {
        gasLimit,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        estimatedCost,
        estimatedCostFormatted: this.contractsService.formatToken(estimatedCost),
      };
    } catch (error) {
      this.logger.error(`Failed to get current gas price: ${error.message}`);
      throw error;
    }
  }

  /**
   * Estimate gas for a transaction
   * @param transaction - Transaction request object
   * @returns Gas estimate with cost calculation
   */
  async estimateGas(transaction: ethers.TransactionRequest): Promise<GasEstimate> {
    try {
      const provider = this.contractsService.getProvider();

      const [gasLimit, feeData] = await Promise.all([
        provider.estimateGas(transaction),
        provider.getFeeData(),
      ]);

      const gasPrice = feeData.gasPrice || BigInt(0);
      const maxFeePerGas = feeData.maxFeePerGas;
      const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;

      // Add 20% buffer to gas limit for safety
      const bufferedGasLimit = (gasLimit * BigInt(120)) / BigInt(100);

      const estimatedCost = bufferedGasLimit * gasPrice;

      return {
        gasLimit: bufferedGasLimit,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        estimatedCost,
        estimatedCostFormatted: this.contractsService.formatToken(estimatedCost),
      };
    } catch (error) {
      this.logger.error(`Failed to estimate gas: ${error.message}`);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   * @param txHash - Transaction hash
   * @param confirmations - Number of confirmations to wait for (default: 1)
   * @param timeout - Timeout in milliseconds (default: 120000 = 2 minutes)
   * @returns Transaction receipt
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 120000,
  ): Promise<ethers.TransactionReceipt> {
    try {
      this.logger.log(`Waiting for transaction ${txHash} (${confirmations} confirmations)...`);

      const provider = this.contractsService.getProvider();
      const receipt = await provider.waitForTransaction(txHash, confirmations, timeout);

      if (!receipt) {
        throw new Error(`Transaction ${txHash} not found or timeout reached`);
      }

      if (receipt.status === 0) {
        throw new Error(`Transaction ${txHash} failed`);
      }

      this.logger.log(`Transaction ${txHash} confirmed in block ${receipt.blockNumber}`);

      return receipt;
    } catch (error) {
      this.logger.error(`Failed to wait for transaction ${txHash}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get transaction receipt
   * @param txHash - Transaction hash
   * @returns Transaction receipt or null if not found
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    try {
      const provider = this.contractsService.getProvider();
      return await provider.getTransactionReceipt(txHash);
    } catch (error) {
      this.logger.error(`Failed to get transaction receipt for ${txHash}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get transaction status
   * @param txHash - Transaction hash
   * @returns Transaction status information
   */
  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    try {
      const provider = this.contractsService.getProvider();
      const [receipt, currentBlock] = await Promise.all([
        provider.getTransactionReceipt(txHash),
        provider.getBlockNumber(),
      ]);

      if (!receipt) {
        // Transaction is still pending or doesn't exist
        return {
          hash: txHash,
          status: 'pending',
          blockNumber: null,
          gasUsed: null,
          effectiveGasPrice: null,
          confirmations: 0,
        };
      }

      const confirmations = currentBlock - receipt.blockNumber + 1;

      return {
        hash: txHash,
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.gasPrice,
        confirmations,
      };
    } catch (error) {
      this.logger.error(`Failed to get transaction status for ${txHash}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get current block number
   * @returns Current block number
   */
  async getCurrentBlockNumber(): Promise<number> {
    try {
      const provider = this.contractsService.getProvider();
      return await provider.getBlockNumber();
    } catch (error) {
      this.logger.error(`Failed to get current block number: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get block by number
   * @param blockNumber - Block number
   * @returns Block information
   */
  async getBlock(blockNumber: number): Promise<ethers.Block> {
    try {
      const provider = this.contractsService.getProvider();
      const block = await provider.getBlock(blockNumber);

      if (!block) {
        throw new Error(`Block ${blockNumber} not found`);
      }

      return block;
    } catch (error) {
      this.logger.error(`Failed to get block ${blockNumber}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get transaction by hash
   * @param txHash - Transaction hash
   * @returns Transaction information
   */
  async getTransaction(txHash: string): Promise<ethers.TransactionResponse | null> {
    try {
      const provider = this.contractsService.getProvider();
      return await provider.getTransaction(txHash);
    } catch (error) {
      this.logger.error(`Failed to get transaction ${txHash}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get wallet balance
   * @param address - Wallet address
   * @returns Balance in Wei
   */
  async getBalance(address: string): Promise<bigint> {
    try {
      const provider = this.contractsService.getProvider();
      return await provider.getBalance(address);
    } catch (error) {
      this.logger.error(`Failed to get balance for ${address}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get USDC balance
   * @param address - Wallet address
   * @returns USDC balance (6 decimals)
   */
  async getUSDCBalance(address: string): Promise<bigint> {
    try {
      const usdcContract = this.contractsService.getContract('usdc');
      return await usdcContract.balanceOf(address);
    } catch (error) {
      this.logger.error(`Failed to get USDC balance for ${address}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retry a function with exponential backoff
   * @param fn - Function to retry
   * @param retries - Number of retries
   * @returns Result of the function
   */
  async retryWithBackoff<T>(fn: () => Promise<T>, retries: number = this.MAX_RETRIES): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) {
          throw error;
        }

        const delay = this.RETRY_DELAY * Math.pow(2, i);
        this.logger.warn(`Retry ${i + 1}/${retries} after ${delay}ms: ${error.message}`);
        await this.sleep(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Sleep for specified milliseconds
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if address is a contract
   * @param address - Address to check
   * @returns True if address is a contract
   */
  async isContract(address: string): Promise<boolean> {
    try {
      const provider = this.contractsService.getProvider();
      const code = await provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      this.logger.error(`Failed to check if ${address} is a contract: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get network information
   * @returns Network details
   */
  async getNetworkInfo(): Promise<{
    name: string;
    chainId: bigint;
  }> {
    try {
      const provider = this.contractsService.getProvider();
      const network = await provider.getNetwork();

      return {
        name: network.name,
        chainId: network.chainId,
      };
    } catch (error) {
      this.logger.error(`Failed to get network info: ${error.message}`);
      throw error;
    }
  }
}
