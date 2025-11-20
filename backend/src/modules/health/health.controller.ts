import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../common/decorators';

@ApiTags('System')
@Controller()
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get('health')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'System is healthy' })
  check() {
    return this.health.check([
      // Database health check
      () => this.db.pingCheck('database'),

      // Memory health check (heap should not exceed 150MB)
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),

      // Memory health check (RSS should not exceed 300MB)
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),

      // Disk health check (disk storage should not exceed 90% of 1GB)
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  /**
   * GET /version - Get API version info
   */
  @Get('version')
  @Public()
  @ApiOperation({
    summary: 'Get API version and environment info',
    description: 'Returns version, environment, and contract addresses',
  })
  @ApiResponse({
    status: 200,
    description: 'Version info retrieved',
    schema: {
      type: 'object',
      properties: {
        version: { type: 'string', example: '1.0.0' },
        environment: { type: 'string', example: 'production' },
        chainId: { type: 'number', example: 8453 },
        contracts: {
          type: 'object',
          properties: {
            creatorShareFactory: { type: 'string' },
            opinionMarket: { type: 'string' },
            feeCollector: { type: 'string' },
          },
        },
      },
    },
  })
  getVersion() {
    return {
      version: '1.0.0',
      environment: this.configService.get('app.env') || 'development',
      chainId: this.configService.get('blockchain.chainId') || 8453,
      contracts: {
        creatorShareFactory:
          this.configService.get('blockchain.creatorShareFactoryAddress') || '0x...',
        opinionMarket:
          this.configService.get('blockchain.opinionMarketAddress') || '0x...',
        feeCollector:
          this.configService.get('blockchain.feeCollectorAddress') || '0x...',
      },
    };
  }

  /**
   * GET /stats - Get public platform statistics
   */
  @Get('stats')
  @Public()
  @ApiOperation({
    summary: 'Get public platform statistics',
    description: 'Returns high-level platform metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform stats retrieved',
    schema: {
      type: 'object',
      properties: {
        stats: {
          type: 'object',
          properties: {
            totalUsers: { type: 'number', example: 10000 },
            totalCreators: { type: 'number', example: 100 },
            totalMarkets: { type: 'number', example: 500 },
            totalVolume: { type: 'number', example: 1000000.0 },
            volume24h: { type: 'number', example: 50000.0 },
            activeMarkets: { type: 'number', example: 150 },
          },
        },
      },
    },
  })
  async getStats() {
    // This would query actual stats from database
    // For now, returning placeholder values
    return {
      stats: {
        totalUsers: 0,
        totalCreators: 0,
        totalMarkets: 0,
        totalVolume: 0,
        volume24h: 0,
        activeMarkets: 0,
      },
    };
  }

  /**
   * GET /gas-prices - Get current Base gas prices
   */
  @Get('gas-prices')
  @Public()
  @ApiOperation({
    summary: 'Get current Base network gas prices',
    description: 'Returns gas price estimates for transactions',
  })
  @ApiResponse({
    status: 200,
    description: 'Gas prices retrieved',
    schema: {
      type: 'object',
      properties: {
        gasPrice: {
          type: 'object',
          properties: {
            slow: { type: 'number', example: 0.5 },
            standard: { type: 'number', example: 1.0 },
            fast: { type: 'number', example: 2.0 },
          },
        },
        unit: { type: 'string', example: 'gwei' },
        timestamp: { type: 'string', example: '2025-01-01T12:00:00Z' },
      },
    },
  })
  async getGasPrices() {
    // This would fetch real-time gas prices from Base network
    // For now, returning placeholder values
    return {
      gasPrice: {
        slow: 0.001,
        standard: 0.001,
        fast: 0.001,
      },
      unit: 'gwei',
      timestamp: new Date().toISOString(),
    };
  }
}
