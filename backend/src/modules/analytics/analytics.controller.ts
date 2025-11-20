import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/leaderboard - Get leaderboards
   */
  @Get('leaderboard')
  @Public()
  @ApiOperation({ summary: 'Get platform leaderboards' })
  @ApiQuery({ name: 'type', required: true, enum: ['traders', 'creators', 'markets'] })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['24h', '7d', '30d', 'all'] })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Leaderboard retrieved' })
  async getLeaderboard(
    @Query('type') type: string,
    @Query('timeframe') timeframe?: string,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getLeaderboard(type, timeframe || 'all', limit || 10);
  }

  /**
   * GET /analytics/trending - Get trending markets
   */
  @Get('trending')
  @Public()
  @ApiOperation({ summary: 'Get trending markets' })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['24h', '7d'] })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Trending markets retrieved' })
  async getTrending(
    @Query('timeframe') timeframe?: string,
    @Query('limit') limit?: number,
  ) {
    return this.analyticsService.getTrending(timeframe || '24h', limit || 10);
  }

  /**
   * GET /analytics/metrics - Get real-time platform metrics
   */
  @Get('metrics')
  @Public()
  @ApiOperation({ summary: 'Get real-time platform metrics' })
  @ApiResponse({ status: 200, description: 'Platform metrics retrieved' })
  async getMetrics() {
    return this.analyticsService.getMetrics();
  }

  /**
   * GET /analytics/categories - Get category statistics
   */
  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Get statistics by category' })
  @ApiResponse({ status: 200, description: 'Category statistics retrieved' })
  async getCategoryStats() {
    return this.analyticsService.getCategoryStats();
  }

  /**
   * GET /analytics/volume - Get volume history
   */
  @Get('volume')
  @Public()
  @ApiOperation({ summary: 'Get historical volume data' })
  @ApiQuery({ name: 'timeframe', required: false, enum: ['7d', '30d', '90d', 'all'] })
  @ApiQuery({ name: 'interval', required: false, enum: ['1h', '1d'] })
  @ApiResponse({ status: 200, description: 'Volume history retrieved' })
  async getVolumeHistory(
    @Query('timeframe') timeframe?: string,
    @Query('interval') interval?: string,
  ) {
    return this.analyticsService.getVolumeHistory(timeframe || '7d', interval || '1d');
  }

  /**
   * GET /analytics/users - Get user statistics
   */
  @Get('users')
  @Public()
  @ApiOperation({ summary: 'Get user statistics' })
  @ApiResponse({ status: 200, description: 'User statistics retrieved' })
  async getUserStats() {
    return this.analyticsService.getUserStats();
  }
}
