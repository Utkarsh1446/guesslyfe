import { registerAs } from '@nestjs/config';

export interface BlockchainConfig {
  network: string;
  rpcUrl: string;
  chainId: number;
  providerPrivateKey: string;
  contracts: {
    usdc: string;
    feeCollector: string;
    creatorShareFactory: string;
    opinionMarket: string;
  };
}

export default registerAs(
  'blockchain',
  (): BlockchainConfig => ({
    network: process.env.BLOCKCHAIN_NETWORK || 'baseSepolia',
    rpcUrl:
      process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia.base.org',
    chainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '84532', 10),
    providerPrivateKey: process.env.BLOCKCHAIN_PROVIDER_PRIVATE_KEY || '',
    contracts: {
      usdc: process.env.CONTRACT_USDC || '',
      feeCollector: process.env.CONTRACT_FEE_COLLECTOR || '',
      creatorShareFactory: process.env.CONTRACT_CREATOR_SHARE_FACTORY || '',
      opinionMarket: process.env.CONTRACT_OPINION_MARKET || '',
    },
  }),
);
