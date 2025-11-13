import { useState, useEffect } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { ArrowLeft, TrendingUp, Clock, Gift, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface CreatorDetailPageProps {
  creatorId: string;
  onBack: () => void;
}

export function CreatorDetailPage({ creatorId, onBack }: CreatorDetailPageProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [chartPeriod, setChartPeriod] = useState<'1d' | '7d' | '30d' | 'all'>('7d');
  const [timeLeft, setTimeLeft] = useState({ hours: 23, minutes: 45, seconds: 30 });
  const [amount, setAmount] = useState('');

  // Mock creator data
  const creator = {
    id: creatorId,
    name: 'Sarah Chen',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    sharePrice: 12.45,
    priceChange24h: 8.3,
    holders: 1234,
    yourShares: 5,
    dividendAvailable: 2.34,
  };

  // Mock chart data
  const chartData = {
    '1d': Array.from({ length: 24 }, (_, i) => ({
      time: `${i}:00`,
      price: 12 + Math.random() * 2,
    })),
    '7d': Array.from({ length: 7 }, (_, i) => ({
      time: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      price: 10 + Math.random() * 4,
    })),
    '30d': Array.from({ length: 30 }, (_, i) => ({
      time: `Day ${i + 1}`,
      price: 8 + Math.random() * 6,
    })),
    'all': Array.from({ length: 12 }, (_, i) => ({
      time: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
      price: 5 + Math.random() * 10,
    })),
  };

  // Mock activity data
  const activities = [
    { type: 'buy', user: 'User123', amount: 3, price: 12.45, time: '5m ago' },
    { type: 'sell', user: 'User456', amount: 2, price: 12.40, time: '12m ago' },
    { type: 'buy', user: 'User789', amount: 1, price: 12.38, time: '18m ago' },
    { type: 'dividend', user: 'User321', amount: 5.2, time: '1h ago' },
  ];

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { hours: prev.hours, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 23, minutes: 59, seconds: 59 };
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

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

      {/* Creator Info */}
      <div className="px-5 lg:px-8 pt-5 pb-6">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded-xl overflow-hidden border border-border bg-card shadow-md">
            <ImageWithFallback
              src={creator.image}
              alt={creator.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex-1">
            <h1 className="text-foreground text-xl tracking-tight mb-1">{creator.name}</h1>
            <p className="text-muted-foreground text-[13px] mb-3">{creator.holders} holders</p>
            
            <div className="flex items-center gap-3">
              <div>
                <div className="text-muted-foreground text-[11px] mb-0.5">Share Price</div>
                <div className="text-foreground text-lg">${creator.sharePrice}</div>
              </div>
              <div className="flex items-center gap-1 text-chart-1 text-[13px]">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+{creator.priceChange24h}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dividend Card */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-primary text-[13px]">Next Dividend</span>
            </div>
            <div className="text-foreground text-[14px] font-mono">
              {String(timeLeft.hours).padStart(2, '0')}:
              {String(timeLeft.minutes).padStart(2, '0')}:
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
          </div>
          
          {creator.dividendAvailable > 0 && (
            <div className="flex items-center justify-between pt-3 border-t border-primary/20">
              <div>
                <div className="text-primary text-[11px] mb-0.5">Available to Claim</div>
                <div className="text-foreground text-[15px]">${creator.dividendAvailable}</div>
              </div>
              <button className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-colors text-[13px] shadow-sm">
                <Gift className="w-4 h-4" />
                <span>Claim</span>
              </button>
            </div>
          )}
        </div>

        {/* Buy/Sell and Chart - Two columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Buy/Sell Tabs */}
        <div className="bg-card border border-border rounded-xl p-4 h-fit shadow-md">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('buy')}
              className={`flex-1 py-2 rounded-xl text-[13px] transition-all ${
                activeTab === 'buy'
                  ? 'bg-chart-1/20 text-chart-1 border border-chart-1/30 shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setActiveTab('sell')}
              className={`flex-1 py-2 rounded-xl text-[13px] transition-all ${
                activeTab === 'sell'
                  ? 'bg-destructive/20 text-destructive border border-destructive/30 shadow-sm'
                  : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              Sell
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-muted-foreground text-[12px] mb-1.5 block">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-background border border-input rounded-xl px-3 py-2.5 text-foreground text-[14px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors shadow-sm"
              />
            </div>

            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">You have</span>
              <span className="text-foreground">{creator.yourShares} shares</span>
            </div>

            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Total</span>
              <span className="text-foreground">
                ${amount ? (parseFloat(amount) * creator.sharePrice).toFixed(2) : '0.00'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-xl transition-all duration-200 text-sm shadow-sm"
              >
                Buy Shares
              </button>
              <button
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-xl transition-all duration-200 text-sm shadow-sm"
              >
                Sell Shares
              </button>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-foreground text-[14px]">Price Chart</span>
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
                domain={['auto', 'auto']}
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
                dataKey="price"
                stroke="oklch(0.6132 0.2294 291.7437)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        </div>

        {/* Activity */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-md">
          <h3 className="text-foreground text-[14px] mb-4">Recent Activity</h3>
          
          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] shadow-sm ${
                      activity.type === 'buy'
                        ? 'bg-chart-1/20 text-chart-1'
                        : activity.type === 'sell'
                        ? 'bg-destructive/20 text-destructive'
                        : 'bg-primary/20 text-primary'
                    }`}
                  >
                    {activity.type === 'buy' ? '↑' : activity.type === 'sell' ? '↓' : '$'}
                  </div>
                  <div>
                    <div className="text-foreground text-[13px]">
                      {activity.type === 'dividend' ? 'Dividend claimed' : `${activity.type === 'buy' ? 'Bought' : 'Sold'} ${activity.amount} shares`}
                    </div>
                    <div className="text-muted-foreground text-[11px]">{activity.user} · {activity.time}</div>
                  </div>
                </div>
                {activity.type !== 'dividend' && (
                  <div className="text-foreground/80 text-[12px]">${activity.price}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
