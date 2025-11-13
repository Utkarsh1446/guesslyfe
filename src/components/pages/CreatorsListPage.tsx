import { useState } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { TrendingUp, TrendingDown, ArrowUpRight, Search } from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  image: string;
  sharePrice: number;
  priceChange24h: number;
  holders: number;
  volume24h: string;
  rank: number;
}

interface CreatorsListPageProps {
  onCreatorClick: (creatorId: string) => void;
  onJoinAsCreator: () => void;
}

export function CreatorsListPage({ onCreatorClick, onJoinAsCreator }: CreatorsListPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const creators: Creator[] = [
    {
      id: '1',
      name: 'Sarah Chen',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      sharePrice: 12.45,
      priceChange24h: 8.3,
      holders: 1234,
      volume24h: '$45.2K',
      rank: 1,
    },
    {
      id: '2',
      name: 'Alex Rivera',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      sharePrice: 10.82,
      priceChange24h: -3.2,
      holders: 987,
      volume24h: '$38.5K',
      rank: 2,
    },
    {
      id: '3',
      name: 'Maya Patel',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
      sharePrice: 9.15,
      priceChange24h: 5.7,
      holders: 876,
      volume24h: '$32.1K',
      rank: 3,
    },
    {
      id: '4',
      name: 'David Kim',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
      sharePrice: 8.43,
      priceChange24h: 12.5,
      holders: 754,
      volume24h: '$28.9K',
      rank: 4,
    },
    {
      id: '5',
      name: 'Emma Johnson',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
      sharePrice: 7.92,
      priceChange24h: -1.8,
      holders: 623,
      volume24h: '$24.7K',
      rank: 5,
    },
  ];

  // Filter creators based on search query
  const filteredCreators = creators.filter(creator =>
    creator.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-6 bg-background">
      <div className="bg-card border-b border-border py-4 px-5 lg:px-8 shadow-sm">
        <div className="mb-3">
          <h1 className="text-foreground text-xl tracking-tight mb-1">Top Creators</h1>
          <p className="text-muted-foreground text-[13px]">Ranked by 24h performance</p>
        </div>

        {/* Search Bar */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators..."
            className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        
        <button
          onClick={onJoinAsCreator}
          className="w-full lg:max-w-xs flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-3 rounded-xl transition-all duration-200 text-sm shadow-sm"
        >
          <span>Join as Creator</span>
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 lg:px-8 pt-4">
        {/* Results count */}
        {searchQuery && (
          <div className="mb-3 text-muted-foreground text-xs">
            {filteredCreators.length} {filteredCreators.length === 1 ? 'creator' : 'creators'} found
          </div>
        )}

        {/* No results message */}
        {filteredCreators.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="text-foreground mb-1">No creators found</h3>
            <p className="text-muted-foreground text-sm">Try searching with a different name</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            {filteredCreators.map((creator) => (
          <div
            key={creator.id}
            onClick={() => onCreatorClick(creator.id)}
            className="bg-card hover:bg-accent border border-border hover:border-primary/50 rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-muted-foreground text-[13px] w-6">#{creator.rank}</span>
                
                <div className="w-12 h-12 rounded-xl overflow-hidden border border-border flex-shrink-0 bg-secondary shadow-sm">
                  <ImageWithFallback
                    src={creator.image}
                    alt={creator.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-foreground text-[14px] truncate mb-0.5">{creator.name}</h3>
                  <p className="text-muted-foreground text-[12px]">{creator.holders} holders</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-foreground text-[14px] mb-0.5">${creator.sharePrice}</div>
                  <div className={`flex items-center gap-1 text-[12px] ${
                    creator.priceChange24h > 0 ? 'text-chart-1' : 'text-destructive'
                  }`}>
                    {creator.priceChange24h > 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    <span>{Math.abs(creator.priceChange24h)}%</span>
                  </div>
                </div>

                <div className="text-right min-w-[60px]">
                  <div className="text-muted-foreground text-[11px] mb-0.5">Volume</div>
                  <div className="text-foreground text-[13px]">{creator.volume24h}</div>
                </div>
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
