import {
  Controller,
  Get,
  Post,
  Body,
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
import { DividendsService } from './dividends.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Session } from '../auth/interfaces/session.interface';
import {
  DividendEpochDto,
  ClaimableDividendDto,
  DividendClaimDto,
  CurrentEpochInfoDto,
} from './dto/dividend-response.dto';
import {
  ClaimableDividendsResponseDto,
  InitiateClaimDto,
  InitiateClaimResponseDto,
  CompleteClaimDto,
  CompleteClaimResponseDto,
} from './dto/dividend-claim-workflow.dto';

@ApiTags('Dividends')
@Controller('dividends')
export class DividendsController {
  constructor(private readonly dividendsService: DividendsService) {}

  /**
   * Get dividend epochs for a creator
   */
  @Get('creator/:address')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get dividend epochs for a creator' })
  @ApiParam({ name: 'address', description: 'Creator wallet address' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of epochs (default: 20)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: 200, description: 'List of epochs', type: [DividendEpochDto] })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getCreatorEpochs(
    @Param('address') creatorAddress: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<DividendEpochDto[]> {
    return this.dividendsService.getCreatorEpochs(creatorAddress, limit, offset);
  }

  /**
   * Get current epoch info for a creator
   */
  @Get('creator/:address/current')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get current epoch information for a creator' })
  @ApiParam({ name: 'address', description: 'Creator wallet address' })
  @ApiResponse({ status: 200, description: 'Current epoch info', type: CurrentEpochInfoDto })
  @ApiResponse({ status: 404, description: 'Creator not found' })
  async getCurrentEpochInfo(@Param('address') creatorAddress: string): Promise<CurrentEpochInfoDto> {
    return this.dividendsService.getCurrentEpochInfo(creatorAddress);
  }

  /**
   * Get epoch details by ID
   */
  @Get('epoch/:id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get dividend epoch details by ID' })
  @ApiParam({ name: 'id', description: 'Epoch ID' })
  @ApiResponse({ status: 200, description: 'Epoch details', type: DividendEpochDto })
  @ApiResponse({ status: 404, description: 'Epoch not found' })
  async getEpochById(@Param('id') epochId: string): Promise<DividendEpochDto> {
    return this.dividendsService.getEpochById(epochId);
  }

  /**
   * Get all claims for an epoch
   */
  @Get('epoch/:id/claims')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get all dividend claims for an epoch' })
  @ApiParam({ name: 'id', description: 'Epoch ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of claims (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: 200, description: 'List of claims', type: [DividendClaimDto] })
  @ApiResponse({ status: 404, description: 'Epoch not found' })
  async getEpochClaims(
    @Param('id') epochId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<DividendClaimDto[]> {
    return this.dividendsService.getEpochClaims(epochId, limit, offset);
  }

  /**
   * Get current user's claimable dividends
   */
  @Get('user/claimable')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user claimable dividends' })
  @ApiResponse({ status: 200, description: 'Claimable dividends', type: [ClaimableDividendDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserClaimableDividends(
    @CurrentUser() session: Session,
  ): Promise<ClaimableDividendDto[]> {
    return this.dividendsService.getUserClaimableDividends(session.userId);
  }

  /**
   * Get current user's dividend claim history
   */
  @Get('user/history')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user dividend claim history' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of claims (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({ status: 200, description: 'Claim history', type: [DividendClaimDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserClaimHistory(
    @CurrentUser() session: Session,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<DividendClaimDto[]> {
    return this.dividendsService.getUserClaimHistory(session.userId, limit, offset);
  }

  /**
   * Get claimable dividends for a wallet address
   */
  @Get('claimable/:address')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get claimable dividends for wallet address',
    description:
      'Returns all claimable dividends grouped by creator with requirement checks. ' +
      'Minimum requirements: $5 OR 7 days since first claimable dividend.',
  })
  @ApiParam({ name: 'address', description: 'Wallet address' })
  @ApiResponse({ status: 200, description: 'Claimable dividends', type: ClaimableDividendsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getClaimableDividends(@Param('address') address: string): Promise<ClaimableDividendsResponseDto> {
    return this.dividendsService.getClaimableDividends(address);
  }

  /**
   * Initiate dividend claim process
   */
  @Post('initiate-claim')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initiate dividend claim process',
    description:
      'Generates tweet text for claiming dividends. User must post this tweet to verify ownership. ' +
      'Tweet must include @guesslydotfun and mention at least one creator.',
  })
  @ApiResponse({ status: 200, description: 'Tweet text generated', type: InitiateClaimResponseDto })
  @ApiResponse({ status: 400, description: 'No claimable dividends or invalid creators' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async initiateClaim(
    @CurrentUser() session: Session,
    @Body() dto: InitiateClaimDto,
  ): Promise<InitiateClaimResponseDto> {
    return this.dividendsService.initiateClaim(session.userId, dto.creatorIds);
  }

  /**
   * Complete dividend claim process
   */
  @Post('complete-claim')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Complete dividend claim process',
    description:
      'Verifies tweet and returns unsigned transaction for claiming dividends. ' +
      'Tweet must: 1) Be by the user 2) Contain @guesslydotfun 3) Mention at least one creator.',
  })
  @ApiResponse({ status: 200, description: 'Unsigned transaction for claiming', type: CompleteClaimResponseDto })
  @ApiResponse({ status: 400, description: 'Tweet verification failed or no claimable dividends' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async completeClaim(
    @CurrentUser() session: Session,
    @Body() dto: CompleteClaimDto,
  ): Promise<CompleteClaimResponseDto> {
    return this.dividendsService.completeClaim(session.userId, dto.tweetUrl, dto.creatorIds);
  }
}
