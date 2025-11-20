import { ApiProperty } from '@nestjs/swagger';

export class SystemHealthResponseDto {
  @ApiProperty({ description: 'Overall status', example: 'healthy' })
  status: string;

  @ApiProperty({ description: 'Timestamp' })
  timestamp: string;

  @ApiProperty({ description: 'Services health' })
  services: {
    database: { status: string; responseTime: number };
    redis: { status: string; responseTime: number };
    blockchain: { status: string; rpcResponseTime: number; blockNumber: number };
    twitter: { status: string; scraperAccountsHealthy: number };
  };

  @ApiProperty({ description: 'System metrics' })
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };

  @ApiProperty({ description: 'Queue status' })
  queues: {
    epochFinalizer: { waiting: number; active: number; failed: number };
    volumeTracker: { waiting: number; active: number; failed: number };
  };
}

export class PlatformStatsResponseDto {
  @ApiProperty({ description: 'Platform statistics' })
  stats: {
    users: {
      total: number;
      active24h: number;
      active7d: number;
      newToday: number;
    };
    creators: {
      total: number;
      active: number;
      pending: number;
      suspended: number;
      withShares: number;
    };
    markets: {
      total: number;
      active: number;
      resolved: number;
      disputed: number;
      pending: number;
    };
    volume: {
      allTime: number;
      last24h: number;
      last7d: number;
      last30d: number;
    };
    revenue: {
      allTime: number;
      last24h: number;
      last7d: number;
      last30d: number;
    };
  };
}

export class TriggerJobResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Job info' })
  job: {
    id: string;
    name: string;
    status: string;
    queuedAt: string;
  };
}

export class ErrorLogsResponseDto {
  @ApiProperty({ description: 'Error logs', type: 'array' })
  errors: Array<{
    timestamp: string;
    level: string;
    service: string;
    message: string;
    stack: string;
    context: any;
  }>;
}

export class PauseContractsResponseDto {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({ description: 'Paused contracts', type: 'array' })
  pausedContracts: string[];

  @ApiProperty({ description: 'Transaction hashes', type: 'array' })
  txHashes: string[];

  @ApiProperty({ description: 'Paused at timestamp' })
  pausedAt: string;
}
