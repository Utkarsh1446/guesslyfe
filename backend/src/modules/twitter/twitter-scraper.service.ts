import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

export interface ScrapedEngagementData {
  followerCount: number;
  followingCount: number;
  tweetCount: number;
  recentTweets: Array<{
    id: string;
    text: string;
    likes: number;
    retweets: number;
    replies: number;
    timestamp: Date;
  }>;
  engagementRate: number;
}

@Injectable()
export class TwitterScraperService {
  private readonly logger = new Logger(TwitterScraperService.name);
  private browser: puppeteer.Browser | null = null;

  /**
   * Initialize Puppeteer browser
   */
  private async getBrowser(): Promise<puppeteer.Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      });
    }
    return this.browser;
  }

  /**
   * Scrape user engagement data from Twitter profile
   */
  async scrapeUserEngagement(username: string): Promise<ScrapedEngagementData> {
    const cleanUsername = username.startsWith('@') ? username.slice(1) : username;
    const url = `https://twitter.com/${cleanUsername}`;

    this.logger.log(`Scraping engagement data for @${cleanUsername}`);

    let page: puppeteer.Page | null = null;

    try {
      const browser = await this.getBrowser();
      page = await browser.newPage();

      // Set user agent to avoid detection
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      // Navigate to profile
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for profile to load
      await page.waitForSelector('[data-testid="UserName"]', { timeout: 10000 });

      // Extract follower count, following count, and tweet count
      const stats = await page.evaluate(() => {
        const getStatValue = (label: string): number => {
          const elements = Array.from(document.querySelectorAll('a[href*="/verified_followers"], a[href*="/following"]'));

          // Try to find by aria-label or visible text
          for (const el of elements) {
            const text = el.textContent || '';
            if (text.toLowerCase().includes(label.toLowerCase())) {
              const match = text.match(/[\d,]+/);
              if (match) {
                return parseInt(match[0].replace(/,/g, ''), 10);
              }
            }
          }

          // Fallback: try data attributes
          const statSpans = Array.from(document.querySelectorAll('span'));
          for (const span of statSpans) {
            const parent = span.parentElement;
            if (parent && parent.textContent?.toLowerCase().includes(label)) {
              const match = span.textContent?.match(/[\d,]+/);
              if (match) {
                return parseInt(match[0].replace(/,/g, ''), 10);
              }
            }
          }

          return 0;
        };

        return {
          followerCount: getStatValue('followers'),
          followingCount: getStatValue('following'),
          // Tweet count is harder to scrape reliably, will use API
          tweetCount: 0,
        };
      });

      // Scroll to load recent tweets
      await page.evaluate(() => {
        window.scrollBy(0, 1000);
      });
      await page.waitForTimeout(2000);

      // Extract recent tweets with engagement
      const recentTweets = await page.evaluate(() => {
        const tweets: Array<{
          id: string;
          text: string;
          likes: number;
          retweets: number;
          replies: number;
          timestamp: Date;
        }> = [];

        const tweetElements = document.querySelectorAll('article[data-testid="tweet"]');

        for (let i = 0; i < Math.min(tweetElements.length, 20); i++) {
          const tweet = tweetElements[i];

          try {
            // Extract tweet text
            const textEl = tweet.querySelector('[data-testid="tweetText"]');
            const text = textEl?.textContent || '';

            // Extract engagement metrics
            const getMetric = (testId: string): number => {
              const el = tweet.querySelector(`[data-testid="${testId}"]`);
              const match = el?.textContent?.match(/[\d,]+/);
              return match ? parseInt(match[0].replace(/,/g, ''), 10) : 0;
            };

            const likes = getMetric('like');
            const retweets = getMetric('retweet');
            const replies = getMetric('reply');

            // Extract tweet ID from link
            const linkEl = tweet.querySelector('a[href*="/status/"]');
            const href = linkEl?.getAttribute('href') || '';
            const idMatch = href.match(/status\/(\d+)/);
            const id = idMatch ? idMatch[1] : '';

            // Extract timestamp
            const timeEl = tweet.querySelector('time');
            const timestamp = timeEl?.getAttribute('datetime') || new Date().toISOString();

            if (id && text) {
              tweets.push({
                id,
                text,
                likes,
                retweets,
                replies,
                timestamp: new Date(timestamp),
              });
            }
          } catch (error) {
            // Skip this tweet if parsing fails
            continue;
          }
        }

        return tweets;
      });

      // Calculate engagement rate
      const totalEngagement = recentTweets.reduce(
        (sum, tweet) => sum + tweet.likes + tweet.retweets + tweet.replies,
        0,
      );

      const avgEngagementPerTweet = recentTweets.length > 0 ? totalEngagement / recentTweets.length : 0;
      const engagementRate =
        stats.followerCount > 0 ? (avgEngagementPerTweet / stats.followerCount) * 100 : 0;

      this.logger.log(
        `Scraped @${cleanUsername}: ${stats.followerCount} followers, ${recentTweets.length} tweets, ${engagementRate.toFixed(2)}% engagement`,
      );

      return {
        followerCount: stats.followerCount,
        followingCount: stats.followingCount,
        tweetCount: stats.tweetCount, // Will be populated by API
        recentTweets,
        engagementRate: Math.round(engagementRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error(`Failed to scrape @${cleanUsername}:`, error.message);
      throw new Error(`Failed to scrape Twitter profile: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Cleanup browser on module destroy
   */
  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
