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
  ApiParam,
} from '@nestjs/swagger';
import { SharesService } from './shares.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import {
  SharePriceQueryDto,
  SharePriceResponseDto,
  BuySharesDto,
  BuySharesResponseDto,
  SellSharesDto,
  SellSharesResponseDto,
  ShareHoldingsResponseDto,
  ShareTransactionListResponseDto,
  ShareChartResponseDto,
  ShareChartQueryDto,
  ChartTimeframe,
  ChartInterval,
} from './dto';

@ApiTags('Shares')
@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  /**
   * GET /shares/price/:creatorId - Get share price quote
   */
  @Get('price/:creatorId')
  @ApiOperation({
    summary: 'Get buy/sell price for creator shares',
    description: 'Returns price quote for buying or selling a specific amount of shares',
  })
  @ApiParam({
    name: 'creatorId',
    description: 'Creator UUID',
    type: 'string',
  })
  @ApiQuery({
    name: 'action',
    enum: ['buy', 'sell'],
    description: 'Trade action',
    required: true,
  })
  @ApiQuery({
    name: 'amount',
    type: 'number',
    description: 'Number of shares',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Price quote retrieved successfully',
    type: SharePriceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getSharePrice(
    @Param('creatorId') creatorId: string,
    @Query() query: SharePriceQueryDto,
  ): Promise<SharePriceResponseDto> {
    return this.sharesService.getSharePrice(creatorId, query);
  }

  /**
   * POST /shares/buy - Prepare buy shares transaction
   */
  @Post('buy')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate transaction to buy shares',
    description:
      'Returns unsigned transaction data for buying creator shares. User must sign and submit transaction.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unsigned transaction prepared',
    type: BuySharesResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters or price changed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async buyShares(
    @Req() req: any,
    @Body() buyDto: BuySharesDto,
  ): Promise<BuySharesResponseDto> {
    const { userId } = req.session;
    return this.sharesService.prepareBuyTransaction(userId, buyDto);
  }

  /**
   * POST /shares/sell - Prepare sell shares transaction
   */
  @Post('sell')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate transaction to sell shares',
    description:
      'Returns unsigned transaction data for selling creator shares. User must sign and submit transaction.',
  })
  @ApiResponse({
    status: 200,
    description: 'Unsigned transaction prepared',
    type: SellSharesResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid parameters or price changed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async sellShares(
    @Req() req: any,
    @Body() sellDto: SellSharesDto,
  ): Promise<SellSharesResponseDto> {
    const { userId } = req.session;
    return this.sharesService.prepareSellTransaction(userId, sellDto);
  }

  /**
   * GET /shares/portfolio/:address - Get user's share holdings
   */
  @Get('portfolio/:address')
  @ApiOperation({
    summary: 'Get all share holdings for an address',
    description: 'Returns portfolio of all creator shares held by a wallet address',
  })
  @ApiParam({
    name: 'address',
    description: 'Wallet address',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Portfolio retrieved successfully',
    type: ShareHoldingsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Address not found' })
  async getUserPortfolio(
    @Param('address') address: string,
  ): Promise<ShareHoldingsResponseDto> {
    return this.sharesService.getUserPortfolio(address);
  }

  /**
   * GET /shares/transactions/:creatorId - Get transaction history
   */
  @Get('transactions/:creatorId')
  @ApiOperation({
    summary: 'Get transaction history for creator shares',
    description: 'Returns paginated list of buy/sell transactions',
  })
  @ApiParam({
    name: 'creatorId',
    description: 'Creator UUID',
    type: 'string',
  })
  @ApiQuery({
    name: 'type',
    enum: ['buy', 'sell'],
    required: false,
    description: 'Filter by transaction type',
  })
  @ApiQuery({
    name: 'address',
    type: 'string',
    required: false,
    description: 'Filter by user address',
  })
  @ApiQuery({
    name: 'page',
    type: 'number',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: 'number',
    required: false,
    description: 'Items per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved',
    type: ShareTransactionListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getTransactionHistory(
    @Param('creatorId') creatorId: string,
    @Query('type') type?: 'BUY' | 'SELL',
    @Query('address') address?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ShareTransactionListResponseDto> {
    return this.sharesService.getTransactionHistory(
      creatorId,
      page || 1,
      limit || 20,
      type,
      address,
    );
  }

  /**
   * GET /shares/:creatorId/chart - Get price chart data
   */
  @Get(':creatorId/chart')
  @ApiOperation({
    summary: 'Get historical price data for charts',
    description: 'Returns time-series data of share price and volume',
  })
  @ApiParam({
    name: 'creatorId',
    description: 'Creator UUID',
    type: 'string',
  })
  @ApiQuery({
    name: 'timeframe',
    enum: ChartTimeframe,
    required: false,
    description: 'Time range for chart data',
    example: '7d',
  })
  @ApiQuery({
    name: 'interval',
    enum: ChartInterval,
    required: false,
    description: 'Data aggregation interval',
    example: '1h',
  })
  @ApiResponse({
    status: 200,
    description: 'Chart data retrieved',
    type: ShareChartResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getChartData(
    @Param('creatorId') creatorId: string,
    @Query() query: ShareChartQueryDto,
  ): Promise<ShareChartResponseDto> {
    return this.sharesService.getChartData(
      creatorId,
      query.timeframe || ChartTimeframe.DAYS_7,
      query.interval || ChartInterval.HOUR_1,
    );
  }
}
