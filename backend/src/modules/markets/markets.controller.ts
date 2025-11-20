import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MarketsService } from './markets.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { CreatorAuthGuard } from '../auth/guards/creator-auth.guard';
import {
  CreateMarketDto,
  MarketFiltersDto,
  TradeMarketDto,
  MarketResponseDto,
  MarketListResponseDto,
  CreateMarketResponseDto,
  UserPositionsResponseDto,
  TradeListResponseDto,
  UnsignedTransactionResponseDto,
} from './dto';

@ApiTags('Markets')
@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  /**
   * POST /markets/create - Create a new market (creator only)
   */
  @Post('create')
  @UseGuards(CreatorAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new prediction market (creators only)' })
  @ApiResponse({
    status: 201,
    description: 'Market created successfully',
    type: CreateMarketResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid market parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Not a creator' })
  async createMarket(
    @Req() req: any,
    @Body() createDto: CreateMarketDto,
  ): Promise<CreateMarketResponseDto> {
    return this.marketsService.createMarket(req.session.userId, createDto);
  }

  /**
   * GET /markets - List all markets with filters
   */
  @Get()
  @ApiOperation({ summary: 'List all markets with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'Markets retrieved successfully',
    type: MarketListResponseDto,
  })
  async listMarkets(
    @Query() filters: MarketFiltersDto,
  ): Promise<MarketListResponseDto> {
    return this.marketsService.getMarkets(filters);
  }

  /**
   * GET /markets/:id - Get market details
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get market details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Market details retrieved',
    type: MarketResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarket(@Param('id') id: string): Promise<MarketResponseDto> {
    return this.marketsService.getMarketById(id);
  }

  /**
   * GET /markets/:id/positions/:address - Get user position in market
   */
  @Get(':id/positions/:address')
  @ApiOperation({ summary: 'Get user position in a market' })
  @ApiResponse({
    status: 200,
    description: 'User position retrieved',
    type: UserPositionsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getUserPosition(
    @Param('id') marketId: string,
    @Param('address') address: string,
  ): Promise<UserPositionsResponseDto> {
    return this.marketsService.getUserPosition(marketId, address);
  }

  /**
   * POST /markets/:id/trade - Prepare trade transaction
   */
  @Post(':id/trade')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Prepare trade transaction (returns unsigned transaction)',
  })
  @ApiResponse({
    status: 200,
    description: 'Unsigned transaction prepared',
    type: UnsignedTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid trade parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async prepareTrade(
    @Req() req: any,
    @Param('id') marketId: string,
    @Body() tradeDto: TradeMarketDto,
  ): Promise<UnsignedTransactionResponseDto> {
    const { userId } = req.session;
    const walletAddress = req.user?.walletAddress;

    if (!walletAddress) {
      throw new Error('Wallet address not found');
    }

    return this.marketsService.prepareTrade(
      marketId,
      userId,
      walletAddress,
      tradeDto,
    );
  }

  /**
   * POST /markets/:id/claim - Prepare claim transaction
   */
  @Post(':id/claim')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Prepare claim transaction for resolved market',
  })
  @ApiResponse({
    status: 200,
    description: 'Unsigned claim transaction prepared',
    type: UnsignedTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Cannot claim from this market' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async prepareClaim(
    @Req() req: any,
    @Param('id') marketId: string,
  ): Promise<UnsignedTransactionResponseDto> {
    const { userId } = req.session;
    const walletAddress = req.user?.walletAddress;

    if (!walletAddress) {
      throw new Error('Wallet address not found');
    }

    return this.marketsService.prepareClaim(marketId, userId, walletAddress);
  }

  /**
   * GET /markets/:id/trades - Get market trade history
   */
  @Get(':id/trades')
  @ApiOperation({ summary: 'Get trade history for a market' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Trade history retrieved',
    type: TradeListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarketTrades(
    @Param('id') marketId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<TradeListResponseDto> {
    return this.marketsService.getMarketTrades(marketId, page, limit);
  }

  /**
   * GET /markets/:id/activity - Get market activity
   */
  @Get(':id/activity')
  @ApiOperation({
    summary: 'Get all activity for a market (trades, comments, etc.)',
  })
  @ApiResponse({
    status: 200,
    description: 'Market activity retrieved',
    type: Object,
  })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarketActivity(@Param('id') marketId: string): Promise<any> {
    // This would combine trades, comments, and other activities
    // For now, just return trades
    const trades = await this.marketsService.getMarketTrades(marketId, 1, 50);

    return {
      activity: trades.trades.map((trade) => ({
        type: 'trade',
        ...trade,
      })),
    };
  }

  /**
   * GET /markets/:id/chart - Get market chart data
   */
  @Get(':id/chart')
  @ApiOperation({
    summary: 'Get probability history for chart',
    description: 'Returns time-series data of outcome probabilities and volume',
  })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['24h', '7d', 'all'],
    example: '7d',
  })
  @ApiQuery({
    name: 'interval',
    required: false,
    enum: ['1h', '4h', '1d'],
    example: '1h',
  })
  @ApiResponse({
    status: 200,
    description: 'Chart data retrieved',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              timestamp: { type: 'string' },
              probabilities: { type: 'array', items: { type: 'number' } },
              volume: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarketChart(
    @Param('id') marketId: string,
    @Query('timeframe') timeframe?: string,
    @Query('interval') interval?: string,
  ): Promise<any> {
    // This would aggregate trade history into chart data points
    // For now, return placeholder structure
    return {
      data: [
        {
          timestamp: new Date().toISOString(),
          probabilities: [50.0, 50.0],
          volume: 0,
        },
      ],
    };
  }

  /**
   * GET /markets/:id/comments - Get market comments/discussion
   */
  @Get(':id/comments')
  @ApiOperation({
    summary: 'Get comments for a market',
    description: 'Returns paginated list of user comments and discussion on the market',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['recent', 'popular', 'oldest'],
    example: 'recent',
  })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved',
    schema: {
      type: 'object',
      properties: {
        comments: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              userId: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  twitterHandle: { type: 'string' },
                  displayName: { type: 'string' },
                  profilePictureUrl: { type: 'string' },
                },
              },
              content: { type: 'string' },
              createdAt: { type: 'string' },
              likes: { type: 'number' },
              replies: { type: 'number' },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarketComments(
    @Param('id') marketId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
  ): Promise<any> {
    // Placeholder implementation
    // In production, this would query a Comment entity with relations to User
    // Would also include nested replies, likes, and moderation features
    const currentPage = page || 1;
    const itemsPerPage = limit || 20;

    return {
      comments: [
        {
          id: 'comment-1',
          userId: 'user-1',
          user: {
            twitterHandle: '@sampleuser',
            displayName: 'Sample User',
            profilePictureUrl: 'https://example.com/avatar.jpg',
          },
          content: 'This is a placeholder comment. Full implementation requires Comment entity.',
          createdAt: new Date().toISOString(),
          likes: 5,
          replies: 2,
        },
      ],
      pagination: {
        page: currentPage,
        limit: itemsPerPage,
        total: 1,
        totalPages: 1,
      },
    };
  }
}
