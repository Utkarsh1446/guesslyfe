import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
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
import { UsersService } from './users.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OptionalAuthGuard } from '../auth/guards/optional-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Session } from '../auth/interfaces/session.interface';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  UserResponseDto,
  UserPortfolioDto,
  UserMarketPositionDto,
  TransactionHistoryDto,
} from './dto/user-response.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current user profile (authenticated)
   */
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@CurrentUser() session: Session): Promise<UserResponseDto> {
    return this.usersService.getUserById(session.userId);
  }

  /**
   * Update current user profile
   */
  @Patch('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Updated user profile', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async updateCurrentUser(
    @CurrentUser() session: Session,
    @Body() updateDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(session.userId, updateDto);
  }

  /**
   * Get user by ID
   */
  @Get('id/:id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User profile', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') userId: string): Promise<UserResponseDto> {
    return this.usersService.getUserById(userId);
  }

  /**
   * Get user by Twitter handle
   */
  @Get('handle/:handle')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get user by Twitter handle' })
  @ApiParam({ name: 'handle', description: 'Twitter handle (without @)' })
  @ApiResponse({ status: 200, description: 'User profile', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByHandle(@Param('handle') handle: string): Promise<UserResponseDto> {
    return this.usersService.getUserByHandle(handle);
  }

  /**
   * Get user by wallet address
   */
  @Get('wallet/:address')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get user by wallet address' })
  @ApiParam({ name: 'address', description: 'Ethereum wallet address' })
  @ApiResponse({ status: 200, description: 'User profile', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByWallet(@Param('address') walletAddress: string): Promise<UserResponseDto> {
    return this.usersService.getUserByWallet(walletAddress);
  }

  /**
   * Get current user's share portfolio
   */
  @Get('me/portfolio')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user share portfolio' })
  @ApiResponse({
    status: 200,
    description: 'User portfolio',
    type: [UserPortfolioDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUserPortfolio(@CurrentUser() session: Session): Promise<UserPortfolioDto[]> {
    return this.usersService.getUserPortfolio(session.userId);
  }

  /**
   * Get user's share portfolio by ID
   */
  @Get(':id/portfolio')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get user share portfolio by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User portfolio',
    type: [UserPortfolioDto],
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserPortfolio(@Param('id') userId: string): Promise<UserPortfolioDto[]> {
    return this.usersService.getUserPortfolio(userId);
  }

  /**
   * Get current user's market positions
   */
  @Get('me/markets')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user market positions' })
  @ApiResponse({
    status: 200,
    description: 'User market positions',
    type: [UserMarketPositionDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUserMarkets(@CurrentUser() session: Session): Promise<UserMarketPositionDto[]> {
    return this.usersService.getUserMarketPositions(session.userId);
  }

  /**
   * Get user's market positions by ID
   */
  @Get(':id/markets')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get user market positions by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User market positions',
    type: [UserMarketPositionDto],
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserMarkets(@Param('id') userId: string): Promise<UserMarketPositionDto[]> {
    return this.usersService.getUserMarketPositions(userId);
  }

  /**
   * Get current user's transaction history
   */
  @Get('me/transactions')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user transaction history' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of transactions (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({
    status: 200,
    description: 'Transaction history',
    type: [TransactionHistoryDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUserTransactions(
    @CurrentUser() session: Session,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<TransactionHistoryDto[]> {
    return this.usersService.getTransactionHistory(session.userId, limit, offset);
  }

  /**
   * Get user's transaction history by ID
   */
  @Get(':id/transactions')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get user transaction history by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of transactions (default: 50)' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Offset for pagination (default: 0)' })
  @ApiResponse({
    status: 200,
    description: 'Transaction history',
    type: [TransactionHistoryDto],
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserTransactions(
    @Param('id') userId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<TransactionHistoryDto[]> {
    return this.usersService.getTransactionHistory(userId, limit, offset);
  }
}
