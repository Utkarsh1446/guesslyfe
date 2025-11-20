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
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DividendsService } from './dividends.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import {
  ClaimableDividendsResponseDto,
  InitiateClaimDto,
  InitiateClaimResponseDto,
  CompleteClaimDto,
  CompleteClaimResponseDto,
  ClaimHistoryResponseDto,
} from './dto';

@ApiTags('Dividends')
@Controller('dividends')
export class DividendsController {
  constructor(private readonly dividendsService: DividendsService) {}

  /**
   * GET /dividends/claimable/:address - Get claimable dividends
   */
  @Get('claimable/:address')
  @ApiOperation({
    summary: 'Get claimable dividends for a user',
    description:
      'Returns all claimable dividends across creators where user owns shares',
  })
  @ApiParam({
    name: 'address',
    description: 'User wallet address',
    example: '0x1234...',
  })
  @ApiResponse({
    status: 200,
    description: 'Claimable dividends retrieved',
    type: ClaimableDividendsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getClaimableDividends(
    @Param('address') address: string,
  ): Promise<ClaimableDividendsResponseDto> {
    return this.dividendsService.getClaimableDividends(address);
  }

  /**
   * POST /dividends/initiate-claim - Initiate claim process
   */
  @Post('initiate-claim')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initiate dividend claim',
    description:
      'Starts the claim process and returns required tweet text for verification',
  })
  @ApiResponse({
    status: 200,
    description: 'Claim initiated successfully',
    type: InitiateClaimResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'No claimable dividends or user does not own shares',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async initiateClaim(
    @Req() req: any,
    @Body() dto: InitiateClaimDto,
  ): Promise<InitiateClaimResponseDto> {
    const { userId } = req.session;
    const walletAddress = req.user?.walletAddress;

    if (!walletAddress) {
      throw new Error('Wallet address not found');
    }

    return this.dividendsService.initiateClaim(userId, walletAddress, dto);
  }

  /**
   * POST /dividends/complete-claim - Complete claim with tweet verification
   */
  @Post('complete-claim')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Complete dividend claim',
    description:
      'Verifies tweet and processes dividend payout to user wallet',
  })
  @ApiResponse({
    status: 200,
    description: 'Claim completed successfully',
    type: CompleteClaimResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid tweet URL or claim already completed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Claim not found' })
  async completeClaim(
    @Req() req: any,
    @Body() dto: CompleteClaimDto,
  ): Promise<CompleteClaimResponseDto> {
    const { userId } = req.session;
    const walletAddress = req.user?.walletAddress;

    if (!walletAddress) {
      throw new Error('Wallet address not found');
    }

    return this.dividendsService.completeClaim(userId, walletAddress, dto);
  }

  /**
   * GET /dividends/history/:address - Get claim history
   */
  @Get('history/:address')
  @ApiOperation({
    summary: 'Get dividend claim history',
    description: 'Returns paginated history of all dividend claims for a user',
  })
  @ApiParam({
    name: 'address',
    description: 'User wallet address',
    example: '0x1234...',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Claim history retrieved',
    type: ClaimHistoryResponseDto,
  })
  async getClaimHistory(
    @Param('address') address: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<ClaimHistoryResponseDto> {
    return this.dividendsService.getClaimHistory(address, page, limit);
  }
}
