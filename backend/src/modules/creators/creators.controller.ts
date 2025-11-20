import { Controller, Get, Post, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CreatorsService } from './creators.service';
import { CreatorResponseDto } from './dto/creator-response.dto';
import { ApplyCreatorDto } from './dto/apply-creator.dto';
import {
  EligibilityCheckResponseDto,
  VolumeProgressResponseDto,
  ShareholdersResponseDto,
  PerformanceResponseDto,
} from './dto';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { CreatorStatus } from '../../database/enums';

@ApiTags('Creators')
@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  /**
   * POST /creators/apply - Apply to become a creator
   */
  @Post('apply')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to become a creator' })
  @ApiResponse({ status: 201, description: 'Creator application submitted', type: CreatorResponseDto })
  @ApiResponse({ status: 400, description: 'User already has a creator profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async applyCreator(@Req() req: any, @Body() applyDto: ApplyCreatorDto): Promise<CreatorResponseDto> {
    return this.creatorsService.applyCreator(req.session.userId, applyDto);
  }

  /**
   * GET /creators - List all creators (filterable by status)
   */
  @Get()
  @ApiOperation({ summary: 'List all creators' })
  @ApiQuery({ name: 'status', required: false, enum: CreatorStatus })
  @ApiResponse({ status: 200, description: 'Creators retrieved', type: [CreatorResponseDto] })
  async listCreators(@Query('status') status?: CreatorStatus): Promise<CreatorResponseDto[]> {
    return this.creatorsService.listCreators(status);
  }

  /**
   * GET /creators/me - Get current user's creator profile
   */
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s creator profile' })
  @ApiResponse({ status: 200, description: 'Creator profile retrieved', type: CreatorResponseDto })
  @ApiResponse({ status: 404, description: 'Creator profile not found' })
  async getMyCreatorProfile(@Req() req: any): Promise<CreatorResponseDto> {
    return this.creatorsService.getCreatorByUserId(req.session.userId);
  }

  /**
   * GET /creators/address/:address - Get creator by share contract address
   */
  @Get('address/:address')
  @ApiOperation({ summary: 'Get creator by share contract address' })
  @ApiResponse({ status: 200, description: 'Creator found', type: CreatorResponseDto })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getCreatorByAddress(@Param('address') address: string): Promise<CreatorResponseDto> {
    return this.creatorsService.getCreatorByAddress(address);
  }

  /**
   * POST /creators/:id/approve - Approve creator (admin only)
   */
  @Post(':id/approve')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve creator (admin only)' })
  @ApiResponse({ status: 200, description: 'Creator approved', type: CreatorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async approveCreator(@Param('id') id: string): Promise<CreatorResponseDto> {
    return this.creatorsService.approveCreator(id);
  }

  /**
   * POST /creators/:id/reject - Reject creator (admin only)
   */
  @Post(':id/reject')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject creator (admin only)' })
  @ApiResponse({ status: 200, description: 'Creator rejected', type: CreatorResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async rejectCreator(@Param('id') id: string): Promise<CreatorResponseDto> {
    return this.creatorsService.rejectCreator(id);
  }

  /**
   * POST /creators/check-eligibility - Check creator eligibility
   */
  @Post('check-eligibility')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check if user meets creator requirements',
    description: 'Returns eligibility status, tier, and requirement breakdown',
  })
  @ApiResponse({
    status: 200,
    description: 'Eligibility check completed',
    type: EligibilityCheckResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async checkEligibility(@Req() req: any): Promise<EligibilityCheckResponseDto> {
    return this.creatorsService.checkEligibility(req.session.userId);
  }

  /**
   * GET /creators/:id/volume-progress - Get volume progress
   */
  @Get(':id/volume-progress')
  @ApiOperation({
    summary: 'Get progress toward $30K volume threshold',
    description: 'Returns volume progress and contributing markets',
  })
  @ApiParam({ name: 'id', description: 'Creator ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Volume progress retrieved',
    type: VolumeProgressResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getVolumeProgress(@Param('id') creatorId: string): Promise<VolumeProgressResponseDto> {
    return this.creatorsService.getVolumeProgress(creatorId);
  }

  /**
   * GET /creators/:id/shareholders - Get shareholders list
   */
  @Get(':id/shareholders')
  @ApiOperation({
    summary: 'Get list of shareholders for creator',
    description: 'Returns paginated list of shareholders with holdings',
  })
  @ApiParam({ name: 'id', description: 'Creator ID', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'sort', required: false, enum: ['shares', 'value'], example: 'shares' })
  @ApiResponse({
    status: 200,
    description: 'Shareholders list retrieved',
    type: ShareholdersResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getShareholders(
    @Param('id') creatorId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: 'shares' | 'value',
  ): Promise<ShareholdersResponseDto> {
    return this.creatorsService.getShareholders(
      creatorId,
      page || 1,
      limit || 20,
      sort || 'shares',
    );
  }

  /**
   * GET /creators/:id/performance - Get performance metrics
   */
  @Get(':id/performance')
  @ApiOperation({
    summary: 'Get creator performance metrics',
    description: 'Returns comprehensive performance data including revenue and share metrics',
  })
  @ApiParam({ name: 'id', description: 'Creator ID', type: 'string' })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['7d', '30d', '90d', 'all'],
    example: 'all',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance metrics retrieved',
    type: PerformanceResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getPerformance(
    @Param('id') creatorId: string,
    @Query('timeframe') timeframe?: '7d' | '30d' | '90d' | 'all',
  ): Promise<PerformanceResponseDto> {
    return this.creatorsService.getPerformance(creatorId, timeframe || 'all');
  }
}
