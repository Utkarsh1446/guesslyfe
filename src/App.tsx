import { useState } from 'react';
import { MobileOnlyWrapper } from './components/MobileOnlyWrapper';
import { TutorialOverlay, useTutorial } from './components/TutorialOverlay';
import { Toaster } from './components/ui/sonner';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { CreatorShares } from './components/CreatorShares';
import { Markets } from './components/Markets';
import { HomePage } from './components/pages/HomePage';
import { CreatorsListPage } from './components/pages/CreatorsListPage';
import { MarketsListPage } from './components/pages/MarketsListPage';
import { CreatorDetailPage } from './components/pages/CreatorDetailPage';
import { MarketDetailPage } from './components/pages/MarketDetailPage';
import { JoinCreatorPage } from './components/pages/JoinCreatorPage';
import { CreatorProfileSetupPage } from './components/pages/CreatorProfileSetupPage';
import { ProfilePage } from './components/pages/ProfilePage';
import { DashboardPage } from './components/pages/DashboardPage';
import { DividendsPage } from './components/pages/DividendsPage';
import { NotificationsPage } from './components/pages/NotificationsPage';
import { CreateMarketPage } from './components/pages/CreateMarketPage';
import { CreatorDashboardPage } from './components/pages/CreatorDashboardPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { LeaderboardsPage } from './components/pages/LeaderboardsPage';
import { ConnectWalletModal } from './components/modals/ConnectWalletModal';
import { WrongNetworkModal } from './components/modals/WrongNetworkModal';
import { TransactionPendingModal, TransactionSuccessModal, TransactionFailedModal } from './components/modals/TransactionModals';
import { BuySharesModal } from './components/modals/BuySharesModal';
import { SellSharesModal } from './components/modals/SellSharesModal';
import { TradeMarketModal } from './components/modals/TradeMarketModal';

