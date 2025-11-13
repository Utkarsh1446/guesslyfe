import { useState } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { DollarSign, Twitter, CheckCircle2, Clock, Copy, ExternalLink, TrendingUp, Info } from 'lucide-react';

interface DividendsPageProps {
  onBack?: () => void;
}

export function DividendsPage({ onBack }: DividendsPageProps) {
  const [tweetGenerated, setTweetGenerated] = useState(false);
  const [tweetCopied, setTweetCopied] = useState(false);

  // Mock data
  const claimableBalance = 8.42;
  const minimumClaim = 5.00;
  const daysSinceLastClaim = 3;
  const daysRequired = 7;

  const canClaimByAmount = claimableBalance >= minimumClaim;
  const canClaimByDays = daysSinceLastClaim >= daysRequired;
  const canClaim = canClaimByAmount || canClaimByDays;

  const dividendBreakdown = [
    {
      creatorId: '1',
      creator: 'Sarah Chen',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      shares: 5,
      amount: 3.21,
      period: 'Last 7 days',
    },
    {
      creatorId: '2',
      creator: 'Alex Rivera',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      shares: 10,
      amount: 2.87,
      period: 'Last 7 days',
    },
    {
      creatorId: '3',
      creator: 'Maya Patel',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
      shares: 8,
      amount: 2.34,
      period: 'Last 7 days',
    },
  ];

  const claimHistory = [
    {
      id: '1',
      date: 'Nov 10, 2025',
      amount: 12.45,
      tweetUrl: 'https://twitter.com/user/status/123',
      txHash: '0x1234...5678',
    },
    {
      id: '2',
      date: 'Nov 3, 2025',
      amount: 8.92,
      tweetUrl: 'https://twitter.com/user/status/456',
      txHash: '0xabcd...efgh',
    },
    {
      id: '3',
      date: 'Oct 27, 2025',
      amount: 15.67,
      tweetUrl: 'https://twitter.com/user/status/789',
      txHash: '0x9876...4321',
    },
  ];

  const upcomingDividends = [
    { creator: 'Sarah Chen', estimatedAmount: 1.23, timeframe: 'Next 7 days' },
    { creator: 'Alex Rivera', estimatedAmount: 0.98, timeframe: 'Next 7 days' },
    { creator: 'Maya Patel', estimatedAmount: 1.45, timeframe: 'Next 7 days' },
  ];

  const tweetText = `Just claimed $${claimableBalance.toFixed(2)} in dividends from my creator shares on @guessly! 🎉\n\nBacking creators and earning passive income has never been easier.\n\nguessly.fun`;

  const handleGenerateTweet = () => {
    setTweetGenerated(true);
  };

  const handleCopyTweet = () => {
    navigator.clipboard.writeText(tweetText);
    setTweetCopied(true);
    setTimeout(() => setTweetCopied(false), 2000);
  };

  const handleClaimDividends = () => {
    // This would trigger the claim transaction
    console.log('Claiming dividends...');
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="bg-card border-b border-border py-4 px-5 lg:px-8 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
            >
              ←
            </button>
          )}
          <h1 className="text-foreground text-xl">Dividends</h1>
        </div>
        <p className="text-muted-foreground text-sm">Earn from your creator share holdings</p>
      </div>

      <div className="px-5 lg:px-8 space-y-6 mt-6">
        {/* Claimable Balance Card */}
        <div className="bg-gradient-to-br from-chart-1/10 to-primary/10 border border-chart-1/20 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-5 h-5 text-chart-1" />
            <span className="text-chart-1 text-sm">Claimable Balance</span>
          </div>
          
          <div className="text-foreground text-4xl mb-4">${claimableBalance.toFixed(2)}</div>
          
          {/* Requirements Status */}
          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                canClaimByAmount 
                  ? 'border-chart-1 bg-chart-1/20' 
                  : 'border-muted-foreground'
              }`}>
                {canClaimByAmount && <CheckCircle2 className="w-3 h-3 text-chart-1" />}
              </div>
              <span className={canClaimByAmount ? 'text-foreground' : 'text-muted-foreground'}>
                Minimum ${minimumClaim.toFixed(2)} {canClaimByAmount ? '✓' : `(Need $${(minimumClaim - claimableBalance).toFixed(2)} more)`}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">OR</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                canClaimByDays 
                  ? 'border-chart-1 bg-chart-1/20' 
                  : 'border-muted-foreground'
              }`}>
                {canClaimByDays && <CheckCircle2 className="w-3 h-3 text-chart-1" />}
              </div>
              <span className={canClaimByDays ? 'text-foreground' : 'text-muted-foreground'}>
                {daysRequired} days since last claim {canClaimByDays ? '✓' : `(${daysSinceLastClaim}/${daysRequired} days)`}
              </span>
            </div>
          </div>

          {/* Claim Process */}
          {canClaim ? (
            <div className="space-y-3">
              {!tweetGenerated ? (
                <button
                  onClick={handleGenerateTweet}
                  className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Twitter className="w-4 h-4" />
                  Generate Tweet
                </button>
              ) : (
                <>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-foreground text-sm">Step 1: Copy & Tweet</span>
                      <button
                        onClick={handleCopyTweet}
                        className="flex items-center gap-1 text-primary text-sm hover:underline"
                      >
                        {tweetCopied ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="bg-secondary/50 border border-border rounded-lg p-3 text-sm text-foreground whitespace-pre-wrap">
                      {tweetText}
                    </div>
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 w-full px-4 py-2 bg-[#1DA1F2] text-white rounded-lg flex items-center justify-center gap-2 hover:bg-[#1a8cd8] transition-colors"
                    >
                      <Twitter className="w-4 h-4" />
                      Tweet Now
                    </a>
                  </div>
                  
                  <button
                    onClick={handleClaimDividends}
                    className="w-full px-4 py-3 bg-chart-1 text-chart-1-foreground rounded-xl shadow-md hover:shadow-lg transition-all"
                  >
                    Claim ${claimableBalance.toFixed(2)}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="bg-secondary/50 border border-border rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="mb-1">You can't claim yet. You need either:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Minimum ${minimumClaim.toFixed(2)} in dividends, or</li>
                    <li>{daysRequired} days since your last claim</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dividend Breakdown */}
        <div>
          <h2 className="text-foreground text-lg mb-4">Current Period Breakdown</h2>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="space-y-3">
              {dividendBreakdown.map((item) => (
                <div
                  key={item.creatorId}
                  className="flex items-center gap-3 pb-3 border-b border-border last:border-0 last:pb-0"
                >
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-border shadow-sm">
                    <ImageWithFallback
                      src={item.image}
                      alt={item.creator}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground text-sm truncate">{item.creator}</h3>
                    <p className="text-muted-foreground text-xs">{item.shares} shares • {item.period}</p>
                  </div>
                  <div className="text-chart-1 text-sm">${item.amount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="text-primary mb-2">How Dividends Work</p>
              <ul className="space-y-1">
                <li>• When creators' shares are sold, 2.5% fee goes to shareholders</li>
                <li>• Dividends are distributed proportionally to all shareholders</li>
                <li>• You must tweet about your claim to receive dividends</li>
                <li>• Claim when you reach $5 OR after 7 days (whichever comes first)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upcoming Dividends */}
        <div>
          <h2 className="text-foreground text-lg mb-4">Estimated Upcoming</h2>
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="space-y-3">
              {upcomingDividends.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between pb-3 border-b border-border last:border-0 last:pb-0"
                >
                  <div>
                    <h3 className="text-foreground text-sm mb-1">{item.creator}</h3>
                    <p className="text-muted-foreground text-xs">{item.timeframe}</p>
                  </div>
                  <div className="text-muted-foreground text-sm">~${item.estimatedAmount.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Claim History */}
        <div>
          <h2 className="text-foreground text-lg mb-4">Claim History</h2>
          <div className="space-y-3">
            {claimHistory.map((claim) => (
              <div
                key={claim.id}
                className="bg-card border border-border rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-foreground mb-1">${claim.amount.toFixed(2)}</div>
                    <div className="text-muted-foreground text-xs">{claim.date}</div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-chart-1" />
                </div>
                
                <div className="flex gap-2">
                  <a
                    href={claim.tweetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 bg-secondary text-foreground border border-border rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-accent transition-colors"
                  >
                    <Twitter className="w-3 h-3" />
                    View Tweet
                  </a>
                  <a
                    href={`https://basescan.org/tx/${claim.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 bg-secondary text-foreground border border-border rounded-lg text-xs flex items-center justify-center gap-1 hover:bg-accent transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    BaseScan
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
