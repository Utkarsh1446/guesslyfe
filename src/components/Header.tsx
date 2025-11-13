import logoImage from 'figma:asset/c5a5d390da921cf62fbac16a10eb5c37f231f7ca.png';
import { Wallet, Bell, Settings, Trophy } from 'lucide-react';

interface HeaderProps {
  isWalletConnected?: boolean;
  onConnectWallet?: () => void;
  onOpenNotifications?: () => void;
  onOpenSettings?: () => void;
  onOpenLeaderboards?: () => void;
  walletAddress?: string;
  notificationCount?: number;
}

export function Header({ 
  isWalletConnected, 
  onConnectWallet,
  onOpenNotifications,
  onOpenSettings,
  onOpenLeaderboards,
  walletAddress = '0x742d...5f3a',
  notificationCount = 0
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-5 py-4 bg-background border-b border-border shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-md">
          <img src={logoImage} alt="Guessly Logo" className="w-5 h-5" />
        </div>
        <span className="text-foreground tracking-tight text-[15px]">Guessly</span>
      </div>
      
      <div className="flex items-center gap-2">
        {isWalletConnected ? (
          <>
            <button 
              onClick={onOpenLeaderboards}
              className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center hover:bg-accent transition-colors"
            >
              <Trophy className="w-4 h-4 text-foreground" />
            </button>
            
            <button 
              onClick={onOpenNotifications}
              className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center hover:bg-accent transition-colors relative"
            >
              <Bell className="w-4 h-4 text-foreground" />
              {notificationCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-[10px] text-destructive-foreground">
                  {notificationCount}
                </div>
              )}
            </button>
            
            <button 
              onClick={onOpenSettings}
              className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center hover:bg-accent transition-colors"
            >
              <Settings className="w-4 h-4 text-foreground" />
            </button>
            
            <div className="px-3 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary text-sm">
              {walletAddress}
            </div>
          </>
        ) : (
          <button 
            onClick={onConnectWallet}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl transition-all duration-200 text-sm shadow-sm"
          >
            <Wallet className="w-4 h-4" />
            <span>Connect</span>
          </button>
        )}
      </div>
    </header>
  );
}
