import { useState } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { TrendingUp, TrendingDown, Users, Filter, Search } from 'lucide-react';

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

interface MarketsListPageProps {
  onMarketClick: (marketId: string) => void;
}

export function MarketsListPage({ onMarketClick }: MarketsListPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  // Mock markets data - would be passed as props in real implementation
  const markets: Market[] = [
    {
      id: '1',
      title: 'Presidential Election 2024',
      question: 'Will the Democrats win the 2024 Presidential Election?',
      yesPrice: 48,
      noPrice: 52,
      volume: '$2.4M',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NjI2NTQ1Mzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      category: 'Politics',
      trending: 'up' as const,
      creatorName: 'RealDonald',
    },
    {
      id: '2',
      title: 'NBA Championship',
      question: 'Will the Lakers win the NBA Championship this year?',
      yesPrice: 35,
      noPrice: 65,
      volume: '$890K',
      image: 'https://images.unsplash.com/photo-1636007613585-48b105cfe3be?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdGhsZXRlJTIwc3BvcnRzfGVufDF8fHx8MTc2MjY3OTkwN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      category: 'Sports',
      trending: 'down' as const,
      creatorName: 'NeilFilmz',
    },
    {
      id: '3',
      title: 'Tech IPO',
      question: 'Will OpenAI IPO in 2025?',
      yesPrice: 62,
      noPrice: 38,
      volume: '$1.8M',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHBlcnNvbnxlbnwxfHx8fDE3NjI2MjQ1MjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      category: 'Business',
      trending: 'up' as const,
      creatorName: 'Emmanuel',
    },
    {
      id: '4',
      title: 'Bitcoin Price',
      question: 'Will Bitcoin reach $100K by end of 2025?',
      yesPrice: 71,
      noPrice: 29,
      volume: '$3.2M',
      image: 'https://images.unsplash.com/photo-1708426238272-994fcddabca4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHBlcnNvbnxlbnwxfHx8fDE3NjI2NDQ2NDB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      category: 'Crypto',
      trending: 'up' as const,
      creatorName: 'Mkbhd',
    },
    {
      id: '5',
      title: 'Climate Agreement',
      question: 'Will a major climate agreement be signed in 2025?',
      yesPrice: 58,
      noPrice: 42,
      volume: '$1.2M',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NjI2NTQ1Mzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      category: 'Politics',
      trending: 'up' as const,
      creatorName: 'Banks',
    },
    {
      id: '6',
      title: 'AI Breakthrough',
      question: 'Will AGI be achieved by 2026?',
      yesPrice: 23,
      noPrice: 77,
      volume: '$4.5M',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHBlcnNvbnxlbnwxfHx8fDE3NjI2MjQ1MjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      category: 'Technology',
      trending: 'up' as const,
      creatorName: 'Mkbhd',
    },
  ];

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(markets.map(m => m.category)))];

  // Filter markets by category and search query
  const filteredMarkets = markets.filter(market => {
    const matchesCategory = selectedCategory === 'All' || market.category === selectedCategory;
    const matchesSearch = market.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          market.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          market.creatorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen pb-6 bg-background">
      <div className="bg-card border-b border-border py-4 px-5 lg:px-8 shadow-sm">
        <div className="mb-3">
          <h1 className="text-foreground text-xl tracking-tight mb-1">All Markets</h1>
          <p className="text-muted-foreground text-[13px]">Trade on your predictions</p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search markets by question, title, or creator..."
            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="px-5 lg:px-8 pt-4">
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-xl border transition-all whitespace-nowrap text-sm ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-card text-foreground border-border hover:border-primary/50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Market Count */}
        <div className="mb-4 text-muted-foreground text-xs">
          {filteredMarkets.length} {filteredMarkets.length === 1 ? 'market' : 'markets'}
          {selectedCategory !== 'All' && ` in ${selectedCategory}`}
          {searchQuery && ' matching your search'}
        </div>
      </div>

      <div className="px-5 lg:px-8">
        {/* No results message */}
        {filteredMarkets.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-foreground mb-1">No markets found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery 
                ? 'Try searching with different keywords' 
                : `No markets in ${selectedCategory}`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredMarkets.map((market) => (
          <div
            key={market.id}
            onClick={() => onMarketClick(market.id)}
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
        )}
      </div>
    </div>
  );
}
