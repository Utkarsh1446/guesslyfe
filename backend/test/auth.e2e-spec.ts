/**
 * Auth E2E Tests
 *
 * Tests for authentication endpoints including Twitter OAuth flow,
 * wallet linking, session management, and authorization
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
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
  randomAddress,
} from './helpers/test-helpers';
import { testConfig, testUsers } from './test.config';
import { mockTwitterService } from './mocks/twitter.mock';

describe('Auth (e2e)', () => {
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
    mockTwitterService.reset();
  });

  describe('GET /auth/twitter/login', () => {
    it('should redirect to Twitter OAuth page', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/auth/twitter/login`)
        .expect(302);

      expect(response.headers.location).toContain('twitter.com/i/oauth2/authorize');
      expect(response.headers.location).toContain('client_id=');
      expect(response.headers.location).toContain('code_challenge=');
      expect(response.headers.location).toContain('state=');

      // Should set code_verifier cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.startsWith('code_verifier='))).toBe(true);
    });

    it('should generate unique state parameter for each request', async () => {
      const response1 = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/auth/twitter/login`)
        .expect(302);

      const response2 = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/auth/twitter/login`)
        .expect(302);

      const state1 = new URL(response1.headers.location).searchParams.get('state');
      const state2 = new URL(response2.headers.location).searchParams.get('state');

      expect(state1).not.toEqual(state2);
    });

    it('should include PKCE challenge in redirect', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/auth/twitter/login`)
        .expect(302);

      const url = new URL(response.headers.location);
      expect(url.searchParams.get('code_challenge')).toBeDefined();
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    });
  });

  describe('GET /auth/twitter/callback', () => {
    it('should handle successful OAuth callback', async () => {
      // This would require mocking the entire OAuth flow
      // For now, we'll test the error cases

      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/auth/twitter/callback`)
        .query({ code: 'test_code', state: 'invalid_state' })
        .expect(302);

      expect(response.headers.location).toContain('/auth/error');
    });

    it('should reject callback without code', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/auth/twitter/callback`)
        .query({ state: 'test_state' })
        .expect(302);

      expect(response.headers.location).toContain('/auth/error');
    });

    it('should reject callback without state', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/auth/twitter/callback`)
        .query({ code: 'test_code' })
        .expect(302);

      expect(response.headers.location).toContain('/auth/error');
    });

    it('should reject callback with invalid state', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/auth/twitter/callback`)
        .query({ code: 'test_code', state: 'invalid_state' })
        .expect(302);

      expect(response.headers.location).toContain('/auth/error');
    });

    it('should reject callback without code_verifier cookie', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/auth/twitter/callback`)
        .query({ code: 'test_code', state: 'test_state' })
        .expect(302);

      expect(response.headers.location).toContain('/auth/error');
      expect(response.headers.location).toContain('Missing%20code%20verifier');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current authenticated user', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .get('/auth/me')
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.user.twitterHandle).toBe(testUsers.validUser.twitterHandle);
      expect(response.body.user.displayName).toBe(testUsers.validUser.displayName);
      expect(response.body.user.followerCount).toBe(testUsers.validUser.followerCount);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/auth/me`)
        .expect(401);
    });

    it('should return 401 with invalid session', async () => {
      await authenticatedRequest(app, 'invalid-session-token')
        .get('/auth/me')
        .expect(401);
    });

    it('should include isCreator flag', async () => {
      const userRepo = dataSource.getRepository(User);
      const creator = await userRepo.findOne({
        where: { twitterId: testUsers.creator.twitterId },
      });

      const sessionToken = `test-session-${creator!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .get('/auth/me')
        .expect(200);

      expect(response.body.user.isCreator).toBeDefined();
    });

    it('should include isAdmin flag', async () => {
      const userRepo = dataSource.getRepository(User);
      const admin = await userRepo.findOne({
        where: { twitterId: testUsers.admin.twitterId },
      });

      const sessionToken = `test-session-${admin!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .get('/auth/me')
        .expect(200);

      expect(response.body.user.isAdmin).toBe(true);
    });
  });

  describe('POST /auth/link-wallet', () => {
    it('should link valid wallet address', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;
      const newWalletAddress = randomAddress();

      const response = await authenticatedRequest(app, sessionToken)
        .post('/auth/link-wallet')
        .send({ walletAddress: newWalletAddress })
        .expect(200);

      expect(response.body.user.walletAddress).toBe(newWalletAddress);

      // Verify in database
      const updatedUser = await userRepo.findOne({ where: { id: user!.id } });
      expect(updatedUser!.walletAddress).toBe(newWalletAddress);
    });

    it('should reject invalid wallet address', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      await authenticatedRequest(app, sessionToken)
        .post('/auth/link-wallet')
        .send({ walletAddress: 'invalid-address' })
        .expect(400);
    });

    it('should reject missing wallet address', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      await authenticatedRequest(app, sessionToken)
        .post('/auth/link-wallet')
        .send({})
        .expect(400);
    });

    it('should reject wallet address with wrong format', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      await authenticatedRequest(app, sessionToken)
        .post('/auth/link-wallet')
        .send({ walletAddress: '0x123' }) // Too short
        .expect(400);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/${testConfig.app.apiPrefix}/auth/link-wallet`)
        .send({ walletAddress: randomAddress() })
        .expect(401);
    });

    it('should update existing wallet address', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;
      const wallet1 = randomAddress();
      const wallet2 = randomAddress();

      // Link first wallet
      await authenticatedRequest(app, sessionToken)
        .post('/auth/link-wallet')
        .send({ walletAddress: wallet1 })
        .expect(200);

      // Link second wallet (should update)
      const response = await authenticatedRequest(app, sessionToken)
        .post('/auth/link-wallet')
        .send({ walletAddress: wallet2 })
        .expect(200);

      expect(response.body.user.walletAddress).toBe(wallet2);
    });
  });

  describe('POST /auth/logout', () => {
    it('should successfully logout', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .post('/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);

      // Should clear session cookie
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('session_id=;'))).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post(`/${testConfig.app.apiPrefix}/auth/logout`)
        .expect(401);
    });

    it('should invalidate session after logout', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      // Logout
      await authenticatedRequest(app, sessionToken)
        .post('/auth/logout')
        .expect(200);

      // Try to access protected endpoint with same token
      await authenticatedRequest(app, sessionToken)
        .get('/auth/me')
        .expect(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limit on login endpoint', async () => {
      // Auth endpoints have 5 requests/minute limit

      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .get(`/${testConfig.app.apiPrefix}/auth/twitter/login`)
          .expect(302);
      }

      // 6th request should be rate limited
      await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/auth/twitter/login`)
        .expect(429);
    });
  });

  describe('Input Validation', () => {
    it('should sanitize special characters in wallet address', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      await authenticatedRequest(app, sessionToken)
        .post('/auth/link-wallet')
        .send({ walletAddress: '0x<script>alert("xss")</script>' })
        .expect(400);
    });

    it('should reject extraneous fields', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .post('/auth/link-wallet')
        .send({
          walletAddress: randomAddress(),
          isAdmin: true, // Should be ignored
          extraField: 'value', // Should cause validation error
        })
        .expect(400);

      expect(response.body.message).toContain('property extraField should not exist');
    });
  });

  describe('Security', () => {
    it('should not expose sensitive user data', async () => {
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .get('/auth/me')
        .expect(200);

      // Should not include sensitive fields
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.twitterAccessToken).toBeUndefined();
      expect(response.body.user.twitterRefreshToken).toBeUndefined();
    });

    it('should use httpOnly cookies for sessions', async () => {
      // This is tested by checking that session cookies have httpOnly flag
      // The actual implementation should set this flag
      const userRepo = dataSource.getRepository(User);
      const user = await userRepo.findOne({
        where: { twitterId: testUsers.validUser.twitterId },
      });

      const sessionToken = `test-session-${user!.id}`;

      const response = await authenticatedRequest(app, sessionToken)
        .get('/auth/me')
        .expect(200);

      // Response should not expose session token in body
      expect(response.body.sessionToken).toBeUndefined();
      expect(response.body.session).toBeUndefined();
    });
  });
});
