/**
 * Health E2E Tests
 *
 * Tests for health check endpoints
 */

import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { createTestApp } from './helpers/test-helpers';
import { testConfig } from './test.config';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/health`)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('ok');
    });

    it('should check database health', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/health`)
        .expect(200);

      expect(response.body.info).toHaveProperty('database');
      expect(response.body.info.database.status).toBe('up');
    });

    it('should check memory health', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/health`)
        .expect(200);

      expect(response.body.info).toHaveProperty('memory_heap');
      expect(response.body.info).toHaveProperty('memory_rss');
    });

    it('should check disk health', async () => {
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/health`)
        .expect(200);

      expect(response.body.info).toHaveProperty('storage');
    });

    it('should be publicly accessible', async () => {
      // Should not require authentication
      const response = await request(app.getHttpServer())
        .get(`/${testConfig.app.apiPrefix}/health`)
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });
});
