import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MarketsService } from './markets.service';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  MarketResponseDto,
  MarketPriceQuoteDto,
  MarketPositionDto,
  MarketTradeDto,
  TrendingMarketDto,
} from './dto/market-response.dto';
import { CreateMarketDto, CreateMarketResponseDto } from './dto/create-market.dto';
import {
  TradeMarketDto,
  TradeMarketResponseDto,
  ClaimWinningsDto,
  ClaimWinningsResponseDto,
} from './dto/trade-market.dto';
import { MarketActivityDto, UserPositionResponseDto } from './dto/market-activity.dto';

@ApiTags('Markets')
@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

  /**
   * Create a new prediction market (Creator only)
   */
  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new prediction market',
    description:
      'Creates a new binary prediction market. Only approved creators can create markets. ' +
      'Outcomes must sum to 100% probability. Virtual liquidity (5000 USDC per outcome) is automatically added.',
  })
  @ApiResponse({ status: 201, description: 'Market created successfully', type: CreateMarketResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid parameters or probabilities do not sum to 100%' })
  @ApiResponse({ status: 403, description: 'Creator not approved' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async createMarket(
    @Req() req: any,
    @Body() createDto: CreateMarketDto,
  ): Promise<CreateMarketResponseDto> {
    const creatorAddress = req.user.walletAddress;
    return this.marketsService.createMarket(creatorAddress, createDto);
  }

  /**
   * Get all markets with filtering and pagination
   */
  @Get()
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get all prediction markets' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'RESOLVED', 'CANCELLED'] })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: 200,
    description: 'List of markets',
    schema: {
      type: 'object',
      properties: {
        markets: { type: 'array', items: { $ref: '#/components/schemas/MarketResponseDto' } },
        total: { type: 'number' },
        page: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  async getAllMarkets(
    @Query('status') status?: 'ACTIVE' | 'RESOLVED' | 'CANCELLED',
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.marketsService.getAllMarkets(status, page, limit);
  }

  /**
   * Get trending markets
   */
  @Get('trending')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get trending prediction markets by 24h volume' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of markets (default: 10)' })
  @ApiResponse({ status: 200, description: 'Trending markets', type: [TrendingMarketDto] })
  async getTrendingMarkets(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<TrendingMarketDto[]> {
    return this.marketsService.getTrendingMarkets(limit);
  }

  /**
   * Get market by ID
   */
  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get prediction market by ID' })
  @ApiParam({ name: 'id', description: 'Market ID' })
  @ApiResponse({ status: 200, description: 'Market details', type: MarketResponseDto })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarketById(@Param('id') marketId: string): Promise<MarketResponseDto> {
    return this.marketsService.getMarketById(marketId);
  }

  /**
   * Get price quote for betting on YES
   * NOTE: This is informational only. Users execute bets from their wallet in the frontend.
   */
  @Get(':id/price/yes')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Get price quote for betting on YES outcome',
    description:
      'Returns the expected shares and probabilities for betting on YES. ' +
      'This is READ-ONLY. Actual betting happens on the frontend via user wallet signing.',
  })
  @ApiParam({ name: 'id', description: 'Market ID' })
  @ApiQuery({ name: 'amount', type: Number, description: 'Amount to bet in USDC (default: 10)' })
  @ApiResponse({ status: 200, description: 'Price quote', type: MarketPriceQuoteDto })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getYesPriceQuote(
    @Param('id') marketId: string,
    @Query('amount', new DefaultValuePipe(10), ParseIntPipe) amount: number,
  ): Promise<MarketPriceQuoteDto> {
    return this.marketsService.getBetPriceQuote(marketId, 'YES', amount);
  }

  /**
   * Get price quote for betting on NO
   * NOTE: This is informational only. Users execute bets from their wallet in the frontend.
   */
  @Get(':id/price/no')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Get price quote for betting on NO outcome',
    description:
      'Returns the expected shares and probabilities for betting on NO. ' +
      'This is READ-ONLY. Actual betting happens on the frontend via user wallet signing.',
  })
  @ApiParam({ name: 'id', description: 'Market ID' })
  @ApiQuery({ name: 'amount', type: Number, description: 'Amount to bet in USDC (default: 10)' })
  @ApiResponse({ status: 200, description: 'Price quote', type: MarketPriceQuoteDto })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getNoPriceQuote(
    @Param('id') marketId: string,
    @Query('amount', new DefaultValuePipe(10), ParseIntPipe) amount: number,
  ): Promise<MarketPriceQuoteDto> {
    return this.marketsService.getBetPriceQuote(marketId, 'NO', amount);
  }

  /**
   * Get all positions for a market
   */
  @Get(':id/positions')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get all user positions for a market' })
  @ApiParam({ name: 'id', description: 'Market ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of positions (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: 200, description: 'Market positions', type: [MarketPositionDto] })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarketPositions(
    @Param('id') marketId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<MarketPositionDto[]> {
    return this.marketsService.getMarketPositions(marketId, limit, offset);
  }

  /**
   * Get trading history for a market
   */
  @Get(':id/trades')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get trading history for a market' })
  @ApiParam({ name: 'id', description: 'Market ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of trades (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: 200, description: 'Trading history', type: [MarketTradeDto] })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarketTrades(
    @Param('id') marketId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<MarketTradeDto[]> {
    return this.marketsService.getMarketTrades(marketId, limit, offset);
  }

  /**
   * Get specific user position in a market
   */
  @Get(':id/positions/:address')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get user position in a specific market' })
  @ApiParam({ name: 'id', description: 'Market ID' })
  @ApiParam({ name: 'address', description: 'User wallet address' })
  @ApiResponse({ status: 200, description: 'User position', type: UserPositionResponseDto })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getUserPosition(
    @Param('id') marketId: string,
    @Param('address') userAddress: string,
  ): Promise<UserPositionResponseDto> {
    return this.marketsService.getUserPosition(marketId, userAddress);
  }

  /**
   * Get market activity feed
   */
  @Get(':id/activity')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get all activity for a market (creation, trades, resolution)' })
  @ApiParam({ name: 'id', description: 'Market ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of activities (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: 200, description: 'Market activity feed', type: [MarketActivityDto] })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async getMarketActivity(
    @Param('id') marketId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<MarketActivityDto[]> {
    return this.marketsService.getMarketActivity(marketId, limit, offset);
  }

  /**
   * Prepare unsigned transaction for placing a bet
   * NOTE: This does NOT execute the transaction. Frontend must sign and submit.
   */
  @Post(':id/trade')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Prepare unsigned transaction for placing a bet',
    description:
      'Returns an unsigned transaction that the frontend must sign with the user wallet. ' +
      'Includes slippage protection via minShares parameter. User must have approved USDC to market contract.',
  })
  @ApiParam({ name: 'id', description: 'Market ID' })
  @ApiResponse({ status: 200, description: 'Unsigned transaction for user to sign', type: TradeMarketResponseDto })
  @ApiResponse({ status: 400, description: 'Market not active or slippage protection triggered' })
  @ApiResponse({ status: 404, description: 'Market not found' })
  async trade(
    @Param('id') marketId: string,
    @Body() tradeDto: TradeMarketDto,
    @Req() req: any,
  ): Promise<TradeMarketResponseDto> {
    const userAddress = req.user.walletAddress;
    // Ensure marketId in DTO matches URL param
    tradeDto.marketId = marketId;
    return this.marketsService.prepareTrade(tradeDto, userAddress);
  }

  /**
   * Prepare unsigned transaction for claiming winnings
   * NOTE: This does NOT execute the transaction. Frontend must sign and submit.
   */
  @Post(':id/claim')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Prepare unsigned transaction for claiming winnings',
    description:
      'Returns an unsigned transaction that the frontend must sign with the user wallet. ' +
      'Only available for resolved markets where user has winning shares.',
  })
  @ApiParam({ name: 'id', description: 'Market ID' })
  @ApiResponse({ status: 200, description: 'Unsigned transaction for user to sign', type: ClaimWinningsResponseDto })
  @ApiResponse({ status: 400, description: 'Market not resolved or no winning shares' })
  @ApiResponse({ status: 404, description: 'Market or position not found' })
  async claim(
    @Param('id') marketId: string,
    @Req() req: any,
  ): Promise<ClaimWinningsResponseDto> {
    const userAddress = req.user.walletAddress;
    const claimDto = new ClaimWinningsDto();
    claimDto.marketId = marketId;
    return this.marketsService.prepareClaim(claimDto, userAddress);
  }
}
