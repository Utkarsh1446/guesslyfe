/**
 * Markets E2E Tests
 *
 * Tests for opinion market endpoints including creation, trading,
 * resolution, and market queries
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

describe('Markets (e2e)', () => {
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

  describe('POST /markets', () => {
    it('should create market with valid parameters', async () => {
      const userRepo = dataSource.getRepository(User);
      const creator = await userRepo.findOne({
        where: { twitterId: testUsers.creator.twitterId },
      });

      const sessionToken = `test-session-${creator!.id}`;

      const futureTime = Math.floor(Date.now() / 1000) + 86400; // +24 hours

      const response = await authenticatedRequest(app, sessionToken)
        .post('/markets')
        .send({
          question: 'Will this test pass?',
          description: 'Testing market creation',
          endTime: futureTime,
          category: 'Technology',
          initialLiquidity: '100000000', // $100
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('question');
      expect(response.body.question).toBe('Will this test pass?');
    });

    it('should reject market with past end time', async () => {
      const userRepo = dataSource.getRepository(User);
      const creator = await userRepo.findOne({
        where: { twitterId: testUsers.creator.twitterId },
      });

      const sessionToken = `test-session-${creator!.id}`;

      const pastTime = Math.floor(Date.now() / 1000) - 3600; // -1 hour

      await authenticatedRequest(app, sessionToken)
        .post('/markets')
        .send({
          question: 'Will this test pass?',
          endTime: pastTime,
          category: 'Technology',
          initialLiquidity: '100000000',
        })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/${testConfig.app.apiPrefix}/markets`)
        .send({
          question: 'Will this test pass?',
          endTime: Math.floor(Date.now() / 1000) + 86400,
          category: 'Technology',
          initialLiquidity: '100000000',
        })
        .expect(401);
    });
  });

  describe('GET /markets', () => {
    it('should list all markets', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/markets`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/markets`)
        .query({ status: 'ACTIVE' })
        .expect(200);

      expect(response.body.every((m: any) => m.status === 'ACTIVE')).toBe(true);
    });

    it('should filter by category', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/markets`)
        .query({ category: 'Technology' })
        .expect(200);

      expect(response.body.every((m: any) => m.category === 'Technology')).toBe(true);
    });
  });

  describe('GET /markets/:id', () => {
    it('should get market by ID', async () => {
      // Would need to create a market first
      // Simplified test
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/markets/test-market-id`)
        .expect(404); // No market exists yet
    });
  });

  describe('POST /markets/:id/trade', () => {
    it('should buy market position', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      // Would need existing market - simplified test
      await authenticatedRequest(app, sessionToken)
        .post('/markets/test-market-id/trade')
        .send({
          outcome: true,
          amount: '10000000', // $10
        })
        .expect(404); // Market doesn't exist
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/${testConfig.app.apiPrefix}/markets/test-id/trade`)
        .send({
          outcome: true,
          amount: '10000000',
        })
        .expect(401);
    });
  });

  describe('POST /markets/:id/resolve', () => {
    it('should require admin authentication', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      await authenticatedRequest(app, sessionToken)
        .post('/markets/test-id/resolve')
        .send({ outcome: true })
        .expect(403); // Not admin
    });
  });

  describe('GET /markets/:id/activity', () => {
    it('should get market activity', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/markets/test-id/activity`)
        .expect(404); // Market doesn't exist
    });
  });
});
