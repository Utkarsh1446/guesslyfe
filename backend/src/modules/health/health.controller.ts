import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { Public } from '../../common/decorators';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
    private disk: DiskHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
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
}
