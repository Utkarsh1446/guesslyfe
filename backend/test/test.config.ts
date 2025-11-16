/**
 * Test Configuration
 *
 * Configuration for E2E tests including database and service mocks
 */

export const testConfig = {
  database: {
    type: 'postgres',
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    username: process.env.TEST_DB_USERNAME || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    database: process.env.TEST_DB_DATABASE || 'guessly_test',
    synchronize: true, // Auto-create schema for tests
    dropSchema: true, // Drop schema before each test run
    logging: false,
  },

  redis: {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
    db: parseInt(process.env.TEST_REDIS_DB || '1'), // Use different DB for tests
  },

  jwt: {
    secret: 'test-jwt-secret',
    expiresIn: '1d',
  },

  twitter: {
    clientId: 'test-twitter-client-id',
    clientSecret: 'test-twitter-client-secret',
    callbackUrl: 'http://localhost:3000/auth/twitter/callback',
  },

  blockchain: {
    network: 'baseSepolia',
    rpcUrl: 'http://localhost:8545', // Use local test network
    chainId: 84532,
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Test private key
    contracts: {
      usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      feeCollector: '0x9E0e83E0569d42a3A0420F68fe4D967F4C10F423',
      creatorShareFactory: '0xaE86eC369E33A74769Ef7A1609b76E84B417c5Db',
      opinionMarket: '0x9cC5bBBceb80bE28f9be3F7dd69dC815Ba64099C',
    },
  },

  app: {
    frontendUrl: 'http://localhost:3001',
    apiPrefix: 'api/v1',
  },
};

export const testUsers = {
  validUser: {
    twitterId: '1234567890',
    twitterHandle: 'testuser',
    displayName: 'Test User',
    profilePictureUrl: 'https://example.com/avatar.jpg',
    followerCount: 5000,
    followingCount: 100,
    walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },

  creator: {
    twitterId: '9876543210',
    twitterHandle: 'testcreator',
    displayName: 'Test Creator',
    profilePictureUrl: 'https://example.com/creator.jpg',
    followerCount: 15000,
    followingCount: 200,
    walletAddress: '0x1234567890123456789012345678901234567890',
  },

  admin: {
    twitterId: '1111111111',
    twitterHandle: 'admin',
    displayName: 'Admin User',
    profilePictureUrl: 'https://example.com/admin.jpg',
    followerCount: 100,
    followingCount: 50,
    walletAddress: '0xABCDEF123456789012345678901234567890ABCD',
    isAdmin: true,
  },
};

export const mockTwitterProfiles = {
  eligible: {
    id: '1234567890',
    username: 'eligible_creator',
    name: 'Eligible Creator',
    profile_image_url: 'https://example.com/eligible.jpg',
    public_metrics: {
      followers_count: 10000,
      following_count: 500,
      tweet_count: 1000,
    },
  },

  notEligible: {
    id: '9999999999',
    username: 'not_eligible',
    name: 'Not Eligible',
    profile_image_url: 'https://example.com/not-eligible.jpg',
    public_metrics: {
      followers_count: 500, // Below 1000 threshold
      following_count: 100,
      tweet_count: 50,
    },
  },
};
