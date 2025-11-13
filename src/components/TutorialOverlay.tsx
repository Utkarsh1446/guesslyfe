import { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Check, Sparkles, TrendingUp, Users, Wallet, User, MousePointer2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: any;
  spotlight?: {
    selector?: string;
    position?: 'top' | 'center' | 'bottom';
    offset?: number;
  };
}

interface TutorialOverlayProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function TutorialOverlay({ onComplete, onSkip }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<DOMRect | null>(null);

  const steps: TutorialStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Guessly! 🎉',
      description: 'Your prediction market platform where you can trade on outcomes and back your favorite creators. Let\'s show you around!',
      icon: Sparkles,
    },
    {
      id: 'connect-wallet',
      title: 'Connect Your Wallet',
      description: 'Tap the "Connect Wallet" button in the top right to get started. You\'ll need a Web3 wallet like MetaMask to trade and earn.',
      icon: Wallet,
      spotlight: {
        selector: 'button',
        position: 'top',
      },
    },
    {
      id: 'creator-shares',
      title: 'Back Creators',
      description: 'Scroll down to see trending creators. Buy shares in influencers and earn dividends from their market fees. The more successful they are, the more you earn!',
      icon: Users,
      spotlight: {
        position: 'center',
      },
    },
    {
      id: 'markets',
      title: 'Trade on Markets',
      description: 'Browse prediction markets below. Buy YES or NO positions based on what you think will happen. Trade with confidence and track your profits!',
      icon: TrendingUp,
      spotlight: {
        position: 'center',
      },
    },
    {
      id: 'navigation',
      title: 'Easy Navigation',
      description: 'Use the tabs at the bottom to explore: Home for trending, Creators to find influencers, Markets to trade, and Profile to track your portfolio.',
      icon: Users,
      spotlight: {
        position: 'bottom',
      },
    },
    {
      id: 'ready',
      title: 'You\'re All Set! 🚀',
      description: 'You now know the basics! Start by connecting your wallet, browse trending creators and markets, and begin your prediction market journey.',
      icon: Check,
    },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;
  const step = steps[currentStep];
  const StepIcon = step.icon;

  // Update spotlight position based on current step
  useEffect(() => {
    if (step.spotlight) {
      const updateSpotlight = () => {
        // Find the first button for wallet connect
        if (step.id === 'connect-wallet') {
          const button = document.querySelector('button:has(svg)');
          if (button) {
            setSpotlightRect(button.getBoundingClientRect());
            return;
          }
        }
        
        // For other spotlights, use position-based highlighting
        setSpotlightRect(null);
      };

      updateSpotlight();
      window.addEventListener('resize', updateSpotlight);
      return () => window.removeEventListener('resize', updateSpotlight);
    } else {
      setSpotlightRect(null);
    }
  }, [currentStep, step]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsExiting(true);
      setTimeout(() => {
        onComplete();
        toast.success('Tutorial completed! 🎉', {
          description: 'You\'re ready to start trading and backing creators!',
        });
      }, 300);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipNow = () => {
    setIsExiting(true);
    setTimeout(() => {
      onSkip();
    }, 300);
  };

  // Calculate spotlight area based on position
  const getSpotlightStyle = () => {
    if (!step.spotlight) return {};
    
    const { position } = step.spotlight;
    
    if (position === 'top') {
      return {
        top: '0',
        left: '0',
        right: '0',
        height: '80px',
      };
    } else if (position === 'bottom') {
      return {
        bottom: '0',
        left: '0',
        right: '0',
        height: '85px',
      };
    } else if (position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        height: '300px',
      };
    }
    
    return {};
  };

  return (
    <div className={`fixed inset-0 z-[9999] transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}>
      {/* Semi-transparent backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />

      {/* Spotlight area - brighter */}
      {step.spotlight && (
        <>
          {spotlightRect ? (
            // Specific element spotlight
            <div
              className="absolute rounded-xl border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.8)] pointer-events-none animate-pulse"
              style={{
                top: `${spotlightRect.top - 8}px`,
                left: `${spotlightRect.left - 8}px`,
                width: `${spotlightRect.width + 16}px`,
                height: `${spotlightRect.height + 16}px`,
              }}
            />
          ) : (
            // Area-based spotlight
            <div
              className="absolute rounded-2xl border-2 border-primary/50 bg-background/5 pointer-events-none animate-pulse"
              style={getSpotlightStyle()}
            />
          )}

          {/* Pointer arrow for specific elements */}
          {spotlightRect && (
            <div
              className="absolute text-primary animate-bounce pointer-events-none"
              style={{
                top: `${spotlightRect.top + spotlightRect.height + 12}px`,
                left: `${spotlightRect.left + spotlightRect.width / 2 - 12}px`,
              }}
            >
              <MousePointer2 className="w-6 h-6" />
            </div>
          )}
        </>
      )}

      {/* Tutorial Card - Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-end justify-center p-4 pointer-events-none">
        <div className="w-full max-w-md bg-card border-2 border-border rounded-2xl shadow-2xl overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 border-b border-border p-5">
            <button
              onClick={handleSkipNow}
              className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-background/50 hover:bg-background border border-border flex items-center justify-center transition-all"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>

            {/* Progress */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-primary text-xs">
                  Step {currentStep + 1} of {steps.length}
                </span>
                <span className="text-muted-foreground text-xs">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Icon & Title */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 shadow-md">
                <StepIcon className="w-6 h-6 text-primary" />
              </div>
              <h2 className="text-foreground text-lg tracking-tight">
                {step.title}
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              {step.description}
            </p>

            {/* Step Indicators */}
            <div className="flex justify-center gap-1.5 mb-4">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === currentStep
                      ? 'w-8 bg-primary'
                      : idx < currentStep
                      ? 'w-1.5 bg-primary/50'
                      : 'w-1.5 bg-secondary'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2.5 bg-secondary text-foreground rounded-xl hover:bg-accent transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              )}
              
              <button
                onClick={handleNext}
                className="flex-1 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2 group text-sm"
              >
                <span>
                  {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                </span>
                {currentStep === steps.length - 1 ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                )}
              </button>
            </div>

            {/* Skip Button */}
            <button
              onClick={handleSkipNow}
              className="w-full mt-2 px-4 py-1.5 text-muted-foreground hover:text-foreground text-xs transition-colors"
            >
              Skip Tutorial
            </button>
          </div>

          {/* Special Messages */}
          {currentStep === 0 && (
            <div className="px-5 pb-5">
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <p className="text-primary text-xs text-center">
                  💡 <strong>Tip:</strong> The UI is visible so you can see what we're explaining!
                </p>
              </div>
            </div>
          )}

          {currentStep === steps.length - 1 && (
            <div className="px-5 pb-5">
              <div className="bg-gradient-to-br from-chart-1/10 to-primary/10 border border-chart-1/20 rounded-xl p-3">
                <p className="text-foreground text-xs mb-2 text-center">
                  🎯 <strong>Quick Start Tips</strong>
                </p>
                <ul className="text-muted-foreground text-xs space-y-1">
                  <li>• Start small and learn as you go</li>
                  <li>• Diversify across creators and markets</li>
                  <li>• Check dividends regularly for passive income</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Hook to manage tutorial state
export function useTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    // Check if user has seen tutorial
    const hasSeenTutorial = localStorage.getItem('guessly_tutorial_completed');
    if (!hasSeenTutorial) {
      setIsFirstTime(true);
      // Small delay before showing tutorial
      const timer = setTimeout(() => {
        setShowTutorial(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTutorial = () => {
    localStorage.setItem('guessly_tutorial_completed', 'true');
    setShowTutorial(false);
  };

  const skipTutorial = () => {
    localStorage.setItem('guessly_tutorial_completed', 'true');
    setShowTutorial(false);
  };

  const resetTutorial = () => {
    localStorage.removeItem('guessly_tutorial_completed');
    setShowTutorial(true);
  };

  return {
    showTutorial,
    isFirstTime,
    completeTutorial,
    skipTutorial,
    resetTutorial,
  };
}
