import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../decorators';
import { MetricsService } from './metrics.service';

/**
 * Metrics Controller
 *
 * Exposes Prometheus-compatible metrics endpoint for scraping
 */
@ApiTags('Monitoring')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Prometheus metrics',
    description: 'Returns Prometheus-compatible metrics for scraping',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics in Prometheus format',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/v1/health",status_code="200"} 42

# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.05",method="GET",path="/api/v1/health",status_code="200"} 40
http_request_duration_seconds_bucket{le="0.1",method="GET",path="/api/v1/health",status_code="200"} 42`,
        },
      },
    },
  })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
