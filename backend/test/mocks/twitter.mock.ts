/**
 * Twitter API Mock
 *
 * Mock Twitter API interactions for testing
 */

import { mockTwitterProfiles } from '../test.config';

export class MockTwitterService {
  private accessTokens: Map<string, any> = new Map();
  private profiles: Map<string, any> = new Map();

  constructor() {
    // Seed with test profiles
    this.profiles.set(mockTwitterProfiles.eligible.id, mockTwitterProfiles.eligible);
    this.profiles.set(mockTwitterProfiles.notEligible.id, mockTwitterProfiles.notEligible);
  }

  /**
   * Mock OAuth token exchange
   */
  async exchangeCodeForToken(code: string, codeVerifier: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
  }> {
    const accessToken = `mock_access_token_${Date.now()}`;
    const refreshToken = `mock_refresh_token_${Date.now()}`;

    this.accessTokens.set(accessToken, {
      code,
      codeVerifier,
      createdAt: new Date(),
      expiresIn: 7200,
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 7200,
      token_type: 'bearer',
    };
  }

  /**
   * Mock fetching user profile
   */
  async getUserProfile(accessToken: string, userId?: string): Promise<any> {
    if (!this.accessTokens.has(accessToken)) {
      throw new Error('Invalid access token');
    }

    // Return eligible profile by default
    const profile = userId
      ? this.profiles.get(userId)
      : mockTwitterProfiles.eligible;

    if (!profile) {
      throw new Error('User not found');
    }

    return {
      data: profile,
    };
  }

  /**
   * Mock fetching user by handle
   */
  async getUserByHandle(handle: string): Promise<any> {
    const profile = Array.from(this.profiles.values()).find(
      (p) => p.username === handle,
    );

    if (!profile) {
      throw new Error('User not found');
    }

    return {
      data: profile,
    };
  }

  /**
   * Mock refreshing access token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const newAccessToken = `mock_access_token_refreshed_${Date.now()}`;
    const newRefreshToken = `mock_refresh_token_refreshed_${Date.now()}`;

    this.accessTokens.set(newAccessToken, {
      refreshedFrom: refreshToken,
      createdAt: new Date(),
      expiresIn: 7200,
    });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expires_in: 7200,
    };
  }

  /**
   * Add custom profile for testing
   */
  addProfile(profile: any): void {
    this.profiles.set(profile.id, profile);
  }

  /**
   * Remove profile
   */
  removeProfile(userId: string): void {
    this.profiles.delete(userId);
  }

  /**
   * Update profile metrics
   */
  updateProfileMetrics(
    userId: string,
    metrics: Partial<{
      followers_count: number;
      following_count: number;
      tweet_count: number;
    }>,
  ): void {
    const profile = this.profiles.get(userId);
    if (profile) {
      profile.public_metrics = {
        ...profile.public_metrics,
        ...metrics,
      };
    }
  }

  /**
   * Check if user meets eligibility criteria
   */
  isEligible(userId: string): boolean {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return false;
    }

    return profile.public_metrics.followers_count >= 1000;
  }

  /**
   * Reset mock state
   */
  reset(): void {
    this.accessTokens.clear();
    this.profiles.clear();

    // Re-seed with test profiles
    this.profiles.set(mockTwitterProfiles.eligible.id, mockTwitterProfiles.eligible);
    this.profiles.set(mockTwitterProfiles.notEligible.id, mockTwitterProfiles.notEligible);
  }

  /**
   * Validate access token
   */
  isValidAccessToken(accessToken: string): boolean {
    const tokenData = this.accessTokens.get(accessToken);
    if (!tokenData) {
      return false;
    }

    const expiresAt = new Date(tokenData.createdAt);
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expiresIn);

    return expiresAt > new Date();
  }

  /**
   * Revoke access token
   */
  revokeAccessToken(accessToken: string): void {
    this.accessTokens.delete(accessToken);
  }
}

export const mockTwitterService = new MockTwitterService();
