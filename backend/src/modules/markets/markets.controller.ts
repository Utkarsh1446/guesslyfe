import {
  Controller,
  Get,
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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MarketsService } from './markets.service';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import {
  MarketResponseDto,
  MarketPriceQuoteDto,
  MarketPositionDto,
  MarketTradeDto,
  TrendingMarketDto,
} from './dto/market-response.dto';

@ApiTags('Markets')
@Controller('markets')
export class MarketsController {
  constructor(private readonly marketsService: MarketsService) {}

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
}
