export interface Session {
  userId: string;
  twitterId: string;
  twitterHandle: string;
  displayName: string;
  profilePictureUrl: string;
  isCreator: boolean;
  isAdmin: boolean;
  walletAddress: string | null;
  lastActivity: number;
  expiresAt: number;
}

export interface TwitterProfile {
  id: string;
  username: string;
  name: string;
  profile_image_url: string;
  public_metrics: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

export interface TwitterTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}
