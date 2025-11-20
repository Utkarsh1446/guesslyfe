import { Controller, Get, Patch, Param, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserPortfolioResponseDto } from './dto/user-portfolio-response.dto';
import { UserActivityResponseDto } from './dto/user-activity-response.dto';
import { UserSearchResponseDto } from './dto/user-search-response.dto';
import { AuthGuard } from '../auth/guards/auth.guard';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/me - Get current user profile
   */
  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Req() req: any): Promise<UserResponseDto> {
    return this.usersService.getUserById(req.session.userId);
  }

  /**
   * PATCH /users/me - Update current user profile
   */
  @Patch('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'User profile updated', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCurrentUser(
    @Req() req: any,
    @Body() updateDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(req.session.userId, updateDto);
  }

  /**
   * GET /users/id/:id - Get user by ID
   */
  @Get('id/:id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User found', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.getUserById(id);
  }

  /**
   * GET /users/handle/:handle - Get user by Twitter handle
   */
  @Get('handle/:handle')
  @ApiOperation({ summary: 'Get user by Twitter handle' })
  @ApiResponse({ status: 200, description: 'User found', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByHandle(@Param('handle') handle: string): Promise<UserResponseDto> {
    return this.usersService.getUserByHandle(handle);
  }

  /**
   * GET /users/wallet/:address - Get user by wallet address
   */
  @Get('wallet/:address')
  @ApiOperation({ summary: 'Get user by wallet address' })
  @ApiResponse({ status: 200, description: 'User found', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByWallet(@Param('address') address: string): Promise<UserResponseDto> {
    return this.usersService.getUserByWallet(address);
  }

  /**
   * GET /users/:address/portfolio - Get user portfolio
   */
  @Get(':address/portfolio')
  @ApiOperation({
    summary: "Get user's portfolio (shares + market positions)",
    description: 'Returns aggregated portfolio with shares and market positions',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Portfolio retrieved',
    type: UserPortfolioResponseDto,
  })
  async getUserPortfolio(
    @Param('address') address: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<UserPortfolioResponseDto> {
    return this.usersService.getUserPortfolio(address, page || 1, limit || 20);
  }

  /**
   * GET /users/:address/activity - Get user activity feed
   */
  @Get(':address/activity')
  @ApiOperation({
    summary: 'Get user activity feed',
    description: 'Returns paginated list of user activities (trades, shares, etc.)',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'type', required: false, type: String, description: 'Filter by activity type' })
  @ApiResponse({
    status: 200,
    description: 'Activity feed retrieved',
    type: UserActivityResponseDto,
  })
  async getUserActivity(
    @Param('address') address: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
  ): Promise<UserActivityResponseDto> {
    return this.usersService.getUserActivity(address, page || 1, limit || 20, type as any);
  }

  /**
   * GET /users/search - Search users
   */
  @Get('search')
  @ApiOperation({
    summary: 'Search users by handle or name',
    description: 'Returns paginated search results',
  })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved',
    type: UserSearchResponseDto,
  })
  async searchUsers(
    @Query('q') query: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ): Promise<UserSearchResponseDto> {
    return this.usersService.searchUsers(query, page || 1, limit || 20);
  }
}
