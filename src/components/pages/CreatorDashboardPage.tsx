import { useState } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Users, Target, Plus, Clock, CheckCircle2, XCircle } from 'lucide-react';

interface CreatorDashboardPageProps {
  onBack?: () => void;
  onCreateMarket?: () => void;
  onNavigateToMarket?: (marketId: string) => void;
}

export function CreatorDashboardPage({ onBack, onCreateMarket, onNavigateToMarket }: CreatorDashboardPageProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Mock analytics data
  const stats = {
    sharePrice: 12.45,
    priceChange: +2.3,
    priceChangePercent: +22.7,
    totalShareholders: 127,
    shareholdersChange: +15,
    marketCap: 15812.5,
    totalVolume: 45890,
    activeMarkets: 8,
    totalMarkets: 12,
    totalFees: 892.34,
  };

  const priceHistory = [
    { date: 'Jan 1', price: 8.5 },
    { date: 'Jan 8', price: 9.2 },
    { date: 'Jan 15', price: 9.8 },
    { date: 'Jan 22', price: 10.5 },
    { date: 'Jan 29', price: 11.2 },
    { date: 'Feb 5', price: 10.8 },
    { date: 'Feb 12', price: 11.5 },
    { date: 'Feb 19', price: 12.45 },
  ];

  const volumeData = [
    { date: 'Mon', volume: 1250 },
    { date: 'Tue', volume: 2100 },
    { date: 'Wed', volume: 1800 },
    { date: 'Thu', volume: 2400 },
    { date: 'Fri', volume: 3200 },
    { date: 'Sat', volume: 2800 },
    { date: 'Sun', volume: 1950 },
  ];

  const myMarkets = [
    {
      id: '1',
      question: 'Will Bitcoin reach $100K by end of 2025?',
      image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=400&fit=crop',
      status: 'active' as const,
      yesPrice: 68,
      noPrice: 32,
      volume: '$12.4K',
      traders: 234,
      endDate: 'Dec 31, 2025',
      myEarnings: 45.23,
    },
    {
      id: '2',
      question: 'Will Tesla stock exceed $300 in Q1 2025?',
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=400&fit=crop',
      status: 'active' as const,
      yesPrice: 42,
      noPrice: 58,
      volume: '$8.9K',
      traders: 156,
      endDate: 'Mar 31, 2025',
      myEarnings: 28.90,
    },
    {
      id: '3',
      question: 'Will Ethereum reach $5K by mid-2025?',
      image: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400&h=400&fit=crop',
      status: 'active' as const,
      yesPrice: 55,
      noPrice: 45,
      volume: '$15.2K',
      traders: 298,
      endDate: 'Jun 30, 2025',
      myEarnings: 67.45,
    },
    {
      id: '4',
      question: 'Will Lakers win NBA Championship 2024-25?',
      image: 'https://images.unsplash.com/photo-1636007613585-48b105cfe3be?w=400&h=400&fit=crop',
      status: 'pending_resolution' as const,
      yesPrice: 35,
      noPrice: 65,
      volume: '$6.7K',
      traders: 89,
      endDate: 'Jun 20, 2025',
      myEarnings: 22.15,
    },
    {
      id: '5',
      question: 'Will Apple announce VR headset in 2025?',
      image: 'https://images.unsplash.com/photo-1592286927505-c8b7b8f5028b?w=400&h=400&fit=crop',
      status: 'resolved' as const,
      outcome: 'yes' as const,
      volume: '$5.4K',
      traders: 67,
      resolvedDate: 'Jan 15, 2025',
      myEarnings: 18.50,
    },
  ];

  const topShareholders = [
    {
      address: '0x742d...5f3a',
      name: 'whale_trader',
      shares: 45,
      percentage: 3.6,
      value: 560.25,
    },
    {
      address: '0x8a3b...2c1d',
      name: 'crypto_bull',
      shares: 32,
      percentage: 2.5,
      value: 398.40,
    },
    {
      address: '0x1f4e...9b7a',
      name: 'early_adopter',
      shares: 28,
      percentage: 2.2,
      value: 348.60,
    },
    {
      address: '0x6c2a...4d8e',
      name: 'diamond_hands',
      shares: 25,
      percentage: 2.0,
      value: 311.25,
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="bg-card border-b border-border py-4 px-5 lg:px-8 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
              >
                ←
              </button>
            )}
            <div>
              <h1 className="text-foreground text-xl">Creator Dashboard</h1>
              <p className="text-muted-foreground text-sm">Analytics & Performance</p>
            </div>
          </div>
          <button
            onClick={onCreateMarket}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Create Market</span>
          </button>
        </div>
      </div>

      <div className="px-5 lg:px-8 space-y-6 mt-6">
        {/* Key Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground text-xs">Share Price</span>
            </div>
            <div className="text-foreground text-2xl mb-1">${stats.sharePrice}</div>
            <div className="flex items-center gap-1 text-chart-1 text-xs">
              <TrendingUp className="w-3 h-3" />
              <span>+{stats.priceChangePercent}%</span>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground text-xs">Shareholders</span>
            </div>
            <div className="text-foreground text-2xl mb-1">{stats.totalShareholders}</div>
            <div className="text-chart-1 text-xs">+{stats.shareholdersChange} this week</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground text-xs">Active Markets</span>
            </div>
            <div className="text-foreground text-2xl mb-1">{stats.activeMarkets}</div>
            <div className="text-muted-foreground text-xs">{stats.totalMarkets} total</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground text-xs">Total Fees</span>
            </div>
            <div className="text-foreground text-2xl mb-1">${stats.totalFees}</div>
            <div className="text-muted-foreground text-xs">All time</div>
          </div>
        </div>

        {/* Share Price Chart */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-foreground text-lg">Share Price History</h2>
            <div className="flex gap-2">
              {(['7d', '30d', '90d', 'all'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                    selectedPeriod === period
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-foreground hover:bg-accent'
                  }`}
                >
                  {period === 'all' ? 'All' : period.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={priceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                style={{ fontSize: '12px' }}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="oklch(0.6132 0.2294 291.7437)"
                strokeWidth={2}
                dot={{ fill: 'oklch(0.6132 0.2294 291.7437)', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trading Volume */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-foreground text-lg mb-6">Trading Volume (7 Days)</h2>
          
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={volumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                style={{ fontSize: '12px' }}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="volume" fill="oklch(0.6132 0.2294 291.7437)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* My Markets */}
        <div>
          <h2 className="text-foreground text-lg mb-4">My Markets</h2>
          <div className="space-y-3">
            {myMarkets.map((market) => (
              <div
                key={market.id}
                onClick={() => onNavigateToMarket?.(market.id)}
                className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shadow-sm flex-shrink-0">
                    <ImageWithFallback
                      src={market.image}
                      alt={market.question}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-foreground text-sm line-clamp-2">{market.question}</h3>
                      <div className={`px-2 py-1 rounded-lg text-xs whitespace-nowrap ${
                        market.status === 'active'
                          ? 'bg-chart-1/10 text-chart-1 border border-chart-1/20'
                          : market.status === 'pending_resolution'
                          ? 'bg-primary/10 text-primary border border-primary/20'
                          : 'bg-secondary text-muted-foreground border border-border'
                      }`}>
                        {market.status === 'active' ? 'Active' :
                         market.status === 'pending_resolution' ? 'Pending' :
                         'Resolved'}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                      {market.status === 'active' || market.status === 'pending_resolution' ? (
                        <>
                          <span className="flex items-center gap-1">
                            <span className="text-chart-1">YES {market.yesPrice}¢</span>
                            <span>•</span>
                            <span className="text-destructive">NO {market.noPrice}¢</span>
                          </span>
                          <span>•</span>
                          <span>{market.volume} volume</span>
                          <span>•</span>
                          <span>{market.traders} traders</span>
                        </>
                      ) : (
                        <>
                          <span className="flex items-center gap-1">
                            {market.outcome === 'yes' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-chart-1" />
                                <span className="text-chart-1">Resolved YES</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-destructive" />
                                <span className="text-destructive">Resolved NO</span>
                              </>
                            )}
                          </span>
                          <span>•</span>
                          <span>{market.volume} volume</span>
                          <span>•</span>
                          <span>{market.resolvedDate}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-muted-foreground text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {market.status === 'resolved' ? market.resolvedDate : `Ends ${market.endDate}`}
                      </div>
                      <div className="text-chart-1 text-sm">
                        +${market.myEarnings.toFixed(2)} earned
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Shareholders */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <h2 className="text-foreground text-lg mb-4">Top Shareholders</h2>
          <div className="space-y-3">
            {topShareholders.map((holder, index) => (
              <div
                key={holder.address}
                className="flex items-center gap-3 pb-3 border-b border-border last:border-0 last:pb-0"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-foreground text-sm mb-1">{holder.name}</div>
                  <div className="text-muted-foreground text-xs">{holder.address}</div>
                </div>
                <div className="text-right">
                  <div className="text-foreground text-sm mb-1">{holder.shares} shares</div>
                  <div className="text-muted-foreground text-xs">
                    {holder.percentage}% • ${holder.value.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
