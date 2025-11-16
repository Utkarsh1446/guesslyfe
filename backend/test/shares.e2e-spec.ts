/**
 * Shares E2E Tests
 *
 * Tests for share trading endpoints including buy/sell operations,
 * transactions, and price calculations
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import {
  createTestApp,
  getDataSource,
  clearDatabase,
  seedDatabase,
  authenticatedRequest,
} from './helpers/test-helpers';
import { testConfig, testUsers } from './test.config';
import { User } from '../src/database/entities/user.entity';

describe('Shares (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    dataSource = getDataSource(app);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearDatabase(dataSource);
    await seedDatabase(dataSource);
  });

  describe('POST /shares/buy', () => {
    it('should buy shares with valid parameters', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .post('/shares/buy')
        .send({
          creatorAddress: testUsers.creator.walletAddress,
          amount: '1000000000000000000', // 1 share
          maxPrice: '1500000', // Max $1.50
        })
        .expect(200);

      expect(response.body).toHaveProperty('transactionHash');
      expect(response.body).toHaveProperty('sharesPurchased');
    });

    it('should reject buy without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/${testConfig.app.apiPrefix}/shares/buy`)
        .send({
          creatorAddress: testUsers.creator.walletAddress,
          amount: '1000000000000000000',
          maxPrice: '1500000',
        })
        .expect(401);
    });

    it('should validate amount format', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      await authenticatedRequest(app, sessionToken)
        .post('/shares/buy')
        .send({
          creatorAddress: testUsers.creator.walletAddress,
          amount: 'invalid',
          maxPrice: '1500000',
        })
        .expect(400);
    });
  });

  describe('POST /shares/sell', () => {
    it('should sell shares with valid parameters', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .post('/shares/sell')
        .send({
          creatorAddress: testUsers.creator.walletAddress,
          amount: '500000000000000000', // 0.5 shares
          minPrice: '900000', // Min $0.90
        })
        .expect(200);

      expect(response.body).toHaveProperty('transactionHash');
      expect(response.body).toHaveProperty('sharesSold');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/${testConfig.app.apiPrefix}/shares/sell`)
        .send({
          creatorAddress: testUsers.creator.walletAddress,
          amount: '500000000000000000',
          minPrice: '900000',
        })
        .expect(401);
    });
  });

  describe('GET /shares/:creatorAddress/price', () => {
    it('should get current share price', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/shares/${testUsers.creator.walletAddress}/price`)
        .expect(200);

      expect(response.body).toHaveProperty('currentPrice');
      expect(response.body).toHaveProperty('totalSupply');
    });
  });

  describe('GET /shares/:creatorAddress/chart', () => {
    it('should get price chart data', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/shares/${testUsers.creator.walletAddress}/chart`)
        .query({ period: '7d' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /shares/:creatorAddress/holders', () => {
    it('should list share holders', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/shares/${testUsers.creator.walletAddress}/holders`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /shares/:creatorAddress/transactions', () => {
    it('should list share transactions', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/shares/${testUsers.creator.walletAddress}/transactions`)
        .query({ limit: 50 })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
