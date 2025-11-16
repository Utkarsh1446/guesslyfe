import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoggerService } from '../../../common/logging/logger.service';

/**
 * Admin Audit Log Entity
 *
 * Stores all admin actions for compliance and security auditing
 */
export class AdminAuditLog {
  id: number;
  adminAddress: string;
  action: string;
  method: string;
  path: string;
  body: Record<string, any>;
  params: Record<string, any>;
  query: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Audit Log Service
 *
 * Tracks all admin actions for security auditing and compliance.
 * All admin operations are logged with full context for:
 * - Security audits
 * - Compliance requirements
 * - Dispute resolution
 * - Forensic analysis
 */
@Injectable()
export class AuditLogService {
  private readonly logger = new LoggerService(AuditLogService.name);

  constructor(
    // Note: Uncomment when AdminAuditLog entity is created
    // @InjectRepository(AdminAuditLog)
    // private readonly auditLogRepository: Repository<AdminAuditLog>,
  ) {}

  /**
   * Log admin action
   */
  async logAction(params: {
    adminAddress: string;
    action: string;
    method: string;
    path: string;
    body?: Record<string, any>;
    params?: Record<string, any>;
    query?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const auditLog = {
        adminAddress: params.adminAddress,
        action: params.action,
        method: params.method,
        path: params.path,
        body: this.sanitizeData(params.body),
        params: params.params || {},
        query: params.query || {},
        ipAddress: params.ipAddress || 'unknown',
        userAgent: params.userAgent || 'unknown',
        timestamp: new Date(),
        success: params.success,
        errorMessage: params.errorMessage,
        metadata: params.metadata,
      };

      // TODO: Save to database when entity is created
      // await this.auditLogRepository.save(auditLog);

      // Log to application logger for immediate visibility
      if (params.success) {
        this.logger.logInfo('Admin action logged', {
          adminAddress: params.adminAddress,
          action: params.action,
          path: params.path,
          ...params.metadata,
        });
      } else {
        this.logger.logWarn('Admin action failed', {
          adminAddress: params.adminAddress,
          action: params.action,
          path: params.path,
          error: params.errorMessage,
          ...params.metadata,
        });
      }

      // For now, log to console in structured format
      console.log('[AUDIT]', JSON.stringify(auditLog, null, 2));
    } catch (error) {
      // Never let audit logging fail the request
      this.logger.logError('Failed to log admin action', error, {
        adminAddress: params.adminAddress,
        action: params.action,
      });
    }
  }

  /**
   * Get audit logs for an admin
   */
  async getAdminLogs(adminAddress: string, limit: number = 100): Promise<AdminAuditLog[]> {
    // TODO: Implement when entity is created
    // return this.auditLogRepository.find({
    //   where: { adminAddress: adminAddress.toLowerCase() },
    //   order: { timestamp: 'DESC' },
    //   take: limit,
    // });
    return [];
  }

  /**
   * Get recent audit logs
   */
  async getRecentLogs(limit: number = 100): Promise<AdminAuditLog[]> {
    // TODO: Implement when entity is created
    // return this.auditLogRepository.find({
    //   order: { timestamp: 'DESC' },
    //   take: limit,
    // });
    return [];
  }

  /**
   * Search audit logs
   */
  async searchLogs(filters: {
    adminAddress?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
  }): Promise<AdminAuditLog[]> {
    // TODO: Implement when entity is created
    return [];
  }

  /**
   * Sanitize sensitive data before logging
   */
  private sanitizeData(data?: Record<string, any>): Record<string, any> {
    if (!data) return {};

    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'privateKey', 'secret', 'apiKey', 'token'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
