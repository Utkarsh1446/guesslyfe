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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { SharesService } from './shares.service';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import {
  SharePriceQuoteDto,
  ShareHistoryDto,
  TrendingShareDto,
} from './dto/share-response.dto';
import { BuySharesDto } from './dto/buy-shares.dto';
import { SellSharesDto } from './dto/sell-shares.dto';
import {
  BuySharesResponseDto,
  SellSharesResponseDto,
} from './dto/unsigned-transaction.dto';
import { ShareChartDataDto } from './dto/chart-data.dto';

@ApiTags('Shares')
@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  /**
   * Get buy price quote for creator shares
   * NOTE: This is informational only. Users execute trades from their wallet in the frontend.
   */
  @Get(':creatorAddress/price/buy')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Get buy price quote for creator shares',
    description:
      'Returns the current buy price for the specified amount of shares. ' +
      'This is READ-ONLY. Actual trading happens on the frontend via user wallet signing.',
  })
  @ApiParam({ name: 'creatorAddress', description: 'Creator wallet address' })
  @ApiQuery({ name: 'amount', type: Number, description: 'Number of shares to buy (default: 1)' })
  @ApiResponse({ status: 200, description: 'Buy price quote', type: SharePriceQuoteDto })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  @ApiResponse({ status: 400, description: 'Shares not unlocked or invalid amount' })
  async getBuyPriceQuote(
    @Param('creatorAddress') creatorAddress: string,
    @Query('amount', new DefaultValuePipe(1), ParseIntPipe) amount: number,
  ): Promise<SharePriceQuoteDto> {
    return this.sharesService.getBuyPriceQuote(creatorAddress, amount);
  }

  /**
   * Get sell price quote for creator shares
   * NOTE: This is informational only. Users execute trades from their wallet in the frontend.
   */
  @Get(':creatorAddress/price/sell')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Get sell price quote for creator shares',
    description:
      'Returns the current sell price for the specified amount of shares. ' +
      'This is READ-ONLY. Actual trading happens on the frontend via user wallet signing.',
  })
  @ApiParam({ name: 'creatorAddress', description: 'Creator wallet address' })
  @ApiQuery({ name: 'amount', type: Number, description: 'Number of shares to sell (default: 1)' })
  @ApiResponse({ status: 200, description: 'Sell price quote', type: SharePriceQuoteDto })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  @ApiResponse({ status: 400, description: 'Shares not unlocked or invalid amount' })
  async getSellPriceQuote(
    @Param('creatorAddress') creatorAddress: string,
    @Query('amount', new DefaultValuePipe(1), ParseIntPipe) amount: number,
  ): Promise<SharePriceQuoteDto> {
    return this.sharesService.getSellPriceQuote(creatorAddress, amount);
  }

  /**
   * Get trading history for creator shares
   */
  @Get(':creatorAddress/history')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get trading history for creator shares' })
  @ApiParam({ name: 'creatorAddress', description: 'Creator wallet address' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of trades (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: 200, description: 'Trading history', type: [ShareHistoryDto] })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getShareHistory(
    @Param('creatorAddress') creatorAddress: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<ShareHistoryDto[]> {
    return this.sharesService.getShareHistory(creatorAddress, limit, offset);
  }

  /**
   * Get trending shares by 24h volume
   */
  @Get('trending')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get trending creator shares by 24h volume' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of trending shares (default: 10)' })
  @ApiResponse({ status: 200, description: 'Trending shares', type: [TrendingShareDto] })
  async getTrendingShares(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<TrendingShareDto[]> {
    return this.sharesService.getTrendingShares(limit);
  }

  /**
   * Prepare unsigned transaction for buying shares
   * NOTE: This does NOT execute the transaction. Frontend must sign and submit.
   */
  @Post('buy')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Prepare unsigned transaction for buying creator shares',
    description:
      'Returns an unsigned transaction that the frontend must sign with the user wallet. ' +
      'Includes slippage protection via maxPrice parameter. User must have approved USDC to share contract.',
  })
  @ApiResponse({ status: 200, description: 'Unsigned transaction for user to sign', type: BuySharesResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid parameters, shares not unlocked, or price exceeded maxPrice' })
  @ApiResponse({ status: 404, description: 'Creator or share contract not found' })
  async buyShares(@Body() buyDto: BuySharesDto): Promise<BuySharesResponseDto> {
    return this.sharesService.prepareBuyTransaction(buyDto);
  }

  /**
   * Prepare unsigned transaction for selling shares
   * NOTE: This does NOT execute the transaction. Frontend must sign and submit.
   */
  @Post('sell')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({
    summary: 'Prepare unsigned transaction for selling creator shares',
    description:
      'Returns an unsigned transaction that the frontend must sign with the user wallet. ' +
      'Includes slippage protection via minPrice parameter. User must own the shares.',
  })
  @ApiResponse({ status: 200, description: 'Unsigned transaction for user to sign', type: SellSharesResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid parameters, shares not unlocked, or price below minPrice' })
  @ApiResponse({ status: 404, description: 'Creator or share contract not found' })
  async sellShares(@Body() sellDto: SellSharesDto): Promise<SellSharesResponseDto> {
    return this.sharesService.prepareSellTransaction(sellDto);
  }

  /**
   * Get price chart data for creator shares
   */
  @Get(':creatorAddress/chart')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get price chart data for creator shares' })
  @ApiParam({ name: 'creatorAddress', description: 'Creator wallet address' })
  @ApiQuery({
    name: 'timeframe',
    required: false,
    enum: ['24h', '7d', '30d', 'all'],
    description: 'Timeframe for chart data (default: 24h)',
  })
  @ApiResponse({ status: 200, description: 'Price chart data', type: ShareChartDataDto })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  @ApiResponse({ status: 400, description: 'Shares not unlocked' })
  async getChartData(
    @Param('creatorAddress') creatorAddress: string,
    @Query('timeframe') timeframe: '24h' | '7d' | '30d' | 'all' = '24h',
  ): Promise<ShareChartDataDto> {
    return this.sharesService.getChartData(creatorAddress, timeframe);
  }
}
