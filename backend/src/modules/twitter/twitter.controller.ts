import {
  Controller,
  Get,
  Post,
  Param,
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
import { TwitterService } from './twitter.service';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CreatorAuthGuard } from '../auth/guards/creator-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Session } from '../auth/interfaces/session.interface';
import { TwitterUserDto, TwitterMetricsDto, SyncResultDto } from './dto/twitter-response.dto';

@ApiTags('Twitter')
@Controller('twitter')
export class TwitterController {
  constructor(private readonly twitterService: TwitterService) {}

  /**
   * Get Twitter user profile by handle
   */
  @Get('user/:handle')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get Twitter user profile by handle' })
  @ApiParam({ name: 'handle', description: 'Twitter handle (with or without @)' })
  @ApiResponse({ status: 200, description: 'Twitter user profile', type: TwitterUserDto })
  @ApiResponse({ status: 404, description: 'Twitter user not found' })
  @ApiResponse({ status: 400, description: 'Twitter API not configured' })
  async getUserByHandle(@Param('handle') handle: string): Promise<TwitterUserDto> {
    return this.twitterService.getUserByHandle(handle);
  }

  /**
   * Get Twitter metrics for a user
   */
  @Get('user/:handle/metrics')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get Twitter engagement metrics for a user' })
  @ApiParam({ name: 'handle', description: 'Twitter handle (with or without @)' })
  @ApiResponse({ status: 200, description: 'Twitter metrics', type: TwitterMetricsDto })
  @ApiResponse({ status: 404, description: 'Twitter user not found' })
  @ApiResponse({ status: 400, description: 'Twitter API not configured' })
  async getUserMetrics(@Param('handle') handle: string): Promise<TwitterMetricsDto> {
    return this.twitterService.getUserMetrics(handle);
  }

  /**
   * Sync creator's Twitter data (creator or admin only)
   */
  @Post('sync/:creatorAddress')
  @UseGuards(CreatorAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sync creator Twitter data',
    description: 'Updates creator profile with latest Twitter data. Requires creator authentication.',
  })
  @ApiParam({ name: 'creatorAddress', description: 'Creator wallet address' })
  @ApiResponse({ status: 200, description: 'Sync result', type: SyncResultDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a creator' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async syncCreatorData(
    @Param('creatorAddress') creatorAddress: string,
    @CurrentUser() session: Session,
  ): Promise<SyncResultDto> {
    // Note: CreatorAuthGuard ensures user is either the creator or admin
    // Additional check could be added here to verify the creator matches the session
    return this.twitterService.syncCreatorData(creatorAddress);
  }

  /**
   * Search for potential creators on Twitter
   */
  @Get('search/creators')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Search for potential creators on Twitter',
    description: 'Note: Requires elevated Twitter API access. Currently not fully implemented.',
  })
  @ApiQuery({ name: 'q', type: String, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (default: 10)' })
  @ApiResponse({ status: 200, description: 'Search results', type: [TwitterUserDto] })
  @ApiResponse({ status: 400, description: 'Twitter API not configured or insufficient permissions' })
  async searchCreators(
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<TwitterUserDto[]> {
    return this.twitterService.searchCreators(query, limit);
  }
}
