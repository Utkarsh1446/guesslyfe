import { registerAs } from '@nestjs/config';

export interface TwitterConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  bearerToken: string;
}

export default registerAs(
  'twitter',
  (): TwitterConfig => ({
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    callbackUrl:
      process.env.TWITTER_CALLBACK_URL ||
      'http://localhost:3000/api/v1/auth/twitter/callback',
    bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
  }),
);
