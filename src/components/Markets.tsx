import { ImageWithFallback } from './figma/ImageWithFallback';
import { TrendingUp, TrendingDown, Users, ChevronRight } from 'lucide-react';

interface Market {
  id: string;
  title: string;
  question: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  image: string;
  category: string;
  trending?: 'up' | 'down';
  creatorName: string;
}

interface MarketsProps {
  markets: Market[];
  onMarketClick?: (marketId: string) => void;
  onViewAll?: () => void;
}

export function Markets({ markets, onMarketClick, onViewAll }: MarketsProps) {
  return (
    <div className="px-5 lg:px-8 py-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-foreground text-[15px] tracking-tight">Active Markets</h2>
        <button 
          onClick={onViewAll}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-all duration-200 text-sm shadow-sm"
        >
          <span>See all</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {markets.map((market) => (
          <div
            key={market.id}
            onClick={() => onMarketClick?.(market.id)}
            className="group relative bg-card hover:bg-accent rounded-xl p-4 border border-border hover:border-primary/50 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="flex gap-3 mb-3">
              <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-secondary border border-border shadow-sm">
                <ImageWithFallback
                  src={market.image}
                  alt={market.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                    {market.category}
                  </span>
                  {market.trending && (
                    <div className={`flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-lg ${
                      market.trending === 'up' 
                        ? 'bg-chart-1/10 text-chart-1' 
                        : 'bg-destructive/10 text-destructive'
                    }`}>
                      {market.trending === 'up' ? (
                        <TrendingUp className="w-2.5 h-2.5" />
                      ) : (
                        <TrendingDown className="w-2.5 h-2.5" />
                      )}
                      <span>{market.trending === 'up' ? '+12%' : '-8%'}</span>
                    </div>
                  )}
                </div>
                <h3 className="text-foreground text-[14px] leading-snug line-clamp-2">
                  {market.question}
                </h3>
              </div>
            </div>

            {/* Market by Creator Name */}
            <div className="mb-3">
              <span className="text-muted-foreground text-[11px]">
                Market by <span className="text-foreground/80">{market.creatorName}</span>
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <button className="relative overflow-hidden bg-chart-1/10 hover:bg-chart-1/20 border border-chart-1/20 hover:border-chart-1/30 rounded-xl px-3 py-2.5 transition-all text-left shadow-sm">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-chart-1 text-[11px] uppercase tracking-wider">Yes</span>
                  <span className="text-chart-1/70 text-[11px]">54%</span>
                </div>
                <div className="text-chart-1 text-lg">{market.yesPrice}¢</div>
              </button>
              
              <button className="relative overflow-hidden bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 hover:border-destructive/30 rounded-xl px-3 py-2.5 transition-all text-left shadow-sm">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-destructive text-[11px] uppercase tracking-wider">No</span>
                  <span className="text-destructive/70 text-[11px]">46%</span>
                </div>
                <div className="text-destructive text-lg">{market.noPrice}¢</div>
              </button>
            </div>
            
            <div className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>1.2K</span>
              </div>
              <div className="text-muted-foreground">
                <span className="text-foreground/80">{market.volume}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
