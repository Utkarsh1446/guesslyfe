import { ImageWithFallback } from '../figma/ImageWithFallback';
import { TrendingUp, Users, DollarSign, Zap, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

interface HomePageProps {
  onExploreApp: () => void;
  onJoinAsCreator: () => void;
}

export function HomePage({ onExploreApp, onJoinAsCreator }: HomePageProps) {
  const stats = [
    { label: 'Total Volume', value: '$12.5M', icon: DollarSign },
    { label: 'Active Markets', value: '2,431', icon: TrendingUp },
    { label: 'Creators', value: '847', icon: Users },
    { label: 'Active Traders', value: '15.2K', icon: Zap },
  ];

  const features = [
    {
      title: 'Trade on Predictions',
      description: 'Bet on outcomes you believe in. Win big when you\'re right.',
      icon: TrendingUp,
    },
    {
      title: 'Back Creators',
      description: 'Buy shares in your favorite creators and earn dividends from their market fees.',
      icon: Users,
    },
    {
      title: 'Zero Fees to Buy',
      description: 'No fees when buying creator shares. Only 5% when selling.',
      icon: Sparkles,
    },
  ];

  const howItWorks = [
    { step: '1', title: 'Connect Wallet', description: 'Link your Web3 wallet and Twitter account' },
    { step: '2', title: 'Browse & Trade', description: 'Explore markets and creator shares' },
    { step: '3', title: 'Earn Rewards', description: 'Win from predictions and earn dividends' },
  ];

  const recentActivity = [
    { user: 'trader_x', action: 'bought YES', market: 'Bitcoin $100K by 2025', amount: '$500', time: '2m ago' },
    { user: 'crypto_bull', action: 'bought shares', creator: '@elonmusk', amount: '10 shares', time: '5m ago' },
    { user: 'sports_fan', action: 'bought NO', market: 'Lakers NBA Championship', amount: '$250', time: '8m ago' },
    { user: 'whale_087', action: 'bought shares', creator: '@garyvee', amount: '50 shares', time: '12m ago' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background border-b border-border">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDE1MCwgMTAwLCAyNTUsIDAuMDUpIi8+PC9nPjwvc3ZnPg==')] opacity-40"></div>
        
        <div className="relative px-5 lg:px-8 py-12 lg:py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-sm mb-6">
            <Sparkles className="w-4 h-4" />
            <span>Prediction markets meet creator economy</span>
          </div>
          
          <h1 className="text-4xl lg:text-5xl mb-4 tracking-tight bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
            Bet on the Future.<br />Back Creators.
          </h1>
          
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
            Trade on prediction markets created by your favorite influencers. Buy their shares and earn dividends.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-2xl mx-auto">
            <div className="flex-1">
              <button
                onClick={onExploreApp}
                className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
              >
                <span>Explore Guessly</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <p className="text-muted-foreground text-xs text-center mt-2">
                Trade markets & back creators
              </p>
            </div>
            <div className="flex-1">
              <button
                onClick={onJoinAsCreator}
                className="w-full px-6 py-4 bg-card border-2 border-primary text-primary rounded-xl shadow-md hover:shadow-lg hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
              >
                <Users className="w-4 h-4" />
                <span>Join as Creator</span>
              </button>
              <p className="text-muted-foreground text-xs text-center mt-2">
                Create markets & earn dividends
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="px-5 lg:px-8 py-8 border-b border-border">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground text-xs">{stat.label}</span>
                </div>
                <div className="text-foreground text-2xl">{stat.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Features Section */}
      <div className="px-5 lg:px-8 py-12 border-b border-border">
        <h2 className="text-2xl text-foreground mb-2 text-center">Why Guessly?</h2>
        <p className="text-muted-foreground text-center mb-8 max-w-lg mx-auto">
          The only platform that combines prediction markets with creator shares
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* How It Works Section */}
      <div className="px-5 lg:px-8 py-12 border-b border-border bg-secondary/30">
        <h2 className="text-2xl text-foreground mb-8 text-center">How It Works</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {howItWorks.map((item, index) => (
            <div key={item.step} className="relative">
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center mx-auto mb-4 text-primary text-xl">
                  {item.step}
                </div>
                <h3 className="text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
              {index < howItWorks.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2">
                  <ArrowRight className="w-6 h-6 text-primary/30" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="px-5 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl text-foreground">Live Activity</h2>
          <div className="flex items-center gap-2 text-chart-1 text-sm">
            <div className="w-2 h-2 rounded-full bg-chart-1 animate-pulse"></div>
            <span>Live</span>
          </div>
        </div>
        
        <div className="space-y-3 max-w-2xl mx-auto">
          {recentActivity.map((activity, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-foreground text-sm truncate">{activity.user}</span>
                    <span className="text-muted-foreground text-xs">{activity.action}</span>
                  </div>
                  <p className="text-muted-foreground text-xs truncate">
                    {activity.market || activity.creator}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-primary text-sm">{activity.amount}</div>
                  <div className="text-muted-foreground text-xs">{activity.time}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-5 lg:px-8 py-12 bg-gradient-to-b from-primary/5 to-background">
        <div className="bg-card border border-border rounded-xl p-8 text-center shadow-lg max-w-2xl mx-auto">
          <h2 className="text-2xl text-foreground mb-3">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">
            Join thousands of traders making predictions and backing creators
          </p>
          <button
            onClick={onExploreApp}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2"
          >
            Explore Guessly
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