const creators = [
  {
    id: '1',
    name: 'Banks',
    image: 'https://images.unsplash.com/photo-1708426238272-994fcddabca4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHBlcnNvbnxlbnwxfHx8fDE3NjI2NDQ2NDB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: '2',
    name: 'RealDonald',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NjI2NTQ1Mzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: '3',
    name: 'NeilFilmz',
    image: 'https://images.unsplash.com/photo-1636007613585-48b105cfe3be?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhdGhsZXRlJTIwc3BvcnRzfGVufDF8fHx8MTc2MjY3OTkwN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: '4',
    name: 'Emmanuel',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxidXNpbmVzcyUyMHBlcnNvbnxlbnwxfHx8fDE3NjI2MjQ1MjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: '5',
    name: 'Mkbhd',
    image: 'https://images.unsplash.com/photo-1708426238272-994fcddabca4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3J0cmFpdCUyMHBlcnNvbnxlbnwxfHx8fDE3NjI2NDQ2NDB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
  {
    id: '6',
    name: 'Alan',
    image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBoZWFkc2hvdHxlbnwxfHx8fDE3NjI2NTQ1Mzd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
  },
];

const markets = [
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
];

type Page = 
  | { type: 'landing' }
  | { type: 'home' }
  | { type: 'dashboard' }
  | { type: 'markets-list' }
  | { type: 'creators-list' }
  | { type: 'creator-detail'; creatorId: string }
  | { type: 'market-detail'; marketId: string }
  | { type: 'join-creator' }
  | { type: 'creator-profile-setup' }
  | { type: 'profile' }
  | { type: 'dividends' }
  | { type: 'notifications' }
  | { type: 'create-market' }
  | { type: 'creator-dashboard' }
  | { type: 'settings' }
  | { type: 'leaderboards' };

export default function App() {
  const [activeNavTab, setActiveNavTab] = useState('home');
  const [currentPage, setCurrentPage] = useState<Page>({ type: 'landing' });
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  
  // Tutorial hook
  const { showTutorial, completeTutorial, skipTutorial, resetTutorial } = useTutorial();
  
  // Modal states
  const [showConnectWallet, setShowConnectWallet] = useState(false);
  const [showWrongNetwork, setShowWrongNetwork] = useState(false);
  const [showTxPending, setShowTxPending] = useState(false);
  const [showTxSuccess, setShowTxSuccess] = useState(false);
  const [showTxFailed, setShowTxFailed] = useState(false);
  const [showBuyShares, setShowBuyShares] = useState(false);
  const [showSellShares, setShowSellShares] = useState(false);
  const [showTradeMarket, setShowTradeMarket] = useState(false);
  
  // Selected items for modals
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [selectedMarket, setSelectedMarket] = useState<any>(null);

  const handleNavTabChange = (tab: string) => {
    setActiveNavTab(tab);
    if (tab === 'home') {
      setCurrentPage(isWalletConnected ? { type: 'dashboard' } : { type: 'home' });
    } else if (tab === 'markets') {
      setCurrentPage({ type: 'markets-list' });
    } else if (tab === 'creator-share') {
      setCurrentPage({ type: 'creators-list' });
    } else if (tab === 'profile') {
      setCurrentPage({ type: 'profile' });
    }
  };

  const handleConnectWallet = (walletType: string) => {
    console.log('Connecting wallet:', walletType);
    setShowTxPending(true);
    setShowConnectWallet(false);
    
    // Simulate wallet connection
    setTimeout(() => {
      setShowTxPending(false);
      setShowTxSuccess(true);
      setIsWalletConnected(true);
      
      setTimeout(() => {
        setShowTxSuccess(false);
        setCurrentPage({ type: 'dashboard' });
        setActiveNavTab('home');
      }, 2000);
    }, 2000);
  };

  const handleCreatorClick = (creatorId: string) => {
    setCurrentPage({ type: 'creator-detail', creatorId });
  };

  const handleMarketClick = (marketId: string) => {
    setCurrentPage({ type: 'market-detail', marketId });
  };

  const handleJoinAsCreator = () => {
    setCurrentPage({ type: 'join-creator' });
  };

  const handleBackToCreatorsList = () => {
    setActiveNavTab('creator-share');
    setCurrentPage({ type: 'creators-list' });
  };

  const handleBackToHome = () => {
    setActiveNavTab('home');
    setCurrentPage(isWalletConnected ? { type: 'dashboard' } : { type: 'home' });
  };

  const handleBackToMarketsList = () => {
    setActiveNavTab('markets');
    setCurrentPage({ type: 'markets-list' });
  };

  const handleBuySharesClick = (creatorId: string) => {
    // Find creator data
    const creator = creators.find(c => c.id === creatorId);
    if (creator) {
      setSelectedCreator({
        ...creator,
        currentPrice: 12.45,
        totalSupply: 1000,
      });
      setShowBuyShares(true);
    }
  };

  const handleSellSharesClick = (creatorId: string) => {
    const creator = creators.find(c => c.id === creatorId);
    if (creator) {
      setSelectedCreator({
        ...creator,
        currentPrice: 12.45,
      });
      setShowSellShares(true);
    }
  };

  const handleTradeMarketClick = (marketId: string, outcome?: 'yes' | 'no', action?: 'buy' | 'sell') => {
    const market = markets.find(m => m.id === marketId);
    if (market) {
      setSelectedMarket({
        ...market,
      });
      setShowTradeMarket(true);
    }
  };

  const handleConfirmBuyShares = (amount: number) => {
    console.log('Buying shares:', amount);
    setShowBuyShares(false);
    setShowTxPending(true);
    
    setTimeout(() => {
      setShowTxPending(false);
      setShowTxSuccess(true);
      
      setTimeout(() => {
        setShowTxSuccess(false);
      }, 2000);
    }, 2000);
  };

  const handleConfirmSellShares = (amount: number) => {
    console.log('Selling shares:', amount);
    setShowSellShares(false);
    setShowTxPending(true);
    
    setTimeout(() => {
      setShowTxPending(false);
      setShowTxSuccess(true);
      
      setTimeout(() => {
        setShowTxSuccess(false);
      }, 2000);
    }, 2000);
  };

  const handleConfirmTrade = (outcome: 'yes' | 'no', action: 'buy' | 'sell', amount: number) => {
    console.log('Trading:', { outcome, action, amount });
    setShowTradeMarket(false);
    setShowTxPending(true);
    
    setTimeout(() => {
      setShowTxPending(false);
      setShowTxSuccess(true);
      
      setTimeout(() => {
        setShowTxSuccess(false);
      }, 2000);
    }, 2000);
  };

  return (
    <MobileOnlyWrapper>
      <div className="dark min-h-screen bg-background flex flex-col">
        <div className="max-w-md lg:max-w-2xl mx-auto bg-background w-full flex flex-col min-h-screen">
          {currentPage.type !== 'landing' && (
            <Header 
              isWalletConnected={isWalletConnected}
              onConnectWallet={() => setShowConnectWallet(true)}
              onOpenNotifications={() => setCurrentPage({ type: 'notifications' })}
              onOpenSettings={() => setCurrentPage({ type: 'settings' })}
              onOpenLeaderboards={() => setCurrentPage({ type: 'leaderboards' })}
              notificationCount={3}
            />
          )}
          
          <div className="flex-1 overflow-y-auto pb-24">
          {currentPage.type === 'landing' && (
            <HomePage
              onExploreApp={() => {
                setCurrentPage({ type: 'home' });
                setActiveNavTab('home');
              }}
              onJoinAsCreator={() => setCurrentPage({ type: 'join-creator' })}
            />
          )}

          {currentPage.type === 'home' && (
            <>
              <CreatorShares 
                creators={creators}
                onCreatorClick={handleCreatorClick}
                onViewAll={() => setCurrentPage({ type: 'creators-list' })}
              />
              <Markets 
                markets={markets} 
                onMarketClick={handleMarketClick}
                onViewAll={() => setCurrentPage({ type: 'markets-list' })}
              />
            </>
          )}

          {currentPage.type === 'dashboard' && (
            <DashboardPage
              onNavigateToMarket={handleMarketClick}
              onNavigateToCreator={handleCreatorClick}
              onNavigateToDividends={() => setCurrentPage({ type: 'dividends' })}
            />
          )}

          {currentPage.type === 'dividends' && (
            <DividendsPage
              onBack={() => setCurrentPage({ type: 'dashboard' })}
            />
          )}
          
          {currentPage.type === 'markets-list' && (
            <MarketsListPage onMarketClick={handleMarketClick} />
          )}

          {currentPage.type === 'creators-list' && (
            <CreatorsListPage 
              onCreatorClick={handleCreatorClick}
              onJoinAsCreator={handleJoinAsCreator}
            />
          )}

          {currentPage.type === 'creator-detail' && (
            <CreatorDetailPage
              creatorId={currentPage.creatorId}
              onBack={handleBackToCreatorsList}
            />
          )}

          {currentPage.type === 'market-detail' && (
            <MarketDetailPage
              marketId={currentPage.marketId}
              onBack={handleBackToHome}
            />
          )}

          {currentPage.type === 'join-creator' && (
            <JoinCreatorPage 
              onBack={handleBackToCreatorsList}
              onEligibilityConfirmed={() => setCurrentPage({ type: 'creator-profile-setup' })}
            />
          )}

          {currentPage.type === 'creator-profile-setup' && (
            <CreatorProfileSetupPage
              onBack={() => setCurrentPage({ type: 'join-creator' })}
              onComplete={() => {
                // Navigate to creator dashboard after completing setup
                setCurrentPage({ type: 'creator-dashboard' });
              }}
            />
          )}

          {currentPage.type === 'profile' && (
            <ProfilePage 
              onNavigateToCreatorDashboard={() => setCurrentPage({ type: 'creator-dashboard' })}
            />
          )}

          {currentPage.type === 'notifications' && (
            <NotificationsPage
              onBack={() => setCurrentPage(isWalletConnected ? { type: 'dashboard' } : { type: 'home' })}
              onNavigateToMarket={handleMarketClick}
              onNavigateToCreator={handleCreatorClick}
            />
          )}

          {currentPage.type === 'create-market' && (
            <CreateMarketPage
              onBack={() => setCurrentPage({ type: 'creator-dashboard' })}
              onSuccess={(marketId) => {
                setCurrentPage({ type: 'market-detail', marketId });
              }}
            />
          )}

          {currentPage.type === 'creator-dashboard' && (
            <CreatorDashboardPage
              onBack={handleBackToHome}
              onCreateMarket={() => setCurrentPage({ type: 'create-market' })}
              onNavigateToMarket={handleMarketClick}
            />
          )}

          {currentPage.type === 'settings' && (
            <SettingsPage
              onBack={() => setCurrentPage(isWalletConnected ? { type: 'dashboard' } : { type: 'home' })}
              onDisconnectWallet={() => {
                setIsWalletConnected(false);
                setCurrentPage({ type: 'landing' });
                setActiveNavTab('home');
              }}
              onRestartTutorial={() => {
                resetTutorial();
                setCurrentPage({ type: 'home' });
                setActiveNavTab('home');
              }}
            />
          )}

          {currentPage.type === 'leaderboards' && (
            <LeaderboardsPage
              onBack={() => setCurrentPage(isWalletConnected ? { type: 'dashboard' } : { type: 'home' })}
              onNavigateToProfile={(userId) => {
                console.log('Navigate to user profile:', userId);
              }}
            />
          )}
          </div>
          
          {currentPage.type !== 'landing' && (
            <div className="fixed bottom-0 left-0 right-0 max-w-md lg:max-w-2xl mx-auto w-full">
              <Navigation activeTab={activeNavTab} onTabChange={handleNavTabChange} />
            </div>
          )}
        </div>

        {/* Modals */}
        <ConnectWalletModal
          isOpen={showConnectWallet}
          onClose={() => setShowConnectWallet(false)}
          onConnect={handleConnectWallet}
        />

        <WrongNetworkModal
          isOpen={showWrongNetwork}
          onClose={() => setShowWrongNetwork(false)}
          onSwitchNetwork={() => {
            console.log('Switching network...');
            setShowWrongNetwork(false);
          }}
        />

        <TransactionPendingModal
          isOpen={showTxPending}
          onClose={() => {}}
          message="Please confirm the transaction in your wallet"
        />

        <TransactionSuccessModal
          isOpen={showTxSuccess}
          onClose={() => setShowTxSuccess(false)}
          title="Transaction Successful!"
          message="Your transaction has been confirmed on the blockchain."
        />

        <TransactionFailedModal
          isOpen={showTxFailed}
          onClose={() => setShowTxFailed(false)}
          error="Transaction failed. Please try again."
          onRetry={() => setShowTxFailed(false)}
        />

        {selectedCreator && (
          <>
            <BuySharesModal
              isOpen={showBuyShares}
              onClose={() => setShowBuyShares(false)}
              creator={selectedCreator}
              onConfirm={handleConfirmBuyShares}
            />

            <SellSharesModal
              isOpen={showSellShares}
              onClose={() => setShowSellShares(false)}
              creator={selectedCreator}
              holdings={{ shares: 10, avgBuyPrice: 11.50 }}
              onConfirm={handleConfirmSellShares}
            />
          </>
        )}

        {selectedMarket && (
          <TradeMarketModal
            isOpen={showTradeMarket}
            onClose={() => setShowTradeMarket(false)}
            market={selectedMarket}
            onConfirm={handleConfirmTrade}
          />
        )}

        {/* Tutorial Overlay - Only shows for first-time users */}
        {showTutorial && currentPage.type === 'home' && (
          <TutorialOverlay
            onComplete={completeTutorial}
            onSkip={skipTutorial}
          />
        )}

        {/* Toast Notifications */}
        <Toaster />
      </div>
    </MobileOnlyWrapper>
  );
}
