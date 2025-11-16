/**
 * Performance Monitoring Interceptor
 *
 * Tracks API endpoint performance and logs slow operations
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from '../logging/logger.service';

interface PerformanceMetrics {
  endpoint: string;
  method: string;
  duration: number;
  timestamp: string;
}

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger: LoggerService;
  private readonly slowThreshold = parseInt(process.env.SLOW_ENDPOINT_THRESHOLD_MS || '1000');
  private readonly metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsSize = 1000;

  constructor() {
    this.logger = new LoggerService('Performance');

    // Log performance summary every 5 minutes
    if (process.env.NODE_ENV === 'production') {
      setInterval(() => this.logPerformanceSummary(), 5 * 60 * 1000);
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, path } = request;
    const startTime = Date.now();

    const handler = context.getHandler().name;
    const controller = context.getClass().name;
    const endpoint = `${controller}.${handler}`;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.recordMetric(endpoint, method, duration);

          // Log slow endpoints
          if (duration > this.slowThreshold) {
            this.logger.logWarn('Slow endpoint detected', {
              endpoint,
              controller,
              handler,
              method,
              path,
              duration: `${duration}ms`,
              threshold: `${this.slowThreshold}ms`,
            });
          } else if (duration > this.slowThreshold / 2) {
            // Log warning for endpoints taking more than half the threshold
            this.logger.logDebug('Endpoint performance warning', {
              endpoint,
              method,
              path,
              duration: `${duration}ms`,
            });
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.logError('Endpoint failed', error, {
            endpoint,
            controller,
            handler,
            method,
            path,
            duration: `${duration}ms`,
          });
        },
      }),
    );
  }

  /**
   * Record performance metric
   */
  private recordMetric(endpoint: string, method: string, duration: number): void {
    const metric: PerformanceMetrics = {
      endpoint,
      method,
      duration,
      timestamp: new Date().toISOString(),
    };

    this.metrics.push(metric);

    // Keep metrics array from growing too large
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics.shift();
    }
  }

  /**
   * Log performance summary
   */
  private logPerformanceSummary(): void {
    if (this.metrics.length === 0) {
      return;
    }

    // Group metrics by endpoint
    const endpointMetrics = new Map<string, number[]>();

    this.metrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpointMetrics.has(key)) {
        endpointMetrics.set(key, []);
      }
      endpointMetrics.get(key)!.push(metric.duration);
    });

    // Calculate statistics for each endpoint
    const summary = Array.from(endpointMetrics.entries()).map(([endpoint, durations]) => {
      const sorted = durations.sort((a, b) => a - b);
      const count = durations.length;
      const sum = durations.reduce((a, b) => a + b, 0);
      const avg = sum / count;
      const median = sorted[Math.floor(count / 2)];
      const p95 = sorted[Math.floor(count * 0.95)];
      const p99 = sorted[Math.floor(count * 0.99)];
      const max = sorted[count - 1];

      return {
        endpoint,
        count,
        avg: Math.round(avg),
        median,
        p95,
        p99,
        max,
      };
    });

    // Sort by p95 descending
    summary.sort((a, b) => b.p95 - a.p95);

    // Log top 10 slowest endpoints
    this.logger.logInfo('Performance Summary (Last 5 minutes)', {
      totalRequests: this.metrics.length,
      slowestEndpoints: summary.slice(0, 10),
    });

    // Clear metrics
    this.metrics.length = 0;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get performance statistics
   */
  getStatistics() {
    const endpointStats = new Map<string, {
      count: number;
      totalDuration: number;
      maxDuration: number;
      minDuration: number;
    }>();

    this.metrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const stats = endpointStats.get(key) || {
        count: 0,
        totalDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
      };

      stats.count++;
      stats.totalDuration += metric.duration;
      stats.maxDuration = Math.max(stats.maxDuration, metric.duration);
      stats.minDuration = Math.min(stats.minDuration, metric.duration);

      endpointStats.set(key, stats);
    });

    return Array.from(endpointStats.entries()).map(([endpoint, stats]) => ({
      endpoint,
      count: stats.count,
      avgDuration: Math.round(stats.totalDuration / stats.count),
      maxDuration: stats.maxDuration,
      minDuration: stats.minDuration === Infinity ? 0 : stats.minDuration,
    }));
  }
}
