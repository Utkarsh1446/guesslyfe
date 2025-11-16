# Testing Guide

Complete testing guide for the GuessLyfe prediction market platform.

## Table of Contents

- [Testing Philosophy](#testing-philosophy)
- [Testing Checklist](#testing-checklist)
- [Test Setup](#test-setup)
- [Unit Tests](#unit-tests)
- [Integration Tests](#integration-tests)
- [Contract Tests](#contract-tests)
- [End-to-End Tests](#end-to-end-tests)
- [Load Testing](#load-testing)
- [Security Testing](#security-testing)
- [WebSocket Testing](#websocket-testing)
- [API Testing](#api-testing)
- [Database Testing](#database-testing)
- [Test Coverage](#test-coverage)
- [Continuous Integration](#continuous-integration)
- [Testing Best Practices](#testing-best-practices)

---

## Testing Philosophy

Our testing strategy follows the **Testing Pyramid**:

```
        /\
       /E2E\         ← Few, slow, expensive
      /------\
     /  API  \       ← Medium number, medium speed
    /----------\
   /Integration\     ← More, faster
  /--------------\
 /  Unit Tests   \   ← Many, fast, cheap
/------------------\
```

**Testing Principles:**
- Write tests first (TDD when possible)
- Maintain >90% code coverage
- Tests should be fast, isolated, and deterministic
- Mock external dependencies
- Test behavior, not implementation
- Use descriptive test names

---

## Testing Checklist

### Pre-Production Testing Checklist

#### Unit Tests
- [ ] All unit tests pass (`npm run test`)
- [ ] Unit test coverage >90% (`npm run test:cov`)
- [ ] All services have unit tests
- [ ] All controllers have unit tests
- [ ] All utilities have unit tests
- [ ] All guards have unit tests
- [ ] All interceptors have unit tests
- [ ] All pipes have unit tests
- [ ] All validators have unit tests

#### Integration Tests
- [ ] All integration tests pass (`npm run test:integration`)
- [ ] Database operations tested
- [ ] Redis operations tested
- [ ] External API integrations tested
- [ ] Blockchain interactions tested
- [ ] Queue/job processing tested
- [ ] File upload/download tested
- [ ] Email sending tested

#### Contract Tests
- [ ] All smart contract tests pass
- [ ] Contract test coverage >90%
- [ ] OpinionMarket contract tested
- [ ] CreatorShares contract tested
- [ ] All contract functions tested
- [ ] Edge cases tested
- [ ] Gas optimization tested
- [ ] Security vulnerabilities tested

#### API Tests
- [ ] All endpoints return correct status codes
- [ ] Request validation works correctly
- [ ] Response format is correct
- [ ] Error handling works as expected
- [ ] Rate limiting tested
- [ ] Authentication/authorization tested
- [ ] CORS configuration tested
- [ ] Pagination tested
- [ ] Filtering/sorting tested
- [ ] Swagger documentation accurate

#### End-to-End Tests
- [ ] All E2E tests pass (`npm run test:e2e`)
- [ ] User registration flow works
- [ ] User login flow works
- [ ] Market creation flow works
- [ ] Trading flow works
- [ ] Market resolution flow works
- [ ] Creator application flow works
- [ ] Dividend distribution flow works
- [ ] Notification flow works
- [ ] Admin operations flow works

#### WebSocket Tests
- [ ] WebSocket connections established
- [ ] JWT authentication works
- [ ] Room subscriptions work
- [ ] Events are emitted correctly
- [ ] Reconnection works
- [ ] Heartbeat/ping-pong works
- [ ] Error handling works
- [ ] Multiple connections handled
- [ ] Redis adapter scaling tested

#### Performance Tests
- [ ] Load testing completed (1000 concurrent users)
- [ ] Stress testing completed
- [ ] Response times <200ms (p50)
- [ ] Response times <500ms (p95)
- [ ] Response times <1s (p99)
- [ ] Database query optimization verified
- [ ] Memory leaks checked
- [ ] CPU usage acceptable under load

#### Security Tests
- [ ] SQL injection tested
- [ ] XSS tested
- [ ] CSRF tested
- [ ] Authentication bypass tested
- [ ] Authorization bypass tested
- [ ] Rate limiting tested
- [ ] Input validation tested
- [ ] File upload security tested
- [ ] Dependency vulnerabilities scanned
- [ ] Environment variables secured

#### Database Tests
- [ ] All migrations run successfully
- [ ] Rollback migrations tested
- [ ] Database indexes created
- [ ] Database constraints enforced
- [ ] Transaction handling tested
- [ ] Database backup tested
- [ ] Database restore tested

#### Background Jobs Tests
- [ ] Scheduled jobs run correctly
- [ ] Job retry logic works
- [ ] Failed job handling works
- [ ] Job queue processing tested
- [ ] Job concurrency tested
- [ ] Job timeout handling tested

---

## Test Setup

### Prerequisites

```bash
# Install dependencies
npm install

# Set up test database
npm run db:test:setup

# Set up test environment
cp .env.test.example .env.test
```

### Test Environment Variables

Create `.env.test`:

```bash
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=test_user
DB_PASSWORD=test_password
DB_NAME=guesslyfe_test

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=1

JWT_SECRET=test-secret-key
JWT_EXPIRATION=1h

BLOCKCHAIN_NETWORK=hardhat
BLOCKCHAIN_RPC_URL=http://localhost:8545

# Disable external services in tests
ENABLE_EXTERNAL_APIS=false
ENABLE_EMAIL_SENDING=false
ENABLE_PUSH_NOTIFICATIONS=false
```

---

## Unit Tests

### Running Unit Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run specific test file
npm run test auth.service.spec.ts

# Run tests matching pattern
npm run test -- --testNamePattern="should authenticate user"
```

### Writing Unit Tests

**Example: Service Unit Test**

```typescript
// market.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MarketService } from './market.service';
import { OpinionMarket } from './entities/market.entity';
import { Repository } from 'typeorm';

describe('MarketService', () => {
  let service: MarketService;
  let repository: Repository<OpinionMarket>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketService,
        {
          provide: getRepositoryToken(OpinionMarket),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<MarketService>(MarketService);
    repository = module.get<Repository<OpinionMarket>>(
      getRepositoryToken(OpinionMarket),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return an array of markets', async () => {
      const markets = [
        { id: '1', question: 'Will it rain?' },
        { id: '2', question: 'Will it snow?' },
      ];
      mockRepository.find.mockResolvedValue(markets);

      const result = await service.findAll();

      expect(result).toEqual(markets);
      expect(repository.find).toHaveBeenCalledTimes(1);
    });

    it('should handle errors gracefully', async () => {
      mockRepository.find.mockRejectedValue(new Error('Database error'));

      await expect(service.findAll()).rejects.toThrow('Database error');
    });
  });

  describe('create', () => {
    it('should create a new market', async () => {
      const createDto = {
        question: 'Will BTC reach $100k?',
        endDate: new Date('2024-12-31'),
        category: 'crypto',
      };
      const savedMarket = { id: '1', ...createDto };
      mockRepository.save.mockResolvedValue(savedMarket);

      const result = await service.create(createDto);

      expect(result).toEqual(savedMarket);
      expect(repository.save).toHaveBeenCalledWith(createDto);
    });

    it('should validate market data', async () => {
      const invalidDto = {
        question: '', // Empty question
        endDate: new Date('2020-01-01'), // Past date
      };

      await expect(service.create(invalidDto)).rejects.toThrow();
    });
  });
});
```

**Example: Controller Unit Test**

```typescript
// market.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';

describe('MarketController', () => {
  let controller: MarketController;
  let service: MarketService;

  const mockMarketService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MarketController],
      providers: [
        {
          provide: MarketService,
          useValue: mockMarketService,
        },
      ],
    }).compile();

    controller = module.get<MarketController>(MarketController);
    service = module.get<MarketService>(MarketService);
  });

  describe('GET /markets', () => {
    it('should return all markets', async () => {
      const markets = [{ id: '1', question: 'Will it rain?' }];
      mockMarketService.findAll.mockResolvedValue(markets);

      const result = await controller.findAll();

      expect(result).toEqual(markets);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('POST /markets', () => {
    it('should create a market', async () => {
      const createDto = { question: 'Will BTC reach $100k?' };
      const created = { id: '1', ...createDto };
      mockMarketService.create.mockResolvedValue(created);

      const result = await controller.create(createDto);

      expect(result).toEqual(created);
      expect(service.create).toHaveBeenCalledWith(createDto);
    });
  });
});
```

### Unit Test Coverage Goals

- **Overall Coverage**: >90%
- **Statements**: >90%
- **Branches**: >85%
- **Functions**: >90%
- **Lines**: >90%

---

## Integration Tests

### Running Integration Tests

```bash
# Run integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- market-integration.spec.ts
```

### Writing Integration Tests

**Example: Database Integration Test**

```typescript
// market-integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketService } from './market.service';
import { OpinionMarket } from './entities/market.entity';

describe('MarketService Integration', () => {
  let service: MarketService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST,
          port: parseInt(process.env.DB_PORT),
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          entities: [OpinionMarket],
          synchronize: true, // Only for testing
        }),
        TypeOrmModule.forFeature([OpinionMarket]),
      ],
      providers: [MarketService],
    }).compile();

    service = module.get<MarketService>(MarketService);
  });

  afterAll(async () => {
    await module.close();
  });

  beforeEach(async () => {
    // Clear database before each test
    await service.deleteAll();
  });

  it('should create and retrieve a market', async () => {
    const createDto = {
      question: 'Will it rain?',
      endDate: new Date('2024-12-31'),
      category: 'weather',
    };

    const created = await service.create(createDto);
    const retrieved = await service.findOne(created.id);

    expect(retrieved).toBeDefined();
    expect(retrieved.question).toBe(createDto.question);
    expect(retrieved.category).toBe(createDto.category);
  });

  it('should handle concurrent market creation', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      service.create({
        question: `Question ${i}`,
        endDate: new Date('2024-12-31'),
      }),
    );

    const markets = await Promise.all(promises);

    expect(markets).toHaveLength(10);
    expect(new Set(markets.map((m) => m.id)).size).toBe(10); // All unique IDs
  });
});
```

**Example: Redis Integration Test**

```typescript
// cache-integration.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { CacheService } from './cache.service';

describe('CacheService Integration', () => {
  let service: CacheService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        CacheModule.registerAsync({
          useFactory: async () => ({
            store: await redisStore({
              socket: {
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT),
              },
              database: parseInt(process.env.REDIS_DB),
            }),
          }),
        }),
      ],
      providers: [CacheService],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterAll(async () => {
    await service.reset(); // Clear cache
    await module.close();
  });

  it('should set and get cache values', async () => {
    await service.set('test-key', { data: 'test-value' }, 60);
    const value = await service.get('test-key');

    expect(value).toEqual({ data: 'test-value' });
  });

  it('should expire cache after TTL', async () => {
    await service.set('expire-key', 'value', 1); // 1 second TTL
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Wait 1.5s
    const value = await service.get('expire-key');

    expect(value).toBeNull();
  });
});
```

---

## Contract Tests

### Running Contract Tests

```bash
# Run Hardhat tests
cd contracts
npx hardhat test

# Run with coverage
npx hardhat coverage

# Run specific test
npx hardhat test test/OpinionMarket.test.ts

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Writing Contract Tests

**Example: Smart Contract Test**

```typescript
// OpinionMarket.test.ts
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { OpinionMarket, MockUSDC } from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('OpinionMarket', () => {
  let market: OpinionMarket;
  let usdc: MockUSDC;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let trader1: SignerWithAddress;
  let trader2: SignerWithAddress;

  beforeEach(async () => {
    [owner, creator, trader1, trader2] = await ethers.getSigners();

    // Deploy USDC mock
    const USDC = await ethers.getContractFactory('MockUSDC');
    usdc = await USDC.deploy();
    await usdc.deployed();

    // Deploy OpinionMarket
    const Market = await ethers.getContractFactory('OpinionMarket');
    market = await Market.deploy(usdc.address);
    await market.deployed();

    // Mint USDC to traders
    await usdc.mint(trader1.address, ethers.utils.parseUnits('10000', 6));
    await usdc.mint(trader2.address, ethers.utils.parseUnits('10000', 6));

    // Approve market contract
    await usdc.connect(trader1).approve(market.address, ethers.constants.MaxUint256);
    await usdc.connect(trader2).approve(market.address, ethers.constants.MaxUint256);
  });

  describe('Market Creation', () => {
    it('should create a market', async () => {
      const question = 'Will BTC reach $100k?';
      const endTime = Math.floor(Date.now() / 1000) + 86400; // 1 day

      const tx = await market.connect(creator).createMarket(question, endTime);
      const receipt = await tx.wait();
      const event = receipt.events?.find((e) => e.event === 'MarketCreated');

      expect(event).to.not.be.undefined;
      expect(event?.args?.question).to.equal(question);
      expect(event?.args?.creator).to.equal(creator.address);
    });

    it('should reject market with past end date', async () => {
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      await expect(
        market.connect(creator).createMarket('Question?', pastTime),
      ).to.be.revertedWith('End time must be in the future');
    });

    it('should reject empty question', async () => {
      const endTime = Math.floor(Date.now() / 1000) + 86400;

      await expect(
        market.connect(creator).createMarket('', endTime),
      ).to.be.revertedWith('Question cannot be empty');
    });
  });

  describe('Trading', () => {
    let marketId: string;

    beforeEach(async () => {
      const endTime = Math.floor(Date.now() / 1000) + 86400;
      const tx = await market.connect(creator).createMarket('Question?', endTime);
      const receipt = await tx.wait();
      marketId = receipt.events?.find((e) => e.event === 'MarketCreated')?.args?.marketId;
    });

    it('should execute buy trade', async () => {
      const amount = ethers.utils.parseUnits('100', 6); // 100 USDC

      const tx = await market.connect(trader1).trade(marketId, 1, amount); // Outcome 1 (YES)
      const receipt = await tx.wait();
      const event = receipt.events?.find((e) => e.event === 'Trade');

      expect(event).to.not.be.undefined;
      expect(event?.args?.trader).to.equal(trader1.address);
      expect(event?.args?.outcome).to.equal(1);
    });

    it('should update prices after trade', async () => {
      const amount = ethers.utils.parseUnits('1000', 6);

      const priceBefore = await market.getOutcomePrice(marketId, 1);
      await market.connect(trader1).trade(marketId, 1, amount);
      const priceAfter = await market.getOutcomePrice(marketId, 1);

      expect(priceAfter).to.be.gt(priceBefore); // Price should increase
    });

    it('should handle multiple traders', async () => {
      const amount = ethers.utils.parseUnits('100', 6);

      await market.connect(trader1).trade(marketId, 1, amount);
      await market.connect(trader2).trade(marketId, 0, amount);

      const liquidity = await market.getTotalLiquidity(marketId);
      expect(liquidity).to.be.gt(0);
    });

    it('should reject trade after market ends', async () => {
      // Fast forward time
      await ethers.provider.send('evm_increaseTime', [86400 + 1]); // 1 day + 1 second
      await ethers.provider.send('evm_mine', []);

      const amount = ethers.utils.parseUnits('100', 6);
      await expect(market.connect(trader1).trade(marketId, 1, amount)).to.be.revertedWith(
        'Market has ended',
      );
    });
  });

  describe('Market Resolution', () => {
    let marketId: string;

    beforeEach(async () => {
      const endTime = Math.floor(Date.now() / 1000) + 86400;
      const tx = await market.connect(creator).createMarket('Question?', endTime);
      const receipt = await tx.wait();
      marketId = receipt.events?.find((e) => e.event === 'MarketCreated')?.args?.marketId;

      // Place some trades
      const amount = ethers.utils.parseUnits('100', 6);
      await market.connect(trader1).trade(marketId, 1, amount);
      await market.connect(trader2).trade(marketId, 0, amount);

      // Fast forward past end time
      await ethers.provider.send('evm_increaseTime', [86400 + 1]);
      await ethers.provider.send('evm_mine', []);
    });

    it('should resolve market', async () => {
      const tx = await market.connect(creator).resolveMarket(marketId, 1); // Outcome 1 wins
      const receipt = await tx.wait();
      const event = receipt.events?.find((e) => e.event === 'MarketResolved');

      expect(event).to.not.be.undefined;
      expect(event?.args?.winningOutcome).to.equal(1);
    });

    it('should distribute winnings correctly', async () => {
      const balanceBefore = await usdc.balanceOf(trader1.address);
      await market.connect(creator).resolveMarket(marketId, 1);
      await market.connect(trader1).claimWinnings(marketId);
      const balanceAfter = await usdc.balanceOf(trader1.address);

      expect(balanceAfter).to.be.gt(balanceBefore);
    });

    it('should not allow resolution before end time', async () => {
      // Create new market
      const endTime = Math.floor(Date.now() / 1000) + 86400;
      const tx = await market.connect(creator).createMarket('New question?', endTime);
      const receipt = await tx.wait();
      const newMarketId = receipt.events?.find((e) => e.event === 'MarketCreated')?.args
        ?.marketId;

      await expect(market.connect(creator).resolveMarket(newMarketId, 1)).to.be.revertedWith(
        'Market has not ended yet',
      );
    });

    it('should only allow creator to resolve', async () => {
      await expect(market.connect(trader1).resolveMarket(marketId, 1)).to.be.revertedWith(
        'Only creator can resolve',
      );
    });
  });

  describe('Gas Optimization', () => {
    it('should use acceptable gas for market creation', async () => {
      const endTime = Math.floor(Date.now() / 1000) + 86400;
      const tx = await market.connect(creator).createMarket('Question?', endTime);
      const receipt = await tx.wait();

      expect(receipt.gasUsed).to.be.lt(200000); // Should use less than 200k gas
    });

    it('should use acceptable gas for trading', async () => {
      const endTime = Math.floor(Date.now() / 1000) + 86400;
      const createTx = await market.connect(creator).createMarket('Question?', endTime);
      const createReceipt = await createTx.wait();
      const marketId = createReceipt.events?.find((e) => e.event === 'MarketCreated')?.args
        ?.marketId;

      const amount = ethers.utils.parseUnits('100', 6);
      const tradeTx = await market.connect(trader1).trade(marketId, 1, amount);
      const tradeReceipt = await tradeTx.wait();

      expect(tradeReceipt.gasUsed).to.be.lt(300000); // Should use less than 300k gas
    });
  });

  describe('Security', () => {
    it('should prevent reentrancy attacks', async () => {
      // Deploy malicious contract and test reentrancy protection
      // This would require a malicious contract mock
    });

    it('should prevent integer overflow', async () => {
      const endTime = Math.floor(Date.now() / 1000) + 86400;
      const tx = await market.connect(creator).createMarket('Question?', endTime);
      const receipt = await tx.wait();
      const marketId = receipt.events?.find((e) => e.event === 'MarketCreated')?.args?.marketId;

      const maxAmount = ethers.constants.MaxUint256;
      await expect(market.connect(trader1).trade(marketId, 1, maxAmount)).to.be.reverted;
    });
  });
});
```

---

## End-to-End Tests

### Running E2E Tests

```bash
# Start test environment
npm run test:e2e:setup

# Run E2E tests
npm run test:e2e

# Run specific E2E test
npm run test:e2e -- --grep "user registration"

# Clean up
npm run test:e2e:teardown
```

### Writing E2E Tests

**Example: Complete User Flow**

```typescript
// user-flow.e2e.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('User Flow (E2E)', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('User Registration and Authentication', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          address: '0x1234567890123456789012345678901234567890',
          username: 'testuser',
          email: 'test@example.com',
        })
        .expect(201);

      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      userId = response.body.userId;
    });

    it('should login with wallet signature', async () => {
      const message = 'Sign this message to login';
      const signature = '0xabcdef...'; // Mock signature

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          address: '0x1234567890123456789012345678901234567890',
          signature,
          message,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      authToken = response.body.accessToken;
    });

    it('should get user profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', userId);
      expect(response.body).toHaveProperty('username', 'testuser');
    });
  });

  describe('Market Creation and Trading', () => {
    let marketId: string;

    it('should create a market', async () => {
      const response = await request(app.getHttpServer())
        .post('/markets')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          question: 'Will BTC reach $100k by end of 2024?',
          category: 'crypto',
          endDate: '2024-12-31T23:59:59Z',
          initialLiquidity: '1000',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('question');
      marketId = response.body.id;
    });

    it('should get market details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/markets/${marketId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', marketId);
      expect(response.body).toHaveProperty('yesPrice');
      expect(response.body).toHaveProperty('noPrice');
    });

    it('should execute a trade', async () => {
      const response = await request(app.getHttpServer())
        .post(`/markets/${marketId}/trade`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          outcome: 1, // YES
          amount: '100',
        })
        .expect(201);

      expect(response.body).toHaveProperty('tradeId');
      expect(response.body).toHaveProperty('shares');
      expect(response.body).toHaveProperty('price');
    });

    it('should get user positions', async () => {
      const response = await request(app.getHttpServer())
        .get('/positions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('marketId', marketId);
    });
  });

  describe('Creator Flow', () => {
    it('should apply to become a creator', async () => {
      const response = await request(app.getHttpServer())
        .post('/creators/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bio: 'I am an expert in crypto markets',
          socialLinks: {
            twitter: '@testuser',
            website: 'https://example.com',
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty('status', 'pending');
    });

    it('should get creator application status', async () => {
      const response = await request(app.getHttpServer())
        .get('/creators/application')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'pending');
    });
  });

  describe('Notifications', () => {
    it('should get user notifications', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('notifications');
      expect(response.body.notifications).toBeInstanceOf(Array);
    });

    it('should mark notification as read', async () => {
      // First, get a notification
      const notifs = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      if (notifs.body.notifications.length > 0) {
        const notificationId = notifs.body.notifications[0].id;

        await request(app.getHttpServer())
          .patch(`/notifications/${notificationId}/read`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }
    });
  });
});
```

---

## Load Testing

### Running Load Tests

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt install k6  # Ubuntu

# Run load test
k6 run tests/load/basic-load.js

# Run with higher load
k6 run --vus 1000 --duration 5m tests/load/basic-load.js

# Run stress test
k6 run tests/load/stress-test.js
```

### Writing Load Tests

**Example: k6 Load Test**

```javascript
// tests/load/basic-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 500 }, // Ramp up to 500 users
    { duration: '3m', target: 500 }, // Stay at 500 users
    { duration: '1m', target: 1000 }, // Ramp up to 1000 users
    { duration: '3m', target: 1000 }, // Stay at 1000 users
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'], // Error rate should be less than 1%
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // Test 1: Get markets list
  let response = http.get(`${BASE_URL}/markets`);
  check(response, {
    'markets list status is 200': (r) => r.status === 200,
    'markets list response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(1);

  // Test 2: Get specific market
  const marketId = 'test-market-id';
  response = http.get(`${BASE_URL}/markets/${marketId}`);
  check(response, {
    'market details status is 200': (r) => r.status === 200,
    'market details response time < 300ms': (r) => r.timings.duration < 300,
  }) || errorRate.add(1);

  sleep(1);

  // Test 3: Health check
  response = http.get(`${BASE_URL}/health`);
  check(response, {
    'health check status is 200': (r) => r.status === 200,
    'health check response time < 100ms': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);

  sleep(2);
}
```

**Example: Artillery Load Test**

```yaml
# tests/load/artillery-config.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: Warm up
    - duration: 300
      arrivalRate: 100
      name: Sustained load
    - duration: 60
      arrivalRate: 200
      name: Spike
  defaults:
    headers:
      Content-Type: 'application/json'

scenarios:
  - name: 'Browse markets'
    flow:
      - get:
          url: '/markets'
          expect:
            - statusCode: 200
            - contentType: json
      - think: 2
      - get:
          url: '/markets/{{ $randomString() }}'
          expect:
            - statusCode: [200, 404]
      - think: 3

  - name: 'Authenticated user flow'
    flow:
      - post:
          url: '/auth/login'
          json:
            address: '0x{{ $randomString() }}'
            signature: '0x{{ $randomString() }}'
          capture:
            - json: '$.accessToken'
              as: token
      - get:
          url: '/users/me'
          headers:
            Authorization: 'Bearer {{ token }}'
          expect:
            - statusCode: 200
      - get:
          url: '/notifications'
          headers:
            Authorization: 'Bearer {{ token }}'
```

### Load Testing Checklist

- [ ] API endpoints tested with 1000 concurrent users
- [ ] Response times meet SLA (p50 <200ms, p95 <500ms, p99 <1s)
- [ ] Error rate <1% under load
- [ ] Database connection pool sized appropriately
- [ ] Redis cache hit ratio >80%
- [ ] Memory usage stable (no leaks)
- [ ] CPU usage acceptable (<80% sustained)
- [ ] WebSocket connections tested (1000+ concurrent)
- [ ] Graceful degradation under extreme load

---

## Security Testing

### Security Test Checklist

- [ ] SQL injection prevention tested
- [ ] XSS prevention tested
- [ ] CSRF protection tested
- [ ] Authentication bypass attempts blocked
- [ ] Authorization bypass attempts blocked
- [ ] Rate limiting enforced
- [ ] Input validation comprehensive
- [ ] File upload restrictions enforced
- [ ] Sensitive data not exposed in responses
- [ ] Error messages don't leak information
- [ ] HTTPS enforced in production
- [ ] Security headers configured
- [ ] Dependency vulnerabilities scanned
- [ ] Environment variables secured
- [ ] API keys not exposed in client
- [ ] CORS properly configured
- [ ] JWT tokens properly validated
- [ ] Password hashing secure (if applicable)
- [ ] Session management secure
- [ ] Audit logging comprehensive

### Running Security Tests

```bash
# Dependency vulnerability scan
npm audit
npm audit fix

# Advanced security scan
npm install -g snyk
snyk test
snyk monitor

# OWASP ZAP scan
docker run -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:3000

# Static code analysis
npm install -g eslint-plugin-security
eslint . --ext .ts --plugin security
```

### Security Test Examples

**Example: SQL Injection Test**

```typescript
// security/sql-injection.spec.ts
describe('SQL Injection Prevention', () => {
  it('should prevent SQL injection in market search', async () => {
    const maliciousInput = "'; DROP TABLE markets; --";

    const response = await request(app.getHttpServer())
      .get('/markets')
      .query({ search: maliciousInput })
      .expect(200); // Should not error

    // Verify markets table still exists
    const markets = await marketRepository.find();
    expect(markets).toBeDefined();
  });

  it('should sanitize user input', async () => {
    const maliciousQuestion = "<script>alert('XSS')</script>";

    const response = await request(app.getHttpServer())
      .post('/markets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ question: maliciousQuestion })
      .expect(400); // Should reject

    expect(response.body.message).toContain('Invalid characters');
  });
});
```

**Example: Authentication Bypass Test**

```typescript
// security/auth-bypass.spec.ts
describe('Authentication Bypass Prevention', () => {
  it('should reject requests without auth token', async () => {
    await request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('should reject invalid JWT tokens', async () => {
    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('should reject expired JWT tokens', async () => {
    const expiredToken = generateExpiredToken();

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('should reject tampered JWT tokens', async () => {
    const validToken = await generateValidToken();
    const tamperedToken = validToken.slice(0, -10) + 'tampered';

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${tamperedToken}`)
      .expect(401);
  });
});
```

---

## WebSocket Testing

### WebSocket Test Setup

```bash
# Install Socket.IO client for testing
npm install --save-dev socket.io-client
```

### WebSocket Tests

**Example: WebSocket Connection Test**

```typescript
// websocket/connection.spec.ts
import { io, Socket } from 'socket.io-client';
import { INestApplication } from '@nestjs/common';

describe('WebSocket Gateway', () => {
  let app: INestApplication;
  let socket: Socket;
  let authToken: string;

  beforeAll(async () => {
    // Start application
    app = await createTestApp();
    await app.listen(3000);

    // Get auth token
    authToken = await getTestAuthToken();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach((done) => {
    socket = io('http://localhost:3000', {
      auth: { token: authToken },
      transports: ['websocket'],
    });
    socket.on('connect', done);
  });

  afterEach(() => {
    if (socket.connected) {
      socket.disconnect();
    }
  });

  describe('Connection', () => {
    it('should connect with valid JWT token', (done) => {
      expect(socket.connected).toBe(true);
      done();
    });

    it('should reject connection without token', (done) => {
      const socketNoAuth = io('http://localhost:3000', {
        transports: ['websocket'],
      });

      socketNoAuth.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication required');
        socketNoAuth.disconnect();
        done();
      });
    });

    it('should auto-subscribe to user room', (done) => {
      socket.on('subscribed', (data) => {
        expect(data.room).toContain('user:');
        done();
      });
    });
  });

  describe('Room Subscriptions', () => {
    it('should subscribe to market room', (done) => {
      socket.emit('subscribe', { room: 'market', id: 'market123' });

      socket.on('subscribe:success', (data) => {
        expect(data.room).toBe('market:market123');
        done();
      });
    });

    it('should unsubscribe from room', (done) => {
      socket.emit('subscribe', { room: 'market', id: 'market123' });

      socket.once('subscribe:success', () => {
        socket.emit('unsubscribe', { room: 'market', id: 'market123' });

        socket.on('unsubscribe:success', (data) => {
          expect(data.room).toBe('market:market123');
          done();
        });
      });
    });
  });

  describe('Events', () => {
    it('should receive market:trade event', (done) => {
      const marketId = 'market123';

      // Subscribe to market
      socket.emit('subscribe', { room: 'market', id: marketId });

      socket.once('subscribe:success', () => {
        // Listen for trade event
        socket.on('market:trade', (event) => {
          expect(event.type).toBe('market:trade');
          expect(event.data.marketId).toBe(marketId);
          done();
        });

        // Trigger a trade (via API or directly)
        triggerTrade(marketId);
      });
    });

    it('should receive notification event', (done) => {
      socket.on('notification', (event) => {
        expect(event.type).toBe('notification');
        expect(event.data).toHaveProperty('message');
        done();
      });

      // Trigger notification
      triggerNotification(socket.id);
    });
  });

  describe('Heartbeat', () => {
    it('should respond to ping', (done) => {
      socket.on('pong', () => {
        done();
      });

      socket.emit('ping');
    });

    it('should auto-ping every 25 seconds', (done) => {
      let pingCount = 0;

      socket.on('ping', () => {
        pingCount++;
        if (pingCount === 2) {
          done();
        }
      });

      // Wait for 2 pings (50 seconds)
    }, 60000);
  });

  describe('Reconnection', () => {
    it('should reconnect after disconnect', (done) => {
      socket.disconnect();

      setTimeout(() => {
        socket.connect();

        socket.on('connect', () => {
          expect(socket.connected).toBe(true);
          done();
        });
      }, 1000);
    });

    it('should resubscribe to rooms after reconnection', (done) => {
      socket.emit('subscribe', { room: 'market', id: 'market123' });

      socket.once('subscribe:success', () => {
        socket.disconnect();

        setTimeout(() => {
          socket.connect();

          socket.on('connect', () => {
            // Should auto-resubscribe
            socket.on('market:trade', (event) => {
              expect(event).toBeDefined();
              done();
            });
          });
        }, 1000);
      });
    });
  });
});
```

---

## Test Coverage

### Viewing Coverage Reports

```bash
# Generate coverage report
npm run test:cov

# Open HTML coverage report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
```

### Coverage Configuration

```json
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.dto.ts'
  ]
};
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:cov
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:e2e

  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd contracts && npm ci
      - run: cd contracts && npx hardhat test
      - run: cd contracts && npx hardhat coverage

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm audit
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

---

## Testing Best Practices

### General Best Practices

1. **Write tests first (TDD)**: Write failing tests before implementing features
2. **Test behavior, not implementation**: Focus on what the code does, not how
3. **Keep tests isolated**: Each test should be independent
4. **Use descriptive names**: Test names should clearly state what they test
5. **Follow AAA pattern**: Arrange, Act, Assert
6. **Mock external dependencies**: Don't rely on external services in tests
7. **Test edge cases**: Test boundaries, nulls, errors
8. **Keep tests fast**: Unit tests should run in milliseconds
9. **Don't test framework code**: Only test your own logic
10. **Maintain tests**: Update tests when code changes

### Test Naming Convention

```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test implementation
    });
  });
});

// Examples:
it('should return user when valid ID provided')
it('should throw NotFoundException when user not found')
it('should update market price when trade executed')
```

### Test Organization

```
tests/
├── unit/                 # Unit tests (fast, isolated)
│   ├── services/
│   ├── controllers/
│   └── utils/
├── integration/          # Integration tests (database, Redis)
│   ├── database/
│   ├── cache/
│   └── external-apis/
├── e2e/                  # End-to-end tests (full flows)
│   ├── auth/
│   ├── markets/
│   └── trading/
├── load/                 # Load/performance tests
│   ├── k6/
│   └── artillery/
├── security/             # Security tests
│   ├── injection/
│   └── auth-bypass/
└── contracts/            # Smart contract tests
    ├── OpinionMarket/
    └── CreatorShares/
```

### Mocking Best Practices

```typescript
// Good: Mock only what you need
const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
};

// Bad: Over-mocking
const mockRepository = {
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  // ... 20 more methods you don't use
};

// Good: Use factory functions for test data
function createMockMarket(overrides = {}) {
  return {
    id: 'market-1',
    question: 'Will it rain?',
    endDate: new Date(),
    ...overrides,
  };
}

// Good: Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});
```

---

## Troubleshooting

### Common Test Issues

**Issue: Tests timing out**
```typescript
// Solution: Increase timeout for slow tests
it('should process large dataset', async () => {
  // Test implementation
}, 10000); // 10 second timeout
```

**Issue: Database not cleaned between tests**
```typescript
// Solution: Clear database in beforeEach
beforeEach(async () => {
  await repository.query('TRUNCATE TABLE markets CASCADE');
});
```

**Issue: Flaky tests (random failures)**
```typescript
// Problem: Race condition
it('should process async operation', async () => {
  service.processAsync(); // No await!
  const result = await service.getResult();
  expect(result).toBe('processed');
});

// Solution: Always await async operations
it('should process async operation', async () => {
  await service.processAsync(); // Await!
  const result = await service.getResult();
  expect(result).toBe('processed');
});
```

**Issue: Mock not being called**
```typescript
// Problem: Mock not properly injected
const mockService = { method: jest.fn() };
// But test uses real service

// Solution: Verify mock is injected
beforeEach(async () => {
  const module = await Test.createTestingModule({
    providers: [
      Controller,
      { provide: Service, useValue: mockService },
    ],
  }).compile();

  controller = module.get<Controller>(Controller);
  service = module.get<Service>(Service); // Verify this is mockService
});
```

---

## Test Metrics

### Key Metrics to Track

- **Code Coverage**: >90% overall
- **Test Execution Time**: <30 seconds for unit tests
- **Test Stability**: <1% flaky test rate
- **Bug Detection Rate**: Tests catch >95% of bugs before production
- **Test Maintenance Time**: <10% of development time

### Coverage Report Example

```
----------------------|---------|----------|---------|---------|-------------------
File                  | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------------------|---------|----------|---------|---------|-------------------
All files             |   92.45 |    88.76 |   94.32 |   92.89 |
 src/                 |     100 |      100 |     100 |     100 |
  app.module.ts       |     100 |      100 |     100 |     100 |
  main.ts             |     100 |      100 |     100 |     100 |
 src/modules/markets/ |   94.23 |    90.45 |   96.15 |   94.67 |
  market.service.ts   |   95.12 |    92.30 |   97.50 |   95.45 | 45,67,89
  market.controller.ts|   93.45 |    88.90 |   95.00 |   93.89 | 23,56
----------------------|---------|----------|---------|---------|-------------------
```

---

## Summary

This testing guide provides comprehensive coverage of all testing aspects for the GuessLyfe platform. Follow these guidelines to ensure:

- **High quality**: Catch bugs before production
- **Confidence**: Deploy with confidence knowing tests pass
- **Maintainability**: Well-tested code is easier to refactor
- **Documentation**: Tests serve as living documentation
- **Speed**: Fast feedback loop for developers

**Remember**: Tests are an investment in code quality and long-term maintainability. Write tests, maintain tests, and trust your tests.

For questions or issues with testing, consult:
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Local development setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Production deployment
- [RUNBOOK.md](./RUNBOOK.md) - Operations guide

---

**Last Updated**: 2024-11-16
**Version**: 1.0.0
