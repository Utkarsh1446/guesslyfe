/**
 * Dividends E2E Tests
 *
 * Tests for dividend endpoints including epochs, claims,
 * and distribution workflows
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

describe('Dividends (e2e)', () => {
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

  describe('GET /dividends/epochs', () => {
    it('should list dividend epochs', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/dividends/epochs`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by creator address', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/dividends/epochs`)
        .query({ creatorAddress: testUsers.creator.walletAddress })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /dividends/epochs/:epochId', () => {
    it('should get epoch details', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/dividends/epochs/test-epoch-id`)
        .expect(404); // No epochs exist
    });
  });

  describe('GET /dividends/my-dividends', () => {
    it('should get user claimable dividends', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .get('/dividends/my-dividends')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/dividends/my-dividends`)
        .expect(401);
    });
  });

  describe('POST /dividends/claim', () => {
    it('should claim dividends', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      await authenticatedRequest(app, sessionToken)
        .post('/dividends/claim')
        .send({
          epochId: 'test-epoch-id',
          creatorAddress: testUsers.creator.walletAddress,
        })
        .expect(404); // No epoch exists
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/${testConfig.app.apiPrefix}/dividends/claim`)
        .send({
          epochId: 'test-epoch-id',
          creatorAddress: testUsers.creator.walletAddress,
        })
        .expect(401);
    });
  });

  describe('GET /dividends/creator/:address/earnings', () => {
    it('should get creator total earnings', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/dividends/creator/${testUsers.creator.walletAddress}/earnings`)
        .expect(200);

      expect(response.body).toHaveProperty('totalEarnings');
      expect(response.body).toHaveProperty('totalDividendsPaid');
    });
  });
});
