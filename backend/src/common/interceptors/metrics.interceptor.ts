import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../monitoring/metrics.service';

/**
 * Metrics Interceptor
 *
 * Automatically records HTTP request metrics for all endpoints:
 * - Request count
 * - Response time
 * - Error rates
 *
 * Usage: Apply globally in main.ts
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Only intercept HTTP requests
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.recordMetrics(request, response, startTime);
        },
        error: (error) => {
          // Record metrics even on error
          this.recordMetrics(request, response, startTime, error);
        },
      }),
    );
  }

  private recordMetrics(
    request: any,
    response: any,
    startTime: number,
    error?: any,
  ): void {
    const duration = Date.now() - startTime;
    const method = request.method;
    const path = request.route?.path || request.url;
    const statusCode = error?.status || response.statusCode || 500;

    // Record HTTP request metrics
    this.metricsService.recordHttpRequest(method, path, statusCode, duration);
  }
}
