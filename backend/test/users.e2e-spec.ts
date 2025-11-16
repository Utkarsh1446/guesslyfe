/**
 * Users E2E Tests
 *
 * Tests for user management endpoints including profiles,
 * portfolios, market positions, and transactions
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/database/entities/user.entity';
import {
  createTestApp,
  getDataSource,
  clearDatabase,
  seedDatabase,
  authenticatedRequest,
} from './helpers/test-helpers';
import { testConfig, testUsers } from './test.config';

describe('Users (e2e)', () => {
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

  describe('GET /users/me', () => {
    it('should return current user profile', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .get('/users/me')
        .expect(200);

      expect(response.body.id).toBe(user!.id);
      expect(response.body.twitterHandle).toBe(testUsers.validUser.twitterHandle);
      expect(response.body.displayName).toBe(testUsers.validUser.displayName);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/me`)
        .expect(401);
    });
  });

  describe('PATCH /users/me', () => {
    it('should update user profile', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const updates = {
        displayName: 'Updated Name',
        bio: 'Updated bio',
      };

      const response = await authenticatedRequest(app, sessionToken)
        .patch('/users/me')
        .send(updates)
        .expect(200);

      expect(response.body.displayName).toBe(updates.displayName);
      expect(response.body.bio).toBe(updates.bio);
    });

    it('should validate display name length', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      await authenticatedRequest(app, sessionToken)
        .patch('/users/me')
        .send({ displayName: 'a'.repeat(101) }) // Max is 100
        .expect(400);
    });

    it('should validate bio length', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      await authenticatedRequest(app, sessionToken)
        .patch('/users/me')
        .send({ bio: 'a'.repeat(501) }) // Max is 500
        .expect(400);
    });

    it('should validate profile picture URL', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      await authenticatedRequest(app, sessionToken)
        .patch('/users/me')
        .send({ profilePictureUrl: 'not-a-url' })
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/${testConfig.app.apiPrefix}/users/me`)
        .send({ displayName: 'New Name' })
        .expect(401);
    });
  });

  describe('GET /users/search', () => {
    it('should search users by handle', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/search`)
        .query({ q: 'test' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((u: any) => u.twitterHandle.includes('test'))).toBe(true);
    });

    it('should search users by display name', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/search`)
        .query({ q: 'User' })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((u: any) => u.displayName.includes('User'))).toBe(true);
    });

    it('should require minimum 2 characters', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/search`)
        .query({ q: 'a' })
        .expect(400);
    });

    it('should limit results', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/search`)
        .query({ q: 'test', limit: 1 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(1);
    });

    it('should enforce maximum limit of 50', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/search`)
        .query({ q: 'test', limit: 100 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(50);
    });

    it('should return empty array for no matches', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/search`)
        .query({ q: 'nonexistent123456' })
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /users/id/:id', () => {
    it('should get user by ID', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/id/${user!.id}`)
        .expect(200);

      expect(response.body.id).toBe(user!.id);
      expect(response.body.twitterHandle).toBe(testUsers.validUser.twitterHandle);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/id/${fakeId}`)
        .expect(404);
    });

    it('should validate UUID format', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/id/invalid-id`)
        .expect(400);
    });
  });

  describe('GET /users/handle/:handle', () => {
    it('should get user by Twitter handle', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/handle/${testUsers.validUser.twitterHandle}`)
        .expect(200);

      expect(response.body.twitterHandle).toBe(testUsers.validUser.twitterHandle);
      expect(response.body.displayName).toBe(testUsers.validUser.displayName);
    });

    it('should be case-insensitive', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/handle/${testUsers.validUser.twitterHandle.toUpperCase()}`)
        .expect(200);

      expect(response.body.twitterHandle.toLowerCase()).toBe(
        testUsers.validUser.twitterHandle.toLowerCase()
      );
    });

    it('should return 404 for non-existent handle', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/handle/nonexistentuser`)
        .expect(404);
    });
  });

  describe('GET /users/wallet/:address', () => {
    it('should get user by wallet address', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/wallet/${testUsers.validUser.walletAddress}`)
        .expect(200);

      expect(response.body.walletAddress.toLowerCase()).toBe(
        testUsers.validUser.walletAddress.toLowerCase()
      );
    });

    it('should be case-insensitive', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/wallet/${testUsers.validUser.walletAddress!.toUpperCase()}`)
        .expect(200);

      expect(response.body.walletAddress.toLowerCase()).toBe(
        testUsers.validUser.walletAddress!.toLowerCase()
      );
    });

    it('should return 404 for non-existent wallet', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/wallet/0x0000000000000000000000000000000000000000`)
        .expect(404);
    });

    it('should validate wallet address format', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/wallet/invalid`)
        .expect(400);
    });
  });

  describe('GET /users/me/portfolio', () => {
    it('should get user portfolio', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .get('/users/me/portfolio')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Portfolio might be empty for new user
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/me/portfolio`)
        .expect(401);
    });
  });

  describe('GET /users/:id/portfolio', () => {
    it('should get public portfolio', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/${user!.id}/portfolio`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/${fakeId}/portfolio`)
        .expect(404);
    });
  });

  describe('GET /users/me/markets', () => {
    it('should get user market positions', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .get('/users/me/markets')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/me/markets`)
        .expect(401);
    });
  });

  describe('GET /users/me/transactions', () => {
    it('should get transaction history', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .get('/users/me/transactions')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should support pagination', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .get('/users/me/transactions')
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(response.body.length).toBeLessThanOrEqual(10);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/me/transactions`)
        .expect(401);
    });
  });

  describe('Data Privacy', () => {
    it('should not expose sensitive fields in public endpoints', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/users/id/${user!.id}`)
        .expect(200);

      // Should not include sensitive fields
      expect(response.body.twitterAccessToken).toBeUndefined();
      expect(response.body.twitterRefreshToken).toBeUndefined();
      expect(response.body.password).toBeUndefined();
    });
  });
});
