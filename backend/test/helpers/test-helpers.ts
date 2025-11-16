/**
 * Test Helpers
 *
 * Utility functions for E2E tests
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { testConfig, testUsers } from '../test.config';
import { AppModule } from '../../src/app.module';
import { User } from '../../src/database/entities/user.entity';
import { Creator } from '../../src/database/entities/creator.entity';

/**
 * Create and configure test application
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [() => ({
          app: testConfig.app,
          database: testConfig.database,
          redis: testConfig.redis,
          jwt: testConfig.jwt,
          twitter: testConfig.twitter,
          blockchain: testConfig.blockchain,
        })],
      }),
      // Disable rate limiting for tests
      ThrottlerModule.forRoot([{
        ttl: 60000,
        limit: 1000,
      }]),
      AppModule,
    ],
  })
    .overrideProvider('DatabaseConfig')
    .useValue(testConfig.database)
    .compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix(testConfig.app.apiPrefix);

  await app.init();

  return app;
}

/**
 * Get database connection from app
 */
export function getDataSource(app: INestApplication): DataSource {
  return app.get(DataSource);
}

/**
 * Clear all database tables
 */
export async function clearDatabase(dataSource: DataSource): Promise<void> {
  const entities = dataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE "${entity.tableName}" CASCADE;`);
  }
}

/**
 * Seed database with test data
 */
export async function seedDatabase(dataSource: DataSource): Promise<{
  users: User[];
  creators: Creator[];
}> {
  const userRepository = dataSource.getRepository(User);
  const creatorRepository = dataSource.getRepository(Creator);

  // Create test users
  const users = await userRepository.save([
    userRepository.create(testUsers.validUser),
    userRepository.create(testUsers.creator),
    userRepository.create(testUsers.admin),
  ]);

  // Create test creator
  const creators = await creatorRepository.save([
    creatorRepository.create({
      address: testUsers.creator.walletAddress,
      twitterHandle: testUsers.creator.twitterHandle,
      displayName: testUsers.creator.displayName,
      profilePictureUrl: testUsers.creator.profilePictureUrl,
      followerCount: testUsers.creator.followerCount,
      sharePrice: '1000000', // $1.00 in USDC (6 decimals)
      totalSupply: '1000000000000000000', // 1 share
      sharesUnlocked: true,
      verified: true,
      status: 'ACTIVE',
    }),
  ]);

  return { users, creators };
}

/**
 * Create authenticated session for testing
 */
export async function createAuthSession(
  app: INestApplication,
  user: Partial<User>,
): Promise<string> {
  const dataSource = getDataSource(app);
  const userRepository = dataSource.getRepository(User);

  // Ensure user exists in database
  let dbUser = await userRepository.findOne({
    where: { twitterId: user.twitterId },
  });

  if (!dbUser) {
    dbUser = await userRepository.save(userRepository.create(user));
  }

  // Create session (this would normally be done via auth service)
  // For tests, we'll create a mock session token
  const sessionData = {
    userId: dbUser.id,
    twitterHandle: dbUser.twitterHandle,
    isCreator: false,
    isAdmin: user.isAdmin || false,
  };

  // In a real implementation, this would use the AuthService
  // For tests, we'll return a mock token
  return `test-session-${dbUser.id}`;
}

/**
 * Make authenticated request
 */
export function authenticatedRequest(
  app: INestApplication,
  sessionToken: string,
) {
  return {
    get: (url: string) =>
      request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}${url}`)
        .set('Cookie', `session_id=${sessionToken}`),

    post: (url: string) =>
      request(app.getHttpServer())
        .post(`/${testConfig.app.apiPrefix}${url}`)
        .set('Cookie', `session_id=${sessionToken}`),

    patch: (url: string) =>
      request(app.getHttpServer())
        .patch(`/${testConfig.app.apiPrefix}${url}`)
        .set('Cookie', `session_id=${sessionToken}`),

    put: (url: string) =>
      request(app.getHttpServer())
        .put(`/${testConfig.app.apiPrefix}${url}`)
        .set('Cookie', `session_id=${sessionToken}`),

    delete: (url: string) =>
      request(app.getHttpServer())
        .delete(`/${testConfig.app.apiPrefix}${url}`)
        .set('Cookie', `session_id=${sessionToken}`),
  };
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Generate random Ethereum address
 */
export function randomAddress(): string {
  const chars = '0123456789abcdef';
  let address = '0x';
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  return address;
}

/**
 * Generate random wallet signature
 */
export function mockSignature(message: string, address: string): string {
  // Mock signature for testing
  return `0x${'a'.repeat(130)}`;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
