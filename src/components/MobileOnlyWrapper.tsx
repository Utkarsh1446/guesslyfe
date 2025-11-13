import { ReactNode, useEffect, useState } from 'react';
import { Smartphone, Monitor } from 'lucide-react';

interface MobileOnlyWrapperProps {
  children: ReactNode;
}

const MOBILE_BREAKPOINT = 768;

export function MobileOnlyWrapper({ children }: MobileOnlyWrapperProps) {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Initial check
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Show nothing while checking (prevents flash)
  if (isMobile === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Smartphone className="w-12 h-12 text-primary mx-auto mb-4" />
        </div>
      </div>
    );
  }

  // Show desktop message on larger screens
  if (!isMobile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-6">
          {/* Icon */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl"></div>
            <div className="relative w-24 h-24 mx-auto rounded-2xl bg-card border-2 border-primary/20 flex items-center justify-center shadow-lg">
              <Smartphone className="w-12 h-12 text-primary" />
            </div>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-foreground text-3xl mb-3 tracking-tight">
              Guessly
            </h1>
            <p className="text-muted-foreground text-lg">
              Currently only available on mobile devices
            </p>
          </div>

          {/* Description */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3 text-left">
              <Smartphone className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-foreground text-sm mb-1">Mobile-First Experience</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Guessly is designed for mobile devices to provide the best trading experience on the go.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-left">
              <Monitor className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-foreground text-sm mb-1">Desktop Coming Soon</h3>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  We're working on bringing Guessly to larger screens. Stay tuned!
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-primary text-sm">
              📱 Please access Guessly from your mobile device or resize your browser window to mobile size (under 768px width)
            </p>
          </div>

          {/* Logo/Branding */}
          <div className="pt-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-muted-foreground text-xs">
                Prediction markets meet creator economy
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show app on mobile
  return <>{children}</>;
}
