import { ImageWithFallback } from '../figma/ImageWithFallback';
import { TrendingUp, TrendingDown, DollarSign, Bell, Zap, Award, Users, Target } from 'lucide-react';

interface DashboardPageProps {
  onNavigateToMarket?: (marketId: string) => void;
  onNavigateToCreator?: (creatorId: string) => void;
  onNavigateToDividends?: () => void;
}

export function DashboardPage({ 
  onNavigateToMarket, 
  onNavigateToCreator,
  onNavigateToDividends 
}: DashboardPageProps) {
  // Mock user data
  const userData = {
    username: 'CryptoTrader',
    address: '0x742d...5f3a',
    portfolioValue: 1245.67,
    dailyChange: 45.23,
    dailyChangePercent: 3.77,
  };

  const quickStats = [
    { label: 'Portfolio Value', value: `$${userData.portfolioValue.toFixed(2)}`, icon: DollarSign, change: '+$45.23' },
    { label: 'Open Positions', value: '12', icon: Target, change: '+2' },
    { label: 'Claimable', value: '$8.42', icon: Zap, change: 'Ready' },
    { label: 'Total P&L', value: '+$245.67', icon: TrendingUp, change: '+15.3%' },
  ];

  const notifications = [
    { 
      id: '1', 
      type: 'market_resolved' as const, 
      title: 'Market Resolved', 
      message: 'Bitcoin $100K by 2025 - You won!', 
      amount: '+$54.00',
      time: '5m ago' 
    },
    { 
      id: '2', 
      type: 'dividend' as const, 
      title: 'Dividends Available', 
      message: 'From @elonmusk shares', 
      amount: '+$2.34',
      time: '2h ago' 
    },
    { 
      id: '3', 
      type: 'price_alert' as const, 
      title: 'Price Alert', 
      message: '@garyvee shares hit $15.00', 
      time: '1d ago' 
    },
  ];

  const myActivePositions = [
    {
      id: '1',
      type: 'market' as const,
      title: 'Bitcoin $100K by 2025',
      image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=400&fit=crop',
      outcome: 'YES',
      invested: 100,
      currentValue: 108,
      pnl: 8,
      pnlPercent: 8.0,
    },
    {
      id: '2',
      type: 'shares' as const,
      title: 'Sarah Chen',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      shares: 5,
      invested: 56,
      currentValue: 62.25,
      pnl: 6.25,
      pnlPercent: 11.2,
    },
    {
      id: '3',
      type: 'market' as const,
      title: 'Tesla stock exceeds $300 in Q1',
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=400&fit=crop',
      outcome: 'NO',
      invested: 75,
      currentValue: 67.5,
      pnl: -7.5,
      pnlPercent: -10.0,
    },
  ];

  const recommendedMarkets = [
    {
      id: '1',
      question: 'Will Ethereum reach $5,000 by end of 2025?',
      image: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&h=400&fit=crop',
      yesPrice: 68,
      noPrice: 32,
      volume: '$450K',
      trending: true,
    },
    {
      id: '2',
      question: 'Will Apple announce VR headset in 2025?',
      image: 'https://images.unsplash.com/photo-1592286927505-c8b7b8f5028b?w=400&h=400&fit=crop',
      yesPrice: 55,
      noPrice: 45,
      volume: '$280K',
      trending: false,
    },
  ];

  const followedCreatorUpdates = [
    {
      id: '1',
      creator: 'Sarah Chen',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      action: 'created a new market',
      market: 'AI regulation in 2025',
      time: '3h ago',
    },
    {
      id: '2',
      creator: 'Alex Rivera',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      action: 'market resolved',
      market: 'Super Bowl winner',
      time: '5h ago',
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background border-b border-border py-6 px-5 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-foreground text-2xl mb-1">Welcome back, {userData.username}</h1>
            <p className="text-muted-foreground text-sm">{userData.address}</p>
          </div>
          <button className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm hover:shadow-md transition-all relative">
            <Bell className="w-5 h-5 text-foreground" />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-[10px] text-destructive-foreground">
              3
            </div>
          </button>
        </div>

        {/* Portfolio Value */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-md">
          <div className="text-muted-foreground text-sm mb-1">Total Portfolio Value</div>
          <div className="flex items-end gap-3 mb-2">
            <div className="text-foreground text-3xl">${userData.portfolioValue.toFixed(2)}</div>
            <div className={`flex items-center gap-1 mb-1 ${
              userData.dailyChange >= 0 ? 'text-chart-1' : 'text-destructive'
            }`}>
              {userData.dailyChange >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm">
                {userData.dailyChange >= 0 ? '+' : ''}${Math.abs(userData.dailyChange).toFixed(2)} ({userData.dailyChangePercent >= 0 ? '+' : ''}{userData.dailyChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <div className="text-muted-foreground text-xs">Last 24 hours</div>
        </div>
      </div>

      <div className="px-5 lg:px-8 space-y-6 mt-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground text-xs">{stat.label}</span>
                </div>
                <div className="text-foreground text-lg mb-1">{stat.value}</div>
                <div className="text-chart-1 text-xs">{stat.change}</div>
              </div>
            );
          })}
        </div>

        {/* Claimable Dividends Banner */}
        <button 
          onClick={onNavigateToDividends}
          className="w-full bg-gradient-to-r from-primary/20 to-chart-1/20 border border-primary/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-chart-1/20 border border-chart-1/30 flex items-center justify-center">
                <Zap className="w-5 h-5 text-chart-1" />
              </div>
              <div>
                <div className="text-foreground mb-1">Claim Your Dividends</div>
                <div className="text-muted-foreground text-sm">$8.42 ready to claim</div>
              </div>
            </div>
            <div className="text-primary">→</div>
          </div>
        </button>

        {/* Notifications */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground text-lg">Recent Activity</h2>
            <button className="text-primary text-sm hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${
                        notification.type === 'market_resolved' ? 'bg-chart-1' :
                        notification.type === 'dividend' ? 'bg-primary' : 'bg-foreground'
                      }`}></div>
                      <span className="text-foreground text-sm">{notification.title}</span>
                    </div>
                    <p className="text-muted-foreground text-sm">{notification.message}</p>
                  </div>
                  <div className="text-right">
                    {notification.amount && (
                      <div className="text-chart-1 text-sm mb-1">{notification.amount}</div>
                    )}
                    <div className="text-muted-foreground text-xs">{notification.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Positions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-foreground text-lg">Your Active Positions</h2>
            <button className="text-primary text-sm hover:underline">View all</button>
          </div>
          <div className="space-y-3">
            {myActivePositions.map((position) => (
              <div
                key={position.id}
                className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => position.type === 'market' && onNavigateToMarket?.(position.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shadow-sm">
                    <ImageWithFallback
                      src={position.image}
                      alt={position.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {position.type === 'market' && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${
                          position.outcome === 'YES' 
                            ? 'bg-chart-1/20 text-chart-1' 
                            : 'bg-destructive/20 text-destructive'
                        }`}>
                          {position.outcome}
                        </span>
                      )}
                      <h3 className="text-foreground text-sm truncate">{position.title}</h3>
                    </div>
                    <p className="text-muted-foreground text-xs">
                      {position.type === 'shares' 
                        ? `${position.shares} shares` 
                        : `$${position.invested} invested`}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-foreground text-sm mb-1">${position.currentValue.toFixed(2)}</div>
                    <div className={`text-xs flex items-center gap-1 justify-end ${
                      position.pnl >= 0 ? 'text-chart-1' : 'text-destructive'
                    }`}>
                      {position.pnl >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span>{position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Markets */}
        <div>
          <h2 className="text-foreground text-lg mb-4">Recommended for You</h2>
          <div className="space-y-3">
            {recommendedMarkets.map((market) => (
              <div
                key={market.id}
                onClick={() => onNavigateToMarket?.(market.id)}
                className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shadow-sm">
                    <ImageWithFallback
                      src={market.image}
                      alt={market.question}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-foreground text-sm line-clamp-2">{market.question}</h3>
                      {market.trending && (
                        <div className="flex-shrink-0 px-2 py-0.5 bg-chart-1/20 text-chart-1 text-[10px] rounded-full">
                          🔥 Hot
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-chart-1 text-xs">YES {market.yesPrice}¢</span>
                        <span className="text-muted-foreground text-xs">•</span>
                        <span className="text-destructive text-xs">NO {market.noPrice}¢</span>
                      </div>
                      <span className="text-muted-foreground text-xs">{market.volume}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Followed Creators Activity */}
        <div>
          <h2 className="text-foreground text-lg mb-4">Creator Updates</h2>
          <div className="space-y-3">
            {followedCreatorUpdates.map((update) => (
              <div
                key={update.id}
                onClick={() => onNavigateToCreator?.(update.id)}
                className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl overflow-hidden border border-border shadow-sm">
                    <ImageWithFallback
                      src={update.image}
                      alt={update.creator}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm mb-1">
                      <span className="text-primary">{update.creator}</span> {update.action}
                    </p>
                    <p className="text-muted-foreground text-xs truncate">{update.market}</p>
                  </div>
                  <div className="text-muted-foreground text-xs">{update.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
