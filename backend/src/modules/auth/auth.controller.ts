import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  Req,
  UseGuards,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AuthGuard } from './guards/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { LinkWalletDto } from './dto/link-wallet.dto';
import { Session } from './interfaces/session.interface';

@ApiTags('Authentication')
@Controller('auth')
@Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
export class AuthController {
  private readonly frontendUrl: string;
  private readonly callbackUrl: string;
  private readonly twitterClientId: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
    this.callbackUrl = this.configService.get<string>('twitter.callbackUrl') || '';
    this.twitterClientId = this.configService.get<string>('twitter.clientId') || '';
  }

  /**
   * Initiate Twitter OAuth 2.0 login with PKCE
   * GET /auth/twitter/login
   */
  @ApiOperation({
    summary: 'Initiate Twitter OAuth login',
    description: 'Redirects user to Twitter OAuth 2.0 authorization page with PKCE for secure authentication',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to Twitter OAuth page',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @Get('twitter/login')
  async twitterLogin(@Res() res: Response) {
    // Generate PKCE code verifier and challenge
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Generate state for CSRF protection
    const state = await this.authService.generateOAuthState();

    // Store code verifier in cookie for callback
    res.cookie('code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
    });

    // Build Twitter OAuth URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.twitterClientId,
      redirect_uri: this.callbackUrl,
      scope: 'tweet.read users.read offline.access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const authUrl = `https://twitter.com/i/oauth2/authorize?${params.toString()}`;

    return res.redirect(authUrl);
  }

  /**
   * Handle Twitter OAuth callback
   * GET /auth/twitter/callback?code=...&state=...
   */
  @ApiOperation({
    summary: 'Twitter OAuth callback',
    description: 'Handles OAuth callback from Twitter, exchanges code for tokens, creates user session, and redirects to frontend',
  })
  @ApiQuery({
    name: 'code',
    description: 'Authorization code from Twitter',
    required: true,
    type: String,
  })
  @ApiQuery({
    name: 'state',
    description: 'State parameter for CSRF protection',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 302,
    description: 'Redirects to frontend with success or error message',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid state parameter or missing code verifier',
  })
  @Get('twitter/callback')
  async twitterCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Verify state parameter (CSRF protection)
      const isValidState = await this.authService.verifyOAuthState(state);
      if (!isValidState) {
        throw new BadRequestException('Invalid state parameter. Possible CSRF attack.');
      }

      // Get code verifier from cookie
      const codeVerifier = req.cookies?.['code_verifier'];
      if (!codeVerifier) {
        throw new BadRequestException('Missing code verifier');
      }

      // Clear code verifier cookie
      res.clearCookie('code_verifier');

      // Exchange code for tokens
      const tokens = await this.authService.exchangeCodeForToken(code, codeVerifier);

      // Fetch Twitter profile
      const profile = await this.authService.fetchTwitterProfile(tokens.access_token);

      // Create or update user
      const user = await this.authService.createOrUpdateUser(profile, tokens);

      // Create session
      const sessionId = await this.authService.createSession(user);

      // Set session cookie
      res.cookie('session_id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      });

      // Redirect to frontend with success
      return res.redirect(`${this.frontendUrl}/auth/success`);
    } catch (error) {
      // Redirect to frontend with error
      return res.redirect(`${this.frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
    }
  }

  /**
   * Logout user
   * POST /auth/logout
   */
  @ApiOperation({
    summary: 'Logout user',
    description: 'Destroys user session and clears session cookie',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing session',
  })
  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.cookies?.['session_id'];

    if (sessionId) {
      await this.authService.deleteSession(sessionId);
    }

    // Clear session cookie
    res.clearCookie('session_id');

    return res.status(HttpStatus.OK).json({ success: true });
  }

  /**
   * Get current authenticated user
   * GET /auth/me
   */
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns authenticated user profile information',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            twitterId: { type: 'string', example: '1234567890' },
            twitterHandle: { type: 'string', example: 'elonmusk' },
            displayName: { type: 'string', example: 'Elon Musk' },
            profilePictureUrl: { type: 'string', example: 'https://pbs.twimg.com/profile_images/...' },
            followerCount: { type: 'number', example: 50000 },
            followingCount: { type: 'number', example: 100 },
            walletAddress: { type: 'string', example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', nullable: true },
            isCreator: { type: 'boolean', example: false },
            isAdmin: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing session',
  })
  @ApiResponse({
    status: 400,
    description: 'User not found',
  })
  @Get('me')
  @UseGuards(AuthGuard)
  async getCurrentUser(@CurrentUser() session: Session) {
    const user = await this.authService.getUserById(session.userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return {
      user: {
        id: user.id,
        twitterId: user.twitterId,
        twitterHandle: user.twitterHandle,
        displayName: user.displayName,
        profilePictureUrl: user.profilePictureUrl,
        followerCount: user.followerCount,
        followingCount: user.followingCount,
        walletAddress: user.walletAddress,
        isCreator: session.isCreator,
        isAdmin: session.isAdmin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  /**
   * Link wallet address to authenticated user
   * POST /auth/link-wallet
   */
  @ApiOperation({
    summary: 'Link wallet address',
    description: 'Links an Ethereum wallet address to the authenticated user account',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: LinkWalletDto })
  @ApiResponse({
    status: 200,
    description: 'Wallet linked successfully',
    schema: {
      type: 'object',
      properties: {
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            twitterId: { type: 'string', example: '1234567890' },
            twitterHandle: { type: 'string', example: 'elonmusk' },
            displayName: { type: 'string', example: 'Elon Musk' },
            profilePictureUrl: { type: 'string', example: 'https://pbs.twimg.com/profile_images/...' },
            walletAddress: { type: 'string', example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' },
            isCreator: { type: 'boolean', example: false },
            isAdmin: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing session',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid wallet address or wallet already linked to another account',
  })
  @Post('link-wallet')
  @UseGuards(AuthGuard)
  async linkWallet(
    @CurrentUser() session: Session,
    @Body() linkWalletDto: LinkWalletDto,
  ) {
    const user = await this.authService.linkWallet(
      session.userId,
      linkWalletDto.walletAddress,
    );

    return {
      user: {
        id: user.id,
        twitterId: user.twitterId,
        twitterHandle: user.twitterHandle,
        displayName: user.displayName,
        profilePictureUrl: user.profilePictureUrl,
        walletAddress: user.walletAddress,
        isCreator: session.isCreator,
        isAdmin: session.isAdmin,
      },
    };
  }
}
