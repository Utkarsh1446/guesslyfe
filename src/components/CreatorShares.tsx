import { ImageWithFallback } from './figma/ImageWithFallback';
import { ChevronRight } from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  image: string;
}

interface CreatorSharesProps {
  creators: Creator[];
  onCreatorClick?: (creatorId: string) => void;
  onViewAll?: () => void;
}

export function CreatorShares({ creators, onCreatorClick, onViewAll }: CreatorSharesProps) {
  return (
    <div className="px-5 lg:px-8 pt-6 pb-8">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-foreground text-[15px] tracking-tight">Featured Creators</h2>
        <button 
          onClick={onViewAll}
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-all duration-200 text-sm shadow-sm"
        >
          <span>View all</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex gap-3 overflow-x-auto lg:overflow-x-visible lg:flex-wrap pb-2 scrollbar-hide -mx-5 px-5 lg:mx-0 lg:px-0">
        {creators.map((creator, index) => (
          <div 
            key={creator.id}
            onClick={() => onCreatorClick?.(creator.id)}
            className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="w-[68px] h-[68px] rounded-xl overflow-hidden border border-border group-hover:border-primary/50 transition-all duration-200 group-hover:scale-[1.03] bg-card shadow-sm">
              <ImageWithFallback
                src={creator.image}
                alt={creator.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-foreground text-[12px] text-center max-w-[68px] truncate group-hover:text-primary transition-colors">
              {creator.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
