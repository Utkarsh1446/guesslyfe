import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './guards/admin.guard';
import { AuditLogService } from './services/audit-log.service';

/**
 * Admin Module
 *
 * Provides administrative functionality for platform management.
 *
 * Features:
 * - Market management (resolution, disputes, cancellation)
 * - Creator management (approval, suspension)
 * - User management (bans, refunds)
 * - System operations (health, jobs, pausing)
 * - Analytics and reporting
 * - Audit logging for all actions
 *
 * Security:
 * - All endpoints protected by AdminGuard
 * - Requires wallet signature authentication
 * - IP and user agent tracking
 * - Complete audit trail
 *
 * Configuration:
 * - ADMIN_ADDRESSES: Comma-separated list of admin wallet addresses
 */
@Module({
  imports: [
    ConfigModule,
    // TODO: Add TypeORM imports when entities are created
    // TypeOrmModule.forFeature([AdminAuditLog, OpinionMarket, User]),
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminGuard,
    AuditLogService,
  ],
  exports: [
    AdminService,
    AuditLogService,
  ],
})
export class AdminModule {}
