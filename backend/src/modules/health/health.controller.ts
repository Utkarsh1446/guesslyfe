import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import axios from 'axios';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../common/decorators';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
    @InjectDataSource() private dataSource: DataSource,
    @InjectRedis() private redis: Redis,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({
    summary: 'Health check',
    description: 'Basic health check including database, memory, and disk usage',
  })
  @ApiResponse({
    status: 200,
    description: 'System health status',
  })
  @ApiResponse({
    status: 503,
    description: 'Service unavailable - health check failed',
  })
  check() {
    return this.health.check([
      // Database health check
      () => this.db.pingCheck('database'),

      // Memory health check (heap should not exceed 1.5GB)
      () => this.memory.checkHeap('memory_heap', 1.5 * 1024 * 1024 * 1024),

      // Memory health check (RSS should not exceed 2GB)
      () => this.memory.checkRSS('memory_rss', 2 * 1024 * 1024 * 1024),

      // Disk health check (disk storage should not exceed 90%)
      () =>
        this.disk.checkStorage('storage', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  @Get('detailed')
  @Public()
  @ApiOperation({
    summary: 'Detailed health check',
    description: 'Comprehensive health check with all system components',
  })
  @ApiResponse({
    status: 200,
    description: 'Detailed system health status',
  })
  async checkDetailed() {
    const startTime = Date.now();

    // Collect all health metrics
    const [
      databaseHealth,
      redisHealth,
      blockchainHealth,
      memoryHealth,
      processHealth,
    ] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkBlockchain(),
      this.checkMemory(),
      this.checkProcess(),
    ]);

    const responseTime = Date.now() - startTime;

    // Determine overall status
    const components = [
      databaseHealth,
      redisHealth,
      blockchainHealth,
      memoryHealth,
      processHealth,
    ];

    const allHealthy = components.every((c) => c.status === 'healthy');
    const anyCritical = components.some((c) => c.status === 'unhealthy');

    return {
      status: anyCritical ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      uptime: `${Math.floor(process.uptime())}s`,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '0.1.0',
      components: {
        database: databaseHealth,
        redis: redisHealth,
        blockchain: blockchainHealth,
        memory: memoryHealth,
        process: processHealth,
      },
    };
  }

  private async checkDatabase(): Promise<any> {
    const startTime = Date.now();

    try {
      // Test connection
      await this.dataSource.query('SELECT 1');

      // Get connection pool stats
      const queryRunner = this.dataSource.createQueryRunner();
      const poolStats = {
        totalConnections: 10, // From your connection pool config
        activeConnections: this.dataSource.driver['master']?.pool?._count || 0,
      };
      queryRunner.release();

      // Get database version
      const versionResult = await this.dataSource.query('SELECT version()');
      const version = versionResult[0]?.version?.split(' ')[1] || 'unknown';

      return {
        status: 'healthy',
        responseTime: `${Date.now() - startTime}ms`,
        version,
        pool: poolStats,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: `${Date.now() - startTime}ms`,
        error: error.message,
      };
    }
  }

  private async checkRedis(): Promise<any> {
    const startTime = Date.now();

    try {
      // Test connection
      await this.redis.ping();

      // Get Redis info
      const info = await this.redis.info('server');
      const versionMatch = info.match(/redis_version:([^\r\n]+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      // Get memory stats
      const memoryInfo = await this.redis.info('memory');
      const usedMemoryMatch = memoryInfo.match(/used_memory_human:([^\r\n]+)/);
      const usedMemory = usedMemoryMatch ? usedMemoryMatch[1] : 'unknown';

      return {
        status: 'healthy',
        responseTime: `${Date.now() - startTime}ms`,
        version,
        memory: usedMemory,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: `${Date.now() - startTime}ms`,
        error: error.message,
      };
    }
  }

  private async checkBlockchain(): Promise<any> {
    const startTime = Date.now();
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;

    if (!rpcUrl) {
      return {
        status: 'unknown',
        message: 'RPC URL not configured',
      };
    }

    try {
      // Test RPC connection with eth_blockNumber
      const response = await axios.post(
        rpcUrl,
        {
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1,
        },
        { timeout: 5000 },
      );

      const blockNumber = parseInt(response.data.result, 16);

      return {
        status: 'healthy',
        responseTime: `${Date.now() - startTime}ms`,
        network: process.env.BLOCKCHAIN_NETWORK || 'unknown',
        latestBlock: blockNumber,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: `${Date.now() - startTime}ms`,
        error: error.message,
      };
    }
  }

  private async checkMemory(): Promise<any> {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    const usedMem = totalMem - freeMem;
    const memPercentage = (usedMem / totalMem) * 100;

    const status =
      memPercentage > 90
        ? 'unhealthy'
        : memPercentage > 80
        ? 'degraded'
        : 'healthy';

    return {
      status,
      heap: {
        used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        limit: `${Math.round((memUsage.heapTotal * 1.5) / 1024 / 1024)}MB`,
      },
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      system: {
        total: `${Math.round(totalMem / 1024 / 1024)}MB`,
        free: `${Math.round(freeMem / 1024 / 1024)}MB`,
        used: `${Math.round(usedMem / 1024 / 1024)}MB`,
        percentage: `${memPercentage.toFixed(2)}%`,
      },
    };
  }

  private async checkProcess(): Promise<any> {
    const cpuUsage = process.cpuUsage();
    const cpus = require('os').cpus();
    const loadAvg = require('os').loadavg();

    return {
      status: 'healthy',
      uptime: `${Math.floor(process.uptime())}s`,
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      cpu: {
        cores: cpus.length,
        model: cpus[0]?.model || 'unknown',
        loadAverage: {
          '1min': loadAvg[0].toFixed(2),
          '5min': loadAvg[1].toFixed(2),
          '15min': loadAvg[2].toFixed(2),
        },
      },
    };
  }

  @Get('ready')
  @Public()
  @ApiOperation({
    summary: 'Readiness check',
    description: 'Check if service is ready to accept traffic',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is ready',
  })
  @ApiResponse({
    status: 503,
    description: 'Service is not ready',
  })
  async checkReady() {
    try {
      // Check critical dependencies
      await Promise.all([
        this.dataSource.query('SELECT 1'),
        this.redis.ping(),
      ]);

      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error('Service not ready');
    }
  }

  @Get('live')
  @Public()
  @ApiOperation({
    summary: 'Liveness check',
    description: 'Check if service is alive (for Kubernetes)',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
  })
  checkLive() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
