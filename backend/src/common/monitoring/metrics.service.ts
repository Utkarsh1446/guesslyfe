import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import {
  Counter,
  Histogram,
  Gauge,
  Registry,
} from 'prom-client';

/**
 * Metrics Service
 *
 * Collects and exposes application metrics for Prometheus/GCP Cloud Monitoring:
 * - Request rate and latency
 * - Error rates
 * - Database and Redis metrics
 * - Blockchain RPC metrics
 * - Business metrics (markets, trades, users)
 */
@Injectable()
export class MetricsService {
  constructor(
    // HTTP Metrics
    @InjectMetric('http_requests_total')
    private readonly httpRequestsTotal: Counter<string>,

    @InjectMetric('http_request_duration_seconds')
    private readonly httpRequestDuration: Histogram<string>,

    @InjectMetric('http_errors_total')
    private readonly httpErrorsTotal: Counter<string>,

    // Database Metrics
    @InjectMetric('db_query_duration_seconds')
    private readonly dbQueryDuration: Histogram<string>,

    @InjectMetric('db_connections_active')
    private readonly dbConnectionsActive: Gauge<string>,

    @InjectMetric('db_query_errors_total')
    private readonly dbQueryErrors: Counter<string>,

    // Redis Metrics
    @InjectMetric('redis_command_duration_seconds')
    private readonly redisCommandDuration: Histogram<string>,

    @InjectMetric('redis_errors_total')
    private readonly redisErrors: Counter<string>,

    // Blockchain Metrics
    @InjectMetric('blockchain_rpc_duration_seconds')
    private readonly blockchainRpcDuration: Histogram<string>,

    @InjectMetric('blockchain_rpc_errors_total')
    private readonly blockchainRpcErrors: Counter<string>,

    // Business Metrics
    @InjectMetric('markets_created_total')
    private readonly marketsCreated: Counter<string>,

    @InjectMetric('trades_executed_total')
    private readonly tradesExecuted: Counter<string>,

    @InjectMetric('active_users')
    private readonly activeUsers: Gauge<string>,

    @InjectMetric('queue_processing_duration_seconds')
    private readonly queueProcessingDuration: Histogram<string>,

    private readonly registry: Registry,
  ) {}

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
  ): void {
    const labels = {
      method,
      path: this.normalizePath(path),
      status_code: statusCode.toString(),
    };

    // Increment request counter
    this.httpRequestsTotal.inc(labels);

    // Record request duration in seconds
    this.httpRequestDuration.observe(labels, durationMs / 1000);

    // Track errors (4xx and 5xx)
    if (statusCode >= 400) {
      const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
      this.httpErrorsTotal.inc({ ...labels, error_type: errorType });
    }
  }

  /**
   * Record database query metrics
   */
  recordDbQuery(
    operation: string,
    table: string,
    durationMs: number,
    success: boolean = true,
  ): void {
    const labels = { operation, table };

    // Record query duration
    this.dbQueryDuration.observe(labels, durationMs / 1000);

    // Track errors
    if (!success) {
      this.dbQueryErrors.inc(labels);
    }
  }

  /**
   * Update active database connections
   */
  updateDbConnections(active: number, idle: number): void {
    this.dbConnectionsActive.set({ state: 'active' }, active);
    this.dbConnectionsActive.set({ state: 'idle' }, idle);
  }

  /**
   * Record Redis command metrics
   */
  recordRedisCommand(
    command: string,
    durationMs: number,
    success: boolean = true,
  ): void {
    const labels = { command };

    // Record command duration
    this.redisCommandDuration.observe(labels, durationMs / 1000);

    // Track errors
    if (!success) {
      this.redisErrors.inc(labels);
    }
  }

  /**
   * Record blockchain RPC metrics
   */
  recordBlockchainRpc(
    method: string,
    durationMs: number,
    success: boolean = true,
  ): void {
    const labels = { method };

    // Record RPC duration
    this.blockchainRpcDuration.observe(labels, durationMs / 1000);

    // Track errors
    if (!success) {
      this.blockchainRpcErrors.inc(labels);
    }
  }

  /**
   * Record queue processing metrics
   */
  recordQueueProcessing(
    queueName: string,
    jobName: string,
    durationMs: number,
  ): void {
    const labels = { queue: queueName, job: jobName };
    this.queueProcessingDuration.observe(labels, durationMs / 1000);
  }

  /**
   * Business Metrics
   */

  incrementMarketsCreated(category?: string): void {
    this.marketsCreated.inc({ category: category || 'unknown' });
  }

  incrementTradesExecuted(marketId: string, direction: 'buy' | 'sell'): void {
    this.tradesExecuted.inc({ market_id: marketId, direction });
  }

  updateActiveUsers(count: number): void {
    this.activeUsers.set(count);
  }

  /**
   * Normalize API paths to avoid high cardinality
   * Replace dynamic segments (IDs, UUIDs) with placeholders
   */
  private normalizePath(path: string): string {
    return path
      // Replace UUIDs
      .replace(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
        ':id',
      )
      // Replace numeric IDs
      .replace(/\/\d+/g, '/:id')
      // Replace wallet addresses
      .replace(/\/0x[a-fA-F0-9]{40}/g, '/:address')
      // Replace Twitter handles
      .replace(/@[\w]+/g, ':handle');
  }

  /**
   * Get current metrics as plain object (for debugging)
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Reset all metrics (for testing)
   */
  resetMetrics(): void {
    this.registry.resetMetrics();
  }
}
