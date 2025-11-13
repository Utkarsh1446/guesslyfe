import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Crown } from 'lucide-react';

interface ProfilePageProps {
  onNavigateToCreatorDashboard?: () => void;
}

export function ProfilePage({ onNavigateToCreatorDashboard }: ProfilePageProps = {}) {
  // Mock user data
  const userData = {
    address: '0x742d...5f3a',
    balance: 12.45,
    yesterdayDividend: 3.21,
    netPnL: 245.67,
    pnlChange: 15.3,
  };

  // Mock shares owned
  const ownedShares = [
    {
      id: '1',
      name: 'Sarah Chen',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      shares: 5,
      avgPrice: 11.20,
      currentPrice: 12.45,
      value: 62.25,
      pnl: 6.25,
      pnlPercent: 11.2,
    },
    {
      id: '2',
      name: 'Alex Rivera',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      shares: 10,
      avgPrice: 11.50,
      currentPrice: 10.82,
      value: 108.20,
      pnl: -6.80,
      pnlPercent: -5.9,
    },
    {
      id: '3',
      name: 'Maya Patel',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
      shares: 8,
      avgPrice: 8.50,
      currentPrice: 9.15,
      value: 73.20,
      pnl: 5.20,
      pnlPercent: 7.6,
    },
  ];

  // Mock market positions
  const marketPositions = [
    {
      id: '1',
      question: 'Will Bitcoin reach $100,000 by end of 2025?',
      image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=400&fit=crop',
      type: 'yes' as const,
      shares: 100,
      avgPrice: 52,
      currentPrice: 54,
      value: 54,
      pnl: 2,
      pnlPercent: 3.8,
    },
    {
      id: '2',
      question: 'Will Tesla stock price exceed $300 in Q1 2025?',
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=400&fit=crop',
      type: 'no' as const,
      shares: 150,
      avgPrice: 48,
      currentPrice: 45,
      value: 67.5,
      pnl: -4.5,
      pnlPercent: -6.3,
    },
  ];

  const totalSharesValue = ownedShares.reduce((sum, share) => sum + share.value, 0);
  const totalMarketValue = marketPositions.reduce((sum, pos) => sum + pos.value, 0);

  return (
    <div className="min-h-screen pb-6 bg-background">
      <div className="bg-card border-b border-border py-4 px-5 lg:px-8 shadow-sm">
        <h1 className="text-foreground text-xl tracking-tight mb-1">Profile</h1>
        <p className="text-muted-foreground text-[13px]">Manage your portfolio</p>
      </div>

      <div className="px-5 lg:px-8 space-y-4">
        {/* Balance Card */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-5 lg:max-w-2xl shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              <span className="text-primary text-[13px]">Wallet</span>
            </div>
            <span className="text-muted-foreground text-[12px]">{userData.address}</span>
          </div>

          <div className="mb-1">
            <div className="text-primary text-[12px] mb-1">Total Balance</div>
            <div className="text-foreground text-3xl tracking-tight">{userData.balance.toFixed(2)} ETH</div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-primary/20">
            <div>
              <div className="text-primary text-[11px] mb-1">Yesterday's Dividend</div>
              <div className="text-chart-1 text-[15px]">+${userData.yesterdayDividend}</div>
            </div>
            <div>
              <div className="text-primary text-[11px] mb-1">Net P&L</div>
              <div className="flex items-center gap-1">
                <span className="text-chart-1 text-[15px]">+${userData.netPnL}</span>
                <span className="text-chart-1 text-[11px]">({userData.pnlChange}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Creator Dashboard Button (if user is a creator) */}
        {onNavigateToCreatorDashboard && (
          <button
            onClick={onNavigateToCreatorDashboard}
            className="w-full bg-gradient-to-r from-primary/20 to-chart-1/20 border border-primary/30 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div className="text-left">
                <div className="text-foreground mb-1">Creator Dashboard</div>
                <div className="text-muted-foreground text-xs">View your markets and analytics</div>
              </div>
            </div>
            <div className="text-primary">→</div>
          </button>
        )}

        {/* Two column layout on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Creator Shares */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-foreground text-[15px]">Creator Shares</h2>
              <div className="text-muted-foreground text-[12px]">
                Total: <span className="text-foreground">${totalSharesValue.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {ownedShares.map((share) => (
                <div
                  key={share.id}
                  className="bg-secondary hover:bg-accent border border-border rounded-xl p-3 transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-border bg-secondary flex-shrink-0 shadow-sm">
                      <ImageWithFallback
                        src={share.image}
                        alt={share.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-foreground text-[13px] mb-0.5 truncate">{share.name}</h3>
                      <p className="text-muted-foreground text-[11px]">{share.shares} shares @ ${share.avgPrice}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-foreground text-[13px] mb-0.5">${share.value.toFixed(2)}</div>
                      <div className={`text-[11px] flex items-center gap-0.5 justify-end ${
                        share.pnl >= 0 ? 'text-chart-1' : 'text-destructive'
                      }`}>
                        {share.pnl >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{share.pnl >= 0 ? '+' : ''}{share.pnlPercent.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Market Positions */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-foreground text-[15px]">Market Positions</h2>
              <div className="text-muted-foreground text-[12px]">
                Total: <span className="text-foreground">${totalMarketValue.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {marketPositions.map((position) => (
                <div
                  key={position.id}
                  className="bg-secondary hover:bg-accent border border-border rounded-xl p-3 transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border border-border bg-secondary flex-shrink-0 shadow-sm">
                      <ImageWithFallback
                        src={position.image}
                        alt={position.question}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-lg ${
                          position.type === 'yes'
                            ? 'bg-chart-1/20 text-chart-1'
                            : 'bg-destructive/20 text-destructive'
                        }`}>
                          {position.type.toUpperCase()}
                        </span>
                      </div>
                      <h3 className="text-foreground text-[13px] leading-snug line-clamp-2 mb-1">
                        {position.question}
                      </h3>
                      <p className="text-muted-foreground text-[11px]">
                        {position.shares} shares @ {position.avgPrice}¢
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-foreground text-[13px] mb-0.5">${position.value.toFixed(2)}</div>
                      <div className={`text-[11px] flex items-center gap-0.5 justify-end ${
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
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground text-[12px]">Total Invested</span>
            </div>
            <div className="text-foreground text-xl">${(totalSharesValue + totalMarketValue - userData.netPnL).toFixed(2)}</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-chart-1" />
              <span className="text-muted-foreground text-[12px]">Win Rate</span>
            </div>
            <div className="text-foreground text-xl">67%</div>
          </div>
        </div>
      </div>
    </div>
  );
}
