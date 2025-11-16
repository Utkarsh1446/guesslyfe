import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';
import { AuditLogService } from './services/audit-log.service';
import {
  ResolveMarketDto,
  DisputeMarketDto,
  ExtendMarketDto,
  CancelMarketDto,
  ApproveCreatorDto,
  RejectCreatorDto,
  SuspendCreatorDto,
  RefundStakeDto,
  SearchUsersDto,
  BanUserDto,
  ProcessRefundDto,
  TriggerJobDto,
  GetLogsFilterDto,
  EmergencyPauseDto,
  AnalyticsDateRangeDto,
} from './dto/admin.dto';

/**
 * Admin Controller
 *
 * Provides administrative endpoints for platform management.
 * All endpoints require admin wallet signature authentication.
 *
 * Authentication:
 * - Header: x-admin-address (admin wallet address)
 * - Header: x-admin-signature (signed message)
 * - Header: x-admin-timestamp (message timestamp)
 *
 * All actions are logged to audit trail for compliance and security.
 */
@ApiTags('Admin')
@Controller('admin')
@UseGuards(AdminGuard)
@ApiHeader({
  name: 'x-admin-address',
  description: 'Admin wallet address',
  required: true,
  example: '0x1234567890123456789012345678901234567890',
})
@ApiHeader({
  name: 'x-admin-signature',
  description: 'Signed message (EIP-191)',
  required: true,
  example: '0xabcdef...',
})
@ApiHeader({
  name: 'x-admin-timestamp',
  description: 'Message timestamp (Unix milliseconds)',
  required: true,
  example: '1705420800000',
})
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ===========================================================================
  // Market Management
  // ===========================================================================

  @Get('markets/pending')
  @ApiOperation({
    summary: 'Get markets pending resolution',
    description: 'Returns list of markets that have ended but not yet resolved',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending markets retrieved successfully',
  })
  async getPendingMarkets(@Req() req: any) {
    const result = await this.adminService.getPendingMarkets(req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'GET_PENDING_MARKETS',
      method: req.method,
      path: req.path,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { count: result.total },
    });

    return result;
  }

  @Post('markets/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resolve market',
    description: 'Manually resolve a market with specified outcome',
  })
  @ApiParam({ name: 'id', description: 'Market ID' })
  @ApiResponse({
    status: 200,
    description: 'Market resolved successfully',
  })
  async resolveMarket(
    @Param('id') marketId: string,
    @Body() dto: ResolveMarketDto,
    @Req() req: any,
  ) {
    try {
      const result = await this.adminService.resolveMarket(marketId, dto, req.admin.address);

      await this.auditLogService.logAction({
        adminAddress: req.admin.address,
        action: 'RESOLVE_MARKET',
        method: req.method,
        path: req.path,
        body: dto,
        params: { marketId },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
        metadata: { marketId, outcome: dto.outcome },
      });

      return result;
    } catch (error) {
      await this.auditLogService.logAction({
        adminAddress: req.admin.address,
        action: 'RESOLVE_MARKET',
        method: req.method,
        path: req.path,
        body: dto,
        params: { marketId },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: false,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  @Post('markets/:id/dispute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mark market as disputed',
    description: 'Flag a market as disputed for manual review',
  })
  @ApiParam({ name: 'id', description: 'Market ID' })
  @ApiResponse({
    status: 200,
    description: 'Market marked as disputed',
  })
  async disputeMarket(
    @Param('id') marketId: string,
    @Body() dto: DisputeMarketDto,
    @Req() req: any,
  ) {
    const result = await this.adminService.disputeMarket(marketId, dto, req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'DISPUTE_MARKET',
      method: req.method,
      path: req.path,
      body: dto,
      params: { marketId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { marketId, reason: dto.reason },
    });

    return result;
  }

  @Put('markets/:id/extend')
  @ApiOperation({
    summary: 'Extend market duration',
    description: 'Extend the end date of an active market',
  })
  @ApiParam({ name: 'id', description: 'Market ID' })
  @ApiResponse({
    status: 200,
    description: 'Market duration extended',
  })
  async extendMarket(
    @Param('id') marketId: string,
    @Body() dto: ExtendMarketDto,
    @Req() req: any,
  ) {
    const result = await this.adminService.extendMarket(marketId, dto, req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'EXTEND_MARKET',
      method: req.method,
      path: req.path,
      body: dto,
      params: { marketId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { marketId, hours: dto.hours },
    });

    return result;
  }

  @Delete('markets/:id/cancel')
  @ApiOperation({
    summary: 'Cancel market and refund',
    description: 'Cancel a market and optionally refund all participants',
  })
  @ApiParam({ name: 'id', description: 'Market ID' })
  @ApiResponse({
    status: 200,
    description: 'Market cancelled successfully',
  })
  async cancelMarket(
    @Param('id') marketId: string,
    @Body() dto: CancelMarketDto,
    @Req() req: any,
  ) {
    const result = await this.adminService.cancelMarket(marketId, dto, req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'CANCEL_MARKET',
      method: req.method,
      path: req.path,
      body: dto,
      params: { marketId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { marketId, refund: dto.refundParticipants },
    });

    return result;
  }

  // ===========================================================================
  // Creator Management
  // ===========================================================================

  @Get('creators/pending')
  @ApiOperation({
    summary: 'Get pending creator applications',
    description: 'Returns list of users awaiting creator approval',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending creators retrieved successfully',
  })
  async getPendingCreators(@Req() req: any) {
    const result = await this.adminService.getPendingCreators(req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'GET_PENDING_CREATORS',
      method: req.method,
      path: req.path,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { count: result.total },
    });

    return result;
  }

  @Post('creators/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve creator application',
    description: 'Approve a user to become a market creator',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Creator approved successfully',
  })
  async approveCreator(
    @Param('id') userId: string,
    @Body() dto: ApproveCreatorDto,
    @Req() req: any,
  ) {
    const result = await this.adminService.approveCreator(userId, dto, req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'APPROVE_CREATOR',
      method: req.method,
      path: req.path,
      body: dto,
      params: { userId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { userId },
    });

    return result;
  }

  @Post('creators/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject creator application',
    description: 'Reject a creator application with reason',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Creator application rejected',
  })
  async rejectCreator(
    @Param('id') userId: string,
    @Body() dto: RejectCreatorDto,
    @Req() req: any,
  ) {
    const result = await this.adminService.rejectCreator(userId, dto, req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'REJECT_CREATOR',
      method: req.method,
      path: req.path,
      body: dto,
      params: { userId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { userId, reason: dto.reason },
    });

    return result;
  }

  @Put('creators/:id/suspend')
  @ApiOperation({
    summary: 'Suspend creator account',
    description: 'Temporarily or permanently suspend a creator',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Creator suspended successfully',
  })
  async suspendCreator(
    @Param('id') userId: string,
    @Body() dto: SuspendCreatorDto,
    @Req() req: any,
  ) {
    const result = await this.adminService.suspendCreator(userId, dto, req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'SUSPEND_CREATOR',
      method: req.method,
      path: req.path,
      body: dto,
      params: { userId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { userId, durationDays: dto.durationDays },
    });

    return result;
  }

  @Post('creators/:id/refund-stake')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refund creator stake',
    description: 'Process refund for creator stake amount',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Stake refunded successfully',
  })
  async refundStake(
    @Param('id') userId: string,
    @Body() dto: RefundStakeDto,
    @Req() req: any,
  ) {
    const result = await this.adminService.refundCreatorStake(userId, dto, req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'REFUND_STAKE',
      method: req.method,
      path: req.path,
      body: dto,
      params: { userId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { userId, amount: dto.amount },
    });

    return result;
  }

  // ===========================================================================
  // User Management
  // ===========================================================================

  @Get('users/search')
  @ApiOperation({
    summary: 'Search users',
    description: 'Search and filter platform users',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
  })
  async searchUsers(@Query() dto: SearchUsersDto, @Req() req: any) {
    const result = await this.adminService.searchUsers(dto, req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'SEARCH_USERS',
      method: req.method,
      path: req.path,
      query: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { query: dto.query, count: result.total },
    });

    return result;
  }

  @Post('users/:id/ban')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ban user',
    description: 'Ban a user from the platform',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User banned successfully',
  })
  async banUser(
    @Param('id') userId: string,
    @Body() dto: BanUserDto,
    @Req() req: any,
  ) {
    const result = await this.adminService.banUser(userId, dto, req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'BAN_USER',
      method: req.method,
      path: req.path,
      body: dto,
      params: { userId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { userId, reason: dto.reason, durationDays: dto.durationDays },
    });

    return result;
  }

  @Post('users/:id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process user refund',
    description: 'Process a refund for a user',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully',
  })
  async processRefund(
    @Param('id') userId: string,
    @Body() dto: ProcessRefundDto,
    @Req() req: any,
  ) {
    const result = await this.adminService.processRefund(userId, dto, req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'PROCESS_REFUND',
      method: req.method,
      path: req.path,
      body: dto,
      params: { userId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { userId, amount: dto.amount },
    });

    return result;
  }

  // ===========================================================================
  // System Management
  // ===========================================================================

  @Get('system/health')
  @ApiOperation({
    summary: 'Get detailed system health',
    description: 'Returns comprehensive system health metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'System health retrieved successfully',
  })
  async getSystemHealth(@Req() req: any) {
    return this.adminService.getSystemHealth(req.admin.address);
  }

  @Get('system/stats')
  @ApiOperation({
    summary: 'Get platform statistics',
    description: 'Returns platform-wide statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getSystemStats(@Req() req: any) {
    return this.adminService.getSystemStats(req.admin.address);
  }

  @Post('jobs/:name/trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger background job',
    description: 'Trigger a background job outside of its normal schedule',
  })
  @ApiParam({ name: 'name', description: 'Job name' })
  @ApiResponse({
    status: 200,
    description: 'Job triggered successfully',
  })
  async triggerJob(
    @Param('name') jobName: string,
    @Body() dto: TriggerJobDto,
    @Req() req: any,
  ) {
    const result = await this.adminService.triggerJob(jobName, dto, req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'TRIGGER_JOB',
      method: req.method,
      path: req.path,
      body: dto,
      params: { jobName },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { jobName, params: dto.params },
    });

    return result;
  }

  @Get('logs/errors')
  @ApiOperation({
    summary: 'Get recent error logs',
    description: 'Retrieve recent error logs for troubleshooting',
  })
  @ApiResponse({
    status: 200,
    description: 'Error logs retrieved successfully',
  })
  async getErrorLogs(@Query() dto: GetLogsFilterDto, @Req() req: any) {
    return this.adminService.getErrorLogs(dto, req.admin.address);
  }

  @Post('contracts/pause')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Emergency pause contracts',
    description: 'Pause smart contracts in case of emergency',
  })
  @ApiResponse({
    status: 200,
    description: 'Contracts paused successfully',
  })
  async emergencyPause(@Body() dto: EmergencyPauseDto, @Req() req: any) {
    const result = await this.adminService.emergencyPause(dto, req.admin.address);

    await this.auditLogService.logAction({
      adminAddress: req.admin.address,
      action: 'EMERGENCY_PAUSE',
      method: req.method,
      path: req.path,
      body: dto,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
      metadata: { contract: dto.contract, reason: dto.reason },
    });

    return result;
  }

  // ===========================================================================
  // Analytics
  // ===========================================================================

  @Get('analytics/platform')
  @ApiOperation({
    summary: 'Get platform analytics',
    description: 'Returns platform-wide analytics and metrics',
  })
  @ApiResponse({
    status: 200,
    description: 'Analytics retrieved successfully',
  })
  async getPlatformAnalytics(@Query() dto: AnalyticsDateRangeDto, @Req() req: any) {
    return this.adminService.getPlatformAnalytics(dto, req.admin.address);
  }

  @Get('analytics/creators')
  @ApiOperation({
    summary: 'Get creator analytics',
    description: 'Returns analytics about creators and their markets',
  })
  @ApiResponse({
    status: 200,
    description: 'Creator analytics retrieved successfully',
  })
  async getCreatorAnalytics(@Query() dto: AnalyticsDateRangeDto, @Req() req: any) {
    return this.adminService.getCreatorAnalytics(dto, req.admin.address);
  }

  @Get('analytics/revenue')
  @ApiOperation({
    summary: 'Get revenue analytics',
    description: 'Returns revenue metrics and projections',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue analytics retrieved successfully',
  })
  async getRevenueAnalytics(@Query() dto: AnalyticsDateRangeDto, @Req() req: any) {
    return this.adminService.getRevenueAnalytics(dto, req.admin.address);
  }
}
