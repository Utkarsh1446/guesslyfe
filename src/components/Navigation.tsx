import { Home, Sparkles, User, TrendingUp } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'markets', label: 'Markets', icon: TrendingUp },
    { id: 'creator-share', label: 'Creators', icon: Sparkles },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="flex justify-around items-center bg-card border-t border-border px-2 py-2.5 shadow-lg">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-all duration-200 ${
              isActive 
                ? 'text-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {isActive && (
              <div className="absolute inset-0 bg-accent rounded-xl shadow-sm" />
            )}
            <Icon className={`w-[22px] h-[22px] relative z-10 transition-all duration-200`} />
            <span className="text-[11px] relative z-10 tracking-tight">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
