import { useState } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Trophy, TrendingUp, DollarSign, Target, Crown, Medal, Award } from 'lucide-react';

interface LeaderboardsPageProps {
  onBack?: () => void;
  onNavigateToProfile?: (userId: string) => void;
}

type LeaderboardType = 'traders' | 'creators' | 'markets' | 'weekly';

export function LeaderboardsPage({ onBack, onNavigateToProfile }: LeaderboardsPageProps) {
  const [selectedLeaderboard, setSelectedLeaderboard] = useState<LeaderboardType>('traders');
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');

  const leaderboardTypes = [
    { id: 'traders' as const, label: 'Top Traders', icon: TrendingUp },
    { id: 'creators' as const, label: 'Top Creators', icon: Crown },
    { id: 'markets' as const, label: 'Best Markets', icon: Target },
    { id: 'weekly' as const, label: 'Weekly Winners', icon: Trophy },
  ];

  const topTraders = [
    {
      id: '1',
      rank: 1,
      name: 'whale_trader',
      address: '0x742d...5f3a',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      profit: 12450.67,
      winRate: 78.5,
      trades: 234,
      badge: 'legend',
    },
    {
      id: '2',
      rank: 2,
      name: 'crypto_bull',
      address: '0x8a3b...2c1d',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      profit: 9823.45,
      winRate: 72.3,
      trades: 189,
      badge: 'master',
    },
    {
      id: '3',
      rank: 3,
      name: 'diamond_hands',
      address: '0x1f4e...9b7a',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
      profit: 8567.89,
      winRate: 69.8,
      trades: 156,
      badge: 'master',
    },
    {
      id: '4',
      rank: 4,
      name: 'moon_trader',
      address: '0x6c2a...4d8e',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
      profit: 7234.12,
      winRate: 65.4,
      trades: 142,
      badge: 'expert',
    },
    {
      id: '5',
      rank: 5,
      name: 'early_adopter',
      address: '0x9d5c...3e2f',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
      profit: 6890.34,
      winRate: 67.2,
      trades: 128,
      badge: 'expert',
    },
  ];

  const topCreators = [
    {
      id: '1',
      rank: 1,
      name: 'Sarah Chen',
      handle: '@sarahchen',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      sharePrice: 15.45,
      marketCap: 19536.0,
      markets: 24,
      totalVolume: 234500,
    },
    {
      id: '2',
      rank: 2,
      name: 'Alex Rivera',
      handle: '@alexrivera',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      sharePrice: 12.85,
      marketCap: 16256.5,
      markets: 18,
      totalVolume: 189200,
    },
    {
      id: '3',
      rank: 3,
      name: 'Maya Patel',
      handle: '@mayapatel',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
      sharePrice: 11.20,
      marketCap: 14184.0,
      markets: 15,
      totalVolume: 156780,
    },
    {
      id: '4',
      rank: 4,
      name: 'James Kim',
      handle: '@jameskim',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
      sharePrice: 10.75,
      marketCap: 13612.5,
      markets: 21,
      totalVolume: 143200,
    },
    {
      id: '5',
      rank: 5,
      name: 'Emma Zhang',
      handle: '@emmazhang',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop',
      sharePrice: 9.90,
      marketCap: 12474.0,
      markets: 12,
      totalVolume: 128900,
    },
  ];

  const topMarkets = [
    {
      id: '1',
      rank: 1,
      question: 'Will Bitcoin reach $100K by end of 2025?',
      creator: 'Sarah Chen',
      image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=400&fit=crop',
      volume: 45890,
      traders: 892,
      liquidity: 12400,
    },
    {
      id: '2',
      rank: 2,
      question: 'Will Ethereum reach $5,000 in 2025?',
      creator: 'Alex Rivera',
      image: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&h=400&fit=crop',
      volume: 38920,
      traders: 756,
      liquidity: 10200,
    },
    {
      id: '3',
      rank: 3,
      question: 'Will Tesla stock exceed $300 in Q1?',
      creator: 'Maya Patel',
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=400&fit=crop',
      volume: 32145,
      traders: 634,
      liquidity: 8900,
    },
    {
      id: '4',
      rank: 4,
      question: 'Will Lakers win NBA Championship 2025?',
      creator: 'James Kim',
      image: 'https://images.unsplash.com/photo-1636007613585-48b105cfe3be?w=400&h=400&fit=crop',
      volume: 28456,
      traders: 567,
      liquidity: 7600,
    },
    {
      id: '5',
      rank: 5,
      question: 'Will Apple announce VR headset in 2025?',
      creator: 'Emma Zhang',
      image: 'https://images.unsplash.com/photo-1592286927505-c8b7b8f5028b?w=400&h=400&fit=crop',
      volume: 24890,
      traders: 498,
      liquidity: 6800,
    },
  ];

  const weeklyWinners = [
    {
      id: '1',
      rank: 1,
      name: 'quick_gains',
      address: '0xa1b2...c3d4',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      weeklyProfit: 1245.67,
      winRate: 85.7,
      trades: 28,
    },
    {
      id: '2',
      rank: 2,
      name: 'market_wizard',
      address: '0xe5f6...g7h8',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      weeklyProfit: 1089.34,
      winRate: 80.5,
      trades: 31,
    },
    {
      id: '3',
      rank: 3,
      name: 'lucky_trader',
      address: '0xi9j0...k1l2',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
      weeklyProfit: 945.23,
      winRate: 76.3,
      trades: 24,
    },
  ];

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-[#FFD700]" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-[#C0C0C0]" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-[#CD7F32]" />;
    return null;
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'legend':
        return 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30';
      case 'master':
        return 'bg-primary/20 text-primary border-primary/30';
      case 'expert':
        return 'bg-chart-1/20 text-chart-1 border-chart-1/30';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background border-b border-border py-6 px-5 lg:px-8">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
            >
              ←
            </button>
          )}
          <div>
            <h1 className="text-foreground text-2xl mb-1">Leaderboards</h1>
            <p className="text-muted-foreground text-sm">Top performers on Guessly</p>
          </div>
        </div>

        {/* Trophy Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
            <Trophy className="w-4 h-4 text-primary mb-1" />
            <div className="text-foreground text-lg">1,247</div>
            <div className="text-muted-foreground text-xs">Active Traders</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
            <Crown className="w-4 h-4 text-primary mb-1" />
            <div className="text-foreground text-lg">89</div>
            <div className="text-muted-foreground text-xs">Verified Creators</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 shadow-sm">
            <DollarSign className="w-4 h-4 text-primary mb-1" />
            <div className="text-foreground text-lg">$2.4M</div>
            <div className="text-muted-foreground text-xs">Total Volume</div>
          </div>
        </div>
      </div>

      <div className="px-5 lg:px-8 space-y-6 mt-6">
        {/* Leaderboard Type Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {leaderboardTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedLeaderboard(type.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all whitespace-nowrap ${
                  selectedLeaderboard === type.id
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-card text-foreground border-border hover:border-primary/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{type.label}</span>
              </button>
            );
          })}
        </div>

        {/* Period Filter */}
        {(selectedLeaderboard === 'traders' || selectedLeaderboard === 'creators') && (
          <div className="flex gap-2">
            {(['week', 'month', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-xl text-sm transition-all ${
                  selectedPeriod === period
                    ? 'bg-secondary text-foreground border border-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'All Time'}
              </button>
            ))}
          </div>
        )}

        {/* Top Traders Leaderboard */}
        {selectedLeaderboard === 'traders' && (
          <div className="space-y-2">
            {topTraders.map((trader) => (
              <div
                key={trader.id}
                onClick={() => onNavigateToProfile?.(trader.id)}
                className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 border-2 border-primary">
                    {getRankIcon(trader.rank) || (
                      <span className="text-primary text-sm">#{trader.rank}</span>
                    )}
                  </div>

                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shadow-sm">
                    <ImageWithFallback
                      src={trader.image}
                      alt={trader.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-foreground truncate">{trader.name}</h3>
                      {trader.badge && (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] border ${getBadgeColor(
                            trader.badge
                          )}`}
                        >
                          {trader.badge.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs mb-1">{trader.address}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{trader.winRate}% win rate</span>
                      <span>•</span>
                      <span>{trader.trades} trades</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-chart-1 mb-1">+${trader.profit.toLocaleString()}</div>
                    <div className="text-muted-foreground text-xs">Total Profit</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Creators Leaderboard */}
        {selectedLeaderboard === 'creators' && (
          <div className="space-y-2">
            {topCreators.map((creator) => (
              <div
                key={creator.id}
                onClick={() => onNavigateToProfile?.(creator.id)}
                className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 border-2 border-primary">
                    {getRankIcon(creator.rank) || (
                      <span className="text-primary text-sm">#{creator.rank}</span>
                    )}
                  </div>

                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shadow-sm">
                    <ImageWithFallback
                      src={creator.image}
                      alt={creator.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground truncate mb-1">{creator.name}</h3>
                    <p className="text-primary text-xs mb-1">{creator.handle}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{creator.markets} markets</span>
                      <span>•</span>
                      <span>${(creator.totalVolume / 1000).toFixed(0)}K volume</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-foreground mb-1">${creator.sharePrice}</div>
                    <div className="text-muted-foreground text-xs">Share Price</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Best Markets Leaderboard */}
        {selectedLeaderboard === 'markets' && (
          <div className="space-y-2">
            {topMarkets.map((market) => (
              <div
                key={market.id}
                className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 border-2 border-primary flex-shrink-0 mt-1">
                    {getRankIcon(market.rank) || (
                      <span className="text-primary text-sm">#{market.rank}</span>
                    )}
                  </div>

                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shadow-sm flex-shrink-0">
                    <ImageWithFallback
                      src={market.image}
                      alt={market.question}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-foreground text-sm mb-1 line-clamp-2">{market.question}</h3>
                    <p className="text-muted-foreground text-xs mb-2">by {market.creator}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>${(market.volume / 1000).toFixed(0)}K volume</span>
                      <span>•</span>
                      <span>{market.traders} traders</span>
                      <span>•</span>
                      <span>${(market.liquidity / 1000).toFixed(0)}K liquidity</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Weekly Winners */}
        {selectedLeaderboard === 'weekly' && (
          <div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2">
                <Trophy className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-xs text-muted-foreground">
                  <p className="text-primary mb-1">Weekly Competition</p>
                  <p>Top traders from the past 7 days. Resets every Monday at 00:00 UTC.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {weeklyWinners.map((winner) => (
                <div
                  key={winner.id}
                  onClick={() => onNavigateToProfile?.(winner.id)}
                  className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary/10 border-2 border-primary">
                      {getRankIcon(winner.rank) || (
                        <span className="text-primary">#{winner.rank}</span>
                      )}
                    </div>

                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shadow-sm">
                      <ImageWithFallback
                        src={winner.image}
                        alt={winner.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-foreground truncate mb-1">{winner.name}</h3>
                      <p className="text-muted-foreground text-xs mb-1">{winner.address}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{winner.winRate}% win rate</span>
                        <span>•</span>
                        <span>{winner.trades} trades</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-chart-1 mb-1">
                        +${winner.weeklyProfit.toLocaleString()}
                      </div>
                      <div className="text-muted-foreground text-xs">This Week</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
