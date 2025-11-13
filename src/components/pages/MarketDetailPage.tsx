import { useState } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { ArrowLeft, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface MarketDetailPageProps {
  marketId: string;
  onBack: () => void;
}

export function MarketDetailPage({ marketId, onBack }: MarketDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'yes' | 'no'>('yes');
  const [amount, setAmount] = useState('');
  const [chartPeriod, setChartPeriod] = useState<'1d' | '7d' | '30d' | 'all'>('7d');

  // Mock market data
  const market = {
    id: marketId,
    question: 'Will Bitcoin reach $100,000 by end of 2025?',
    category: 'Crypto',
    image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=400&fit=crop',
    yesPrice: 54,
    noPrice: 46,
    volume: '$2.5M',
    traders: 3421,
    endDate: 'Dec 31, 2025',
    yourPosition: { type: 'yes', shares: 100, avgPrice: 52 },
  };

  // Mock chart data
  const chartData = {
    '1d': Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      yes: 50 + Math.random() * 10,
      no: 50 - Math.random() * 10,
    })),
    '7d': Array.from({ length: 7 }, (_, i) => ({
      time: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      yes: 45 + Math.random() * 15,
      no: 55 - Math.random() * 15,
    })),
    '30d': Array.from({ length: 30 }, (_, i) => ({
      time: `Day ${i + 1}`,
      yes: 40 + Math.random() * 20,
      no: 60 - Math.random() * 20,
    })),
    'all': Array.from({ length: 12 }, (_, i) => ({
      time: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      yes: 30 + Math.random() * 30,
      no: 70 - Math.random() * 30,
    })),
  };

  // Mock activity data
  const activities = [
    { type: 'yes', user: 'Trader123', shares: 50, price: 54, time: '2m ago' },
    { type: 'no', user: 'Trader456', shares: 30, price: 46, time: '8m ago' },
    { type: 'yes', user: 'Trader789', shares: 100, price: 53, time: '15m ago' },
    { type: 'no', user: 'Trader321', shares: 75, price: 47, time: '22m ago' },
  ];

  const shares = amount ? parseInt(amount) : 0;
  const price = activeTab === 'yes' ? market.yesPrice : market.noPrice;
  const totalCost = (shares * price) / 100;
  const potentialReturn = shares - totalCost;

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-5 lg:px-8 py-3.5 shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[14px]">Back</span>
        </button>
      </div>

      {/* Market Info */}
      <div className="px-5 lg:px-8 pt-5 pb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-16 h-16 rounded-xl overflow-hidden border border-border bg-card shadow-md">
            <ImageWithFallback
              src={market.image}
              alt={market.question}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="inline-block px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-[11px] uppercase tracking-wider mb-2">
              {market.category}
            </div>
            <h1 className="text-foreground text-lg leading-snug mb-3">{market.question}</h1>
            
            <div className="flex items-center gap-4 text-[12px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span>{market.traders.toLocaleString()} traders</span>
              </div>
              <div className="text-muted-foreground">
                Volume: <span className="text-foreground">{market.volume}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Position */}
        {market.yourPosition && (
          <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <span className="text-muted-foreground text-[13px]">Your Position</span>
              <span className={`text-[13px] ${
                market.yourPosition.type === 'yes' ? 'text-chart-1' : 'text-destructive'
              }`}>
                {market.yourPosition.type.toUpperCase()}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-muted-foreground text-[11px] mb-0.5">Shares</div>
                <div className="text-foreground text-[14px]">{market.yourPosition.shares}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[11px] mb-0.5">Avg Price</div>
                <div className="text-foreground text-[14px]">{market.yourPosition.avgPrice}¢</div>
              </div>
              <div>
                <div className="text-muted-foreground text-[11px] mb-0.5">P&L</div>
                <div className="text-chart-1 text-[14px]">
                  +${((market.yesPrice - market.yourPosition.avgPrice) * market.yourPosition.shares / 100).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Buy/Sell Section */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-md">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setActiveTab('yes')}
              className={`relative overflow-hidden border rounded-xl px-4 py-4 transition-all text-left shadow-sm ${
                activeTab === 'yes'
                  ? 'bg-chart-1/20 border-chart-1/30'
                  : 'bg-chart-1/10 border-chart-1/20 hover:border-chart-1/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-chart-1 text-[11px] uppercase tracking-wider">Yes</span>
                <span className="text-chart-1/70 text-[11px]">
                  {((market.yesPrice / (market.yesPrice + market.noPrice)) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="text-chart-1 text-2xl">{market.yesPrice}¢</div>
            </button>
            
            <button
              onClick={() => setActiveTab('no')}
              className={`relative overflow-hidden border rounded-xl px-4 py-4 transition-all text-left shadow-sm ${
                activeTab === 'no'
                  ? 'bg-destructive/20 border-destructive/30'
                  : 'bg-destructive/10 border-destructive/20 hover:border-destructive/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-destructive text-[11px] uppercase tracking-wider">No</span>
                <span className="text-destructive/70 text-[11px]">
                  {((market.noPrice / (market.yesPrice + market.noPrice)) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="text-destructive text-2xl">{market.noPrice}¢</div>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-muted-foreground text-[12px] mb-1.5 block">Number of Shares</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-foreground text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-sm"
              />
            </div>

            <div className="bg-secondary rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Avg price</span>
                <span className="text-foreground">{price}¢</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Total cost</span>
                <span className="text-foreground">${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-[12px]">
                <span className="text-muted-foreground">Potential return</span>
                <span className="text-chart-1">${potentialReturn.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-xl transition-all duration-200 text-sm shadow-sm"
              >
                Buy
              </button>
              <button
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-xl transition-all duration-200 text-sm shadow-sm"
              >
                Sell
              </button>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground text-[14px]">Probability Chart</span>
            </div>
            
            <div className="flex gap-1">
              {(['1d', '7d', '30d', 'all'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] transition-all ${
                    chartPeriod === period
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {period === 'all' ? 'All' : period.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData[chartPeriod]}>
              <XAxis
                dataKey="time"
                stroke="#52525b"
                style={{ fontSize: '11px' }}
                tickLine={false}
              />
              <YAxis
                stroke="#52525b"
                style={{ fontSize: '11px' }}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(0.2568 0.0076 274.6528)',
                  border: '1px solid oklch(0.3289 0.0092 268.3843)',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: 'oklch(0.9551 0 0)',
                }}
              />
              <Line
                type="monotone"
                dataKey="yes"
                stroke="oklch(0.8003 0.1821 151.7110)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="no"
                stroke="oklch(0.7106 0.1661 22.2162)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Activity */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-md">
          <h3 className="text-foreground text-[14px] mb-4">Recent Trades</h3>
          
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] shadow-sm ${
                      activity.type === 'yes'
                        ? 'bg-chart-1/20 text-chart-1'
                        : 'bg-destructive/20 text-destructive'
                    }`}
                  >
                    {activity.type.toUpperCase()}
                  </div>
                  <div>
                    <div className="text-foreground text-[13px]">
                      {activity.shares} shares @ {activity.price}¢
                    </div>
                    <div className="text-muted-foreground text-[11px]">{activity.user} · {activity.time}</div>
                  </div>
                </div>
                <div className="text-foreground/80 text-[12px]">
                  ${(activity.shares * activity.price / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
