import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

/**
 * Metrics Module
 *
 * Provides Prometheus metrics for monitoring application performance
 * and health. Metrics are exposed on /metrics endpoint.
 */
@Module({
  imports: [
    PrometheusModule.register({
      // Metrics endpoint path
      path: '/metrics',
      // Default metrics (CPU, memory, event loop, etc.)
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'guesslyfe_',
        },
      },
    }),
  ],
  controllers: [MetricsController],
  providers: [
    MetricsService,

    // HTTP Metrics
    makeCounterProvider({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status_code'],
    }),
    makeHistogramProvider({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    }),
    makeCounterProvider({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'path', 'status_code', 'error_type'],
    }),

    // Database Metrics
    makeHistogramProvider({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1, 2],
    }),
    makeGaugeProvider({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      labelNames: ['state'],
    }),
    makeCounterProvider({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation', 'table'],
    }),

    // Redis Metrics
    makeHistogramProvider({
      name: 'redis_command_duration_seconds',
      help: 'Redis command duration in seconds',
      labelNames: ['command'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
    }),
    makeCounterProvider({
      name: 'redis_errors_total',
      help: 'Total number of Redis errors',
      labelNames: ['command'],
    }),

    // Blockchain Metrics
    makeHistogramProvider({
      name: 'blockchain_rpc_duration_seconds',
      help: 'Blockchain RPC call duration in seconds',
      labelNames: ['method'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    }),
    makeCounterProvider({
      name: 'blockchain_rpc_errors_total',
      help: 'Total number of blockchain RPC errors',
      labelNames: ['method'],
    }),

    // Queue Metrics
    makeHistogramProvider({
      name: 'queue_processing_duration_seconds',
      help: 'Queue job processing duration in seconds',
      labelNames: ['queue', 'job'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
    }),

    // Business Metrics
    makeCounterProvider({
      name: 'markets_created_total',
      help: 'Total number of markets created',
      labelNames: ['category'],
    }),
    makeCounterProvider({
      name: 'trades_executed_total',
      help: 'Total number of trades executed',
      labelNames: ['market_id', 'direction'],
    }),
    makeGaugeProvider({
      name: 'active_users',
      help: 'Number of active users in the last 24 hours',
    }),
  ],
  exports: [MetricsService],
})
export class MetricsModule {}
