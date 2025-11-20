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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import {
  PendingMarketsQueryDto,
  PendingMarketsResponseDto,
  ResolveMarketDto,
  ResolveMarketResponseDto,
  DisputeMarketDto,
  DisputeMarketResponseDto,
  ExtendMarketDto,
  ExtendMarketResponseDto,
  CancelMarketDto,
  CancelMarketResponseDto,
  SuspendCreatorDto,
  OverrideUnlockDto,
  RefundStakeDto,
  BanUserDto,
  ProcessRefundDto,
  PauseContractsDto,
  SystemHealthResponseDto,
  PlatformStatsResponseDto,
  TriggerJobResponseDto,
  ErrorLogsResponseDto,
  PauseContractsResponseDto,
} from './dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(AdminAuthGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /admin/markets/pending - Get markets awaiting resolution
   */
  @Get('markets/pending')
  @ApiOperation({
    summary: 'Get markets awaiting resolution (admin only)',
    description:
      'Returns list of markets that have ended and are awaiting resolution',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending markets retrieved',
    type: PendingMarketsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getPendingMarkets(
    @Query() query: PendingMarketsQueryDto,
  ): Promise<PendingMarketsResponseDto> {
    return this.adminService.getPendingMarkets(query);
  }

  /**
   * POST /admin/markets/:id/resolve - Resolve a market
   */
  @Post('markets/:id/resolve')
  @ApiOperation({
    summary: 'Manually resolve a market (admin only)',
    description: 'Sets the winning outcome and triggers payout distribution',
  })
  @ApiParam({ name: 'id', description: 'Market ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Market resolved successfully',
    type: ResolveMarketResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters or market state' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async resolveMarket(
    @Param('id') marketId: string,
    @Body() resolveDto: ResolveMarketDto,
  ): Promise<ResolveMarketResponseDto> {
    return this.adminService.resolveMarket(marketId, resolveDto);
  }

  /**
   * POST /admin/markets/:id/dispute - Mark market as disputed
   */
  @Post('markets/:id/dispute')
  @ApiOperation({
    summary: 'Mark market as disputed (admin only)',
    description: 'Flags market for manual review due to resolution issues',
  })
  @ApiParam({ name: 'id', description: 'Market ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Market marked as disputed',
    type: DisputeMarketResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid market state' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async disputeMarket(
    @Param('id') marketId: string,
    @Body() disputeDto: DisputeMarketDto,
  ): Promise<DisputeMarketResponseDto> {
    return this.adminService.disputeMarket(marketId, disputeDto);
  }

  /**
   * PUT /admin/markets/:id/extend - Extend market duration
   */
  @Put('markets/:id/extend')
  @ApiOperation({
    summary: 'Extend market end time (admin only)',
    description: 'Adds additional hours to market duration',
  })
  @ApiParam({ name: 'id', description: 'Market ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Market duration extended',
    type: ExtendMarketResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Can only extend active markets' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async extendMarket(
    @Param('id') marketId: string,
    @Body() extendDto: ExtendMarketDto,
  ): Promise<ExtendMarketResponseDto> {
    return this.adminService.extendMarket(marketId, extendDto);
  }

  /**
   * DELETE /admin/markets/:id/cancel - Cancel market and refund users
   */
  @Delete('markets/:id/cancel')
  @ApiOperation({
    summary: 'Cancel market and optionally refund users (admin only)',
    description: 'Cancels market and processes refunds if requested',
  })
  @ApiParam({ name: 'id', description: 'Market ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Market cancelled successfully',
    type: CancelMarketResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Cannot cancel resolved market' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async cancelMarket(
    @Param('id') marketId: string,
    @Body() cancelDto: CancelMarketDto,
  ): Promise<CancelMarketResponseDto> {
    return this.adminService.cancelMarket(marketId, cancelDto);
  }

  /**
   * GET /admin/creators/pending - Get pending creator applications
   */
  @Get('creators/pending')
  @ApiOperation({
    summary: 'Get pending creator applications (admin only)',
    description: 'Returns list of creators awaiting approval',
  })
  @ApiResponse({
    status: 200,
    description: 'Pending creators retrieved',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getPendingCreators(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getPendingCreators(page, limit);
  }

  /**
   * POST /admin/creators/:id/suspend - Suspend a creator
   */
  @Post('creators/:id/suspend')
  @ApiOperation({
    summary: 'Suspend a creator account (admin only)',
    description: 'Suspends creator account for violations or other reasons',
  })
  @ApiParam({ name: 'id', description: 'Creator ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Creator suspended',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async suspendCreator(
    @Param('id') creatorId: string,
    @Body() dto: SuspendCreatorDto,
  ) {
    return this.adminService.suspendCreator(creatorId, dto);
  }

  /**
   * PUT /admin/creators/:id/override-unlock - Manually unlock creator shares
   */
  @Put('creators/:id/override-unlock')
  @ApiOperation({
    summary: 'Manually unlock creator shares (admin only)',
    description:
      'Override automatic unlock requirements (special cases, partnerships)',
  })
  @ApiParam({ name: 'id', description: 'Creator ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Shares unlocked',
  })
  @ApiResponse({
    status: 400,
    description: 'Shares already unlocked',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async overrideShareUnlock(
    @Param('id') creatorId: string,
    @Body() dto: OverrideUnlockDto,
  ) {
    return this.adminService.overrideShareUnlock(creatorId, dto);
  }

  /**
   * POST /admin/creators/:id/refund-stake - Refund creator's $100 stake
   */
  @Post('creators/:id/refund-stake')
  @ApiOperation({
    summary: 'Refund creator stake (admin only)',
    description: 'Refund $100 stake after reaching $10K volume milestone',
  })
  @ApiParam({ name: 'id', description: 'Creator ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Stake refunded',
  })
  @ApiResponse({
    status: 400,
    description: 'No stake to refund or already refunded',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async refundCreatorStake(
    @Param('id') creatorId: string,
    @Body() dto: RefundStakeDto,
  ) {
    return this.adminService.refundCreatorStake(creatorId, dto);
  }

  /**
   * GET /admin/users/search - Admin user search
   */
  @Get('users/search')
  @ApiOperation({
    summary: 'Search users with admin filters (admin only)',
    description:
      'Search users by handle, display name, or wallet address with detailed info',
  })
  @ApiResponse({
    status: 200,
    description: 'Users found',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async searchUsers(
    @Query('query') query: string = '',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.searchUsers(query, page, limit);
  }

  /**
   * POST /admin/users/:id/ban - Ban a user
   */
  @Post('users/:id/ban')
  @ApiOperation({
    summary: 'Ban a user account (admin only)',
    description: 'Bans user account for violations',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'User banned',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async banUser(@Param('id') userId: string, @Body() dto: BanUserDto) {
    return this.adminService.banUser(userId, dto);
  }

  /**
   * POST /admin/users/:id/refund - Process manual user refund
   */
  @Post('users/:id/refund')
  @ApiOperation({
    summary: 'Process manual refund for user (admin only)',
    description: 'Manually refund user for platform errors or special cases',
  })
  @ApiParam({ name: 'id', description: 'User ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Refund processed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async processUserRefund(
    @Param('id') userId: string,
    @Body() dto: ProcessRefundDto,
  ) {
    return this.adminService.processUserRefund(userId, dto);
  }

  /**
   * GET /admin/system/health - Get detailed system health
   */
  @Get('system/health')
  @ApiOperation({
    summary: 'Get system health status (admin only)',
    description: 'Returns detailed health check of all services and systems',
  })
  @ApiResponse({
    status: 200,
    description: 'System health retrieved',
    type: SystemHealthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getSystemHealth(): Promise<SystemHealthResponseDto> {
    return this.adminService.getSystemHealth();
  }

  /**
   * GET /admin/system/stats - Get platform statistics
   */
  @Get('system/stats')
  @ApiOperation({
    summary: 'Get platform statistics (admin only)',
    description:
      'Returns comprehensive platform metrics (users, creators, markets, volume, revenue)',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform stats retrieved',
    type: PlatformStatsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getPlatformStats(): Promise<PlatformStatsResponseDto> {
    return this.adminService.getPlatformStats();
  }

  /**
   * POST /admin/jobs/:name/trigger - Manually trigger a background job
   */
  @Post('jobs/:name/trigger')
  @ApiOperation({
    summary: 'Manually trigger background job (admin only)',
    description: 'Triggers specified background job (epochFinalizer, volumeTracker, etc.)',
  })
  @ApiParam({ name: 'name', description: 'Job name', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Job triggered',
    type: TriggerJobResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid job name',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async triggerJob(@Param('name') jobName: string): Promise<TriggerJobResponseDto> {
    return this.adminService.triggerJob(jobName);
  }

  /**
   * GET /admin/logs/errors - Get error logs
   */
  @Get('logs/errors')
  @ApiOperation({
    summary: 'Get error logs (admin only)',
    description: 'Returns recent error logs from all services',
  })
  @ApiResponse({
    status: 200,
    description: 'Error logs retrieved',
    type: ErrorLogsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getErrorLogs(
    @Query('limit') limit?: number,
    @Query('level') level?: string,
  ): Promise<ErrorLogsResponseDto> {
    return this.adminService.getErrorLogs(limit, level);
  }

  /**
   * POST /admin/contracts/pause - Emergency pause all contracts
   */
  @Post('contracts/pause')
  @ApiOperation({
    summary: 'Emergency pause contracts (admin only)',
    description:
      'Pauses specified smart contracts in case of security issues (EMERGENCY USE ONLY)',
  })
  @ApiResponse({
    status: 200,
    description: 'Contracts paused',
    type: PauseContractsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async pauseContracts(@Body() dto: PauseContractsDto): Promise<PauseContractsResponseDto> {
    return this.adminService.pauseContracts(dto);
  }

  /**
   * GET /admin/analytics/platform - Get platform analytics
   */
  @Get('analytics/platform')
  @ApiOperation({
    summary: 'Get platform analytics (admin only)',
    description: 'Returns platform analytics (market creation, user growth, engagement)',
  })
  @ApiResponse({
    status: 200,
    description: 'Platform analytics retrieved',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getPlatformAnalytics(@Query('timeframe') timeframe?: string) {
    return this.adminService.getPlatformAnalytics(timeframe);
  }

  /**
   * GET /admin/analytics/revenue - Get revenue metrics
   */
  @Get('analytics/revenue')
  @ApiOperation({
    summary: 'Get revenue metrics (admin only)',
    description: 'Returns detailed revenue analytics and breakdown',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue metrics retrieved',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  async getRevenueMetrics(@Query('timeframe') timeframe?: string) {
    return this.adminService.getRevenueMetrics(timeframe);
  }
}
