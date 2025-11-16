/**
 * Creators E2E Tests
 *
 * Tests for creator endpoints including eligibility checks,
 * creator profiles, shares, and performance metrics
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

describe('Creators (e2e)', () => {
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

  describe('POST /creators/check-eligibility', () => {
    it('should check creator eligibility', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .post('/creators/check-eligibility')
        .send({ twitterHandle: 'eligible_creator' })
        .expect(200);

      expect(response.body).toHaveProperty('eligible');
      expect(response.body).toHaveProperty('followerCount');
    });

    it('should reject below minimum followers', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .post('/creators/check-eligibility')
        .send({ twitterHandle: 'not_eligible' })
        .expect(200);

      expect(response.body.eligible).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/${testConfig.app.apiPrefix}/creators/check-eligibility`)
        .send({ twitterHandle: 'testuser' })
        .expect(401);
    });
  });

  describe('GET /creators', () => {
    it('should list all creators', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/creators`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/creators`)
        .query({ status: 'ACTIVE' })
        .expect(200);

      expect(response.body.every((c: any) => c.status === 'ACTIVE')).toBe(true);
    });
  });

  describe('GET /creators/:address', () => {
    it('should get creator by address', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/creators/${testUsers.creator.walletAddress}`)
        .expect(200);

      expect(response.body.address.toLowerCase()).toBe(
        testUsers.creator.walletAddress!.toLowerCase()
      );
    });

    it('should return 404 for non-existent creator', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/creators/0x0000000000000000000000000000000000000000`)
        .expect(404);
    });
  });

  describe('GET /creators/:address/performance', () => {
    it('should get creator performance metrics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/creators/${testUsers.creator.walletAddress}/performance`)
        .expect(200);

      expect(response.body).toHaveProperty('totalVolume');
      expect(response.body).toHaveProperty('dividendsPaid');
    });
  });

  describe('GET /creators/:address/volume-progress', () => {
    it('should get volume unlock progress', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/creators/${testUsers.creator.walletAddress}/volume-progress`)
        .expect(200);

      expect(response.body).toHaveProperty('currentVolume');
      expect(response.body).toHaveProperty('targetVolume');
      expect(response.body).toHaveProperty('progress');
    });
  });
});
