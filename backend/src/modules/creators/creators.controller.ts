import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CreatorsService } from './creators.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreatorAuthGuard } from '../auth/guards/creator-auth.guard';
import { AdminAuthGuard } from '../auth/guards/admin-auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Session } from '../auth/interfaces/session.interface';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { UpdateCreatorDto } from './dto/update-creator.dto';
import {
  CreatorResponseDto,
  CreatorShareInfoDto,
  ShareholderDto,
  CreatorMarketDto,
} from './dto/creator-response.dto';

@ApiTags('Creators')
@Controller('creators')
export class CreatorsController {
  constructor(private readonly creatorsService: CreatorsService) {}

  /**
   * Apply to become a creator
   */
  @Post('apply')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Apply to become a creator' })
  @ApiResponse({ status: 201, description: 'Creator application submitted', type: CreatorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input or already a creator' })
  async applyToBeCreator(
    @CurrentUser() session: Session,
    @Body() createDto: CreateCreatorDto,
  ): Promise<CreatorResponseDto> {
    return this.creatorsService.applyToBeCreator(session.userId, createDto);
  }

  /**
   * Get all creators (public)
   */
  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get all approved creators (or filter by status for admins)' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: 200,
    description: 'List of creators',
    schema: {
      type: 'object',
      properties: {
        creators: { type: 'array', items: { $ref: '#/components/schemas/CreatorResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getAllCreators(
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.creatorsService.getAllCreators(status, page, limit);
  }

  /**
   * Get current user's creator profile
   */
  @Get('me')
  @UseGuards(CreatorAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated creator profile' })
  @ApiResponse({ status: 200, description: 'Creator profile', type: CreatorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User is not a creator' })
  async getCurrentCreator(@CurrentUser() session: Session): Promise<CreatorResponseDto> {
    return this.creatorsService.getCreatorByUserId(session.userId);
  }

  /**
   * Update current creator profile
   */
  @Patch('me')
  @UseGuards(CreatorAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current creator profile' })
  @ApiResponse({ status: 200, description: 'Updated creator profile', type: CreatorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'User is not a creator' })
  async updateCurrentCreator(
    @CurrentUser() session: Session,
    @Body() updateDto: UpdateCreatorDto,
  ): Promise<CreatorResponseDto> {
    return this.creatorsService.updateCreator(session.userId, updateDto);
  }

  /**
   * Get creator by address
   */
  @Get('address/:address')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get creator by wallet address' })
  @ApiParam({ name: 'address', description: 'Creator wallet address' })
  @ApiResponse({ status: 200, description: 'Creator profile', type: CreatorResponseDto })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getCreatorByAddress(@Param('address') address: string): Promise<CreatorResponseDto> {
    return this.creatorsService.getCreatorByAddress(address);
  }

  /**
   * Approve creator application (admin only)
   */
  @Post('address/:address/approve')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve creator application (admin only)' })
  @ApiParam({ name: 'address', description: 'Creator wallet address' })
  @ApiResponse({ status: 200, description: 'Creator approved', type: CreatorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async approveCreator(
    @CurrentUser() session: Session,
    @Param('address') address: string,
  ): Promise<CreatorResponseDto> {
    return this.creatorsService.approveCreator(address, session.userId);
  }

  /**
   * Reject creator application (admin only)
   */
  @Post('address/:address/reject')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject creator application (admin only)' })
  @ApiParam({ name: 'address', description: 'Creator wallet address' })
  @ApiResponse({ status: 200, description: 'Creator rejected', type: CreatorResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async rejectCreator(
    @CurrentUser() session: Session,
    @Param('address') address: string,
  ): Promise<CreatorResponseDto> {
    return this.creatorsService.rejectCreator(address, session.userId);
  }

  /**
   * Get creator share information
   */
  @Get('address/:address/shares')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get creator share information and pricing' })
  @ApiParam({ name: 'address', description: 'Creator wallet address' })
  @ApiResponse({ status: 200, description: 'Share information', type: CreatorShareInfoDto })
  @ApiResponse({ status: 404, description: 'Creator or shares not found' })
  async getCreatorShares(@Param('address') address: string): Promise<CreatorShareInfoDto> {
    return this.creatorsService.getCreatorShareInfo(address);
  }

  /**
   * Get creator shareholders list
   */
  @Get('address/:address/shareholders')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get list of creator shareholders' })
  @ApiParam({ name: 'address', description: 'Creator wallet address' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of shareholders (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: 200, description: 'List of shareholders', type: [ShareholderDto] })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getShareholderList(
    @Param('address') address: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<ShareholderDto[]> {
    return this.creatorsService.getShareholderList(address, limit, offset);
  }

  /**
   * Get creator markets
   */
  @Get('address/:address/markets')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get markets created by creator' })
  @ApiParam({ name: 'address', description: 'Creator wallet address' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'RESOLVED', 'CANCELLED'] })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of markets (default: 20)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: 200, description: 'List of markets', type: [CreatorMarketDto] })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getCreatorMarkets(
    @Param('address') address: string,
    @Query('status') status?: 'ACTIVE' | 'RESOLVED' | 'CANCELLED',
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number = 0,
  ): Promise<CreatorMarketDto[]> {
    return this.creatorsService.getCreatorMarkets(address, status, limit, offset);
  }
}
