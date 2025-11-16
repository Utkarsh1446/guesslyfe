import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { randomBytes } from 'crypto';
import * as crypto from 'crypto';
import { User } from '../../database/entities/user.entity';
import { Creator } from '../../database/entities/creator.entity';
import { Session, TwitterProfile, TwitterTokens } from './interfaces/session.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SESSION_PREFIX = 'session:';
  private readonly STATE_PREFIX = 'oauth_state:';
  private readonly SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds
  private readonly STATE_TTL = 600; // 10 minutes in seconds
  private readonly ENCRYPTION_KEY: Buffer;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
    @InjectRedis()
    private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    // Initialize encryption key from environment or generate one
    const keyString = this.configService.get<string>('app.encryptionKey') || '';
    this.ENCRYPTION_KEY = keyString
      ? Buffer.from(keyString, 'hex')
      : crypto.randomBytes(32);
  }

  /**
   * Generate OAuth state and store in Redis for CSRF protection
   */
  async generateOAuthState(): Promise<string> {
    const state = randomBytes(32).toString('hex');
    await this.redis.setex(`${this.STATE_PREFIX}${state}`, this.STATE_TTL, '1');
    this.logger.log(`Generated OAuth state: ${state}`);
    return state;
  }

  /**
   * Verify OAuth state from callback
   */
  async verifyOAuthState(state: string): Promise<boolean> {
    const exists = await this.redis.get(`${this.STATE_PREFIX}${state}`);
    if (exists) {
      await this.redis.del(`${this.STATE_PREFIX}${state}`);
      return true;
    }
    return false;
  }

  /**
   * Exchange Twitter authorization code for access token
   */
  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<TwitterTokens> {
    const tokenUrl = 'https://api.twitter.com/2/oauth2/token';
    const clientId = this.configService.get<string>('twitter.clientId') || '';
    const clientSecret = this.configService.get<string>('twitter.clientSecret') || '';
    const redirectUri = this.configService.get<string>('twitter.callbackUrl') || '';

    const params = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Twitter token exchange failed: ${error}`);
        throw new UnauthorizedException('Failed to exchange code for token');
      }

      const tokens: TwitterTokens = await response.json();
      this.logger.log('Successfully exchanged code for Twitter access token');
      return tokens;
    } catch (error) {
      this.logger.error(`Token exchange error: ${error.message}`);
      throw new UnauthorizedException('Twitter authentication failed');
    }
  }

  /**
   * Fetch user profile from Twitter API
   */
  async fetchTwitterProfile(accessToken: string): Promise<TwitterProfile> {
    const url = 'https://api.twitter.com/2/users/me?user.fields=profile_image_url,public_metrics';

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        this.logger.error(`Twitter profile fetch failed: ${error}`);
        throw new UnauthorizedException('Failed to fetch Twitter profile');
      }

      const data = await response.json();
      this.logger.log(`Fetched Twitter profile for user: ${data.data.username}`);
      return data.data;
    } catch (error) {
      this.logger.error(`Profile fetch error: ${error.message}`);
      throw new UnauthorizedException('Failed to fetch Twitter profile');
    }
  }

  /**
   * Create or update user from Twitter profile
   */
  async createOrUpdateUser(profile: TwitterProfile, tokens: TwitterTokens): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { twitterId: profile.id },
      relations: ['creator'],
    });

    const encryptedAccessToken = this.encryptToken(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? this.encryptToken(tokens.refresh_token)
      : null;

    const adminTwitterId = this.configService.get<string>('app.adminTwitterId');
    const isAdmin = profile.id === adminTwitterId;

    if (user) {
      // Update existing user
      user.twitterHandle = profile.username;
      user.displayName = profile.name;
      user.profilePictureUrl = profile.profile_image_url;
      user.followerCount = profile.public_metrics.followers_count;
      user.followingCount = profile.public_metrics.following_count;
      user.twitterAccessToken = encryptedAccessToken;
      user.twitterRefreshToken = encryptedRefreshToken;
      user.isAdmin = isAdmin;

      await this.userRepository.save(user);
      this.logger.log(`Updated user: ${user.twitterHandle}`);
    } else {
      // Create new user
      user = this.userRepository.create({
        twitterId: profile.id,
        twitterHandle: profile.username,
        displayName: profile.name,
        profilePictureUrl: profile.profile_image_url,
        followerCount: profile.public_metrics.followers_count,
        followingCount: profile.public_metrics.following_count,
        twitterAccessToken: encryptedAccessToken,
        twitterRefreshToken: encryptedRefreshToken,
        isAdmin,
      });

      await this.userRepository.save(user);
      this.logger.log(`Created new user: ${user.twitterHandle}`);
    }

    return user;
  }

  /**
   * Create session for authenticated user
   */
  async createSession(user: User): Promise<string> {
    const sessionId = randomBytes(32).toString('hex');

    // Check if user is a creator
    const creator = await this.creatorRepository.findOne({
      where: { user: { id: user.id } },
    });

    const session: Session = {
      userId: user.id,
      twitterId: user.twitterId,
      twitterHandle: user.twitterHandle,
      displayName: user.displayName,
      profilePictureUrl: user.profilePictureUrl,
      isCreator: !!creator,
      isAdmin: user.isAdmin,
      walletAddress: user.walletAddress,
      lastActivity: Date.now(),
      expiresAt: Date.now() + this.SESSION_TTL * 1000,
    };

    await this.redis.setex(
      `${this.SESSION_PREFIX}${sessionId}`,
      this.SESSION_TTL,
      JSON.stringify(session),
    );

    this.logger.log(`Created session for user: ${user.twitterHandle}`);
    return sessionId;
  }

  /**
   * Get session from Redis
   */
  async getSession(sessionId: string): Promise<Session | null> {
    const sessionData = await this.redis.get(`${this.SESSION_PREFIX}${sessionId}`);

    if (!sessionData) {
      return null;
    }

    const session: Session = JSON.parse(sessionData);

    // Check if session is expired
    if (session.expiresAt < Date.now()) {
      await this.deleteSession(sessionId);
      return null;
    }

    // Extend session on activity
    session.lastActivity = Date.now();
    await this.redis.setex(
      `${this.SESSION_PREFIX}${sessionId}`,
      this.SESSION_TTL,
      JSON.stringify(session),
    );

    return session;
  }

  /**
   * Delete session from Redis
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`);
    this.logger.log(`Deleted session: ${sessionId}`);
  }

  /**
   * Link wallet address to user
   */
  async linkWallet(userId: string, walletAddress: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Check if wallet is already linked to another user
    const existingUser = await this.userRepository.findOne({
      where: { walletAddress },
    });

    if (existingUser && existingUser.id !== userId) {
      throw new BadRequestException('Wallet address is already linked to another account');
    }

    user.walletAddress = walletAddress;
    await this.userRepository.save(user);

    // Update session with new wallet address
    const sessions = await this.redis.keys(`${this.SESSION_PREFIX}*`);
    for (const sessionKey of sessions) {
      const sessionData = await this.redis.get(sessionKey);
      if (sessionData) {
        const session: Session = JSON.parse(sessionData);
        if (session.userId === userId) {
          session.walletAddress = walletAddress;
          await this.redis.setex(
            sessionKey,
            this.SESSION_TTL,
            JSON.stringify(session),
          );
        }
      }
    }

    this.logger.log(`Linked wallet ${walletAddress} to user: ${user.twitterHandle}`);
    return user;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id: userId },
      relations: ['creator'],
    });
  }

  /**
   * Encrypt sensitive token
   */
  private encryptToken(token: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt sensitive token
   */
  private decryptToken(encryptedToken: string): string {
    const [ivHex, encrypted] = encryptedToken.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
