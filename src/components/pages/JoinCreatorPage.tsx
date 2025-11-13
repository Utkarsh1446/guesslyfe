import { useState } from 'react';
import { ArrowLeft, Twitter, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface JoinCreatorPageProps {
  onBack: () => void;
  onEligibilityConfirmed: () => void;
}

type EligibilityState = 'initial' | 'checking' | 'eligible' | 'not-eligible';

export function JoinCreatorPage({ onBack, onEligibilityConfirmed }: JoinCreatorPageProps) {
  const [eligibilityState, setEligibilityState] = useState<EligibilityState>('initial');

  const handleConnectX = () => {
    setEligibilityState('checking');
    
    // Simulate API check
    setTimeout(() => {
      // Randomly determine eligibility for demo
      const isEligible = Math.random() > 0.5;
      setEligibilityState(isEligible ? 'eligible' : 'not-eligible');
    }, 2000);
  };

  return (
    <div className="min-h-screen pb-24 bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-5 lg:px-8 py-3.5 shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[14px]">Back</span>
        </button>
      </div>

      <div className="px-5 lg:px-8 pt-6 pb-8 max-w-xl mx-auto">
        {/* Initial State */}
        {eligibilityState === 'initial' && (
          <div className="max-w-sm mx-auto text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-md">
              <Twitter className="w-10 h-10 text-primary" />
            </div>
            
            <div>
              <h1 className="text-foreground text-2xl tracking-tight mb-3">Join as Creator</h1>
              <p className="text-muted-foreground text-[14px] leading-relaxed">
                Connect your X (Twitter) account to verify your eligibility and start earning from your creator shares.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-3 text-left shadow-md">
              <h3 className="text-foreground text-[14px]">Eligibility Requirements</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-muted-foreground text-[13px]">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Minimum 10,000 followers on X</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground text-[13px]">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Account older than 6 months</span>
                </li>
                <li className="flex items-start gap-2 text-muted-foreground text-[13px]">
                  <span className="text-primary mt-0.5">•</span>
                  <span>Active engagement history</span>
                </li>
              </ul>
            </div>

            <button
              onClick={handleConnectX}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3.5 rounded-xl transition-all text-sm shadow-sm"
            >
              <Twitter className="w-4 h-4" />
              <span>Connect X Account</span>
            </button>

            <p className="text-muted-foreground text-[12px]">
              We'll only use your X account to verify eligibility. We will never post without your permission.
            </p>
          </div>
        )}

        {/* Checking State */}
        {eligibilityState === 'checking' && (
          <div className="max-w-sm mx-auto text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-md">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            
            <div>
              <h1 className="text-foreground text-2xl tracking-tight mb-3">Checking Eligibility</h1>
              <p className="text-muted-foreground text-[14px]">
                Please wait while we verify your X account...
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-3 shadow-md">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-muted-foreground text-[13px]">Verifying account age...</span>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-muted-foreground text-[13px]">Checking follower count...</span>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
                <span className="text-muted-foreground text-[13px]">Analyzing engagement...</span>
              </div>
            </div>
          </div>
        )}

        {/* Eligible State */}
        {eligibilityState === 'eligible' && (
          <div className="max-w-sm mx-auto text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-chart-1/10 border border-chart-1/20 flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-10 h-10 text-chart-1" />
            </div>
            
            <div>
              <h1 className="text-foreground text-2xl tracking-tight mb-3">You're Eligible! 🎉</h1>
              <p className="text-muted-foreground text-[14px] leading-relaxed">
                Congratulations! Your account meets all the requirements. Complete your profile to start earning.
              </p>
            </div>

            <div className="bg-chart-1/10 border border-chart-1/20 rounded-xl p-5 space-y-3 text-left shadow-md">
              <h3 className="text-chart-1 text-[14px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verification Complete</span>
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-foreground/80 text-[13px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-chart-1" />
                  <span>32,451 followers</span>
                </li>
                <li className="flex items-center gap-2 text-foreground/80 text-[13px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-chart-1" />
                  <span>Account created 2 years ago</span>
                </li>
                <li className="flex items-center gap-2 text-foreground/80 text-[13px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-chart-1" />
                  <span>High engagement rate: 4.2%</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <button 
                onClick={onEligibilityConfirmed}
                className="w-full bg-chart-1 hover:bg-chart-1/90 text-chart-1-foreground px-6 py-3.5 rounded-xl transition-all text-sm shadow-sm"
              >
                Complete Profile Setup
              </button>
              <button
                onClick={onBack}
                className="w-full bg-card hover:bg-accent border border-border text-foreground px-6 py-3 rounded-xl transition-all text-sm shadow-sm"
              >
                Back to Creators
              </button>
            </div>
          </div>
        )}

        {/* Not Eligible State */}
        {eligibilityState === 'not-eligible' && (
          <div className="max-w-sm mx-auto text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center shadow-md">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            
            <div>
              <h1 className="text-foreground text-2xl tracking-tight mb-3">Not Eligible Yet</h1>
              <p className="text-muted-foreground text-[14px] leading-relaxed">
                Your account doesn't meet all the requirements at this time. Keep growing your presence!
              </p>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-5 space-y-3 text-left shadow-md">
              <h3 className="text-destructive text-[14px] flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                <span>Requirements Not Met</span>
              </h3>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-foreground/80 text-[13px]">
                  <XCircle className="w-3.5 h-3.5 text-destructive" />
                  <span>8,234 followers (need 10,000)</span>
                </li>
                <li className="flex items-center gap-2 text-foreground/80 text-[13px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-chart-1" />
                  <span>Account created 8 months ago</span>
                </li>
                <li className="flex items-center gap-2 text-foreground/80 text-[13px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-chart-1" />
                  <span>Good engagement rate: 3.1%</span>
                </li>
              </ul>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 text-left shadow-md">
              <h3 className="text-foreground text-[14px] mb-2">What You Can Do</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                Continue building your X presence. You're only 1,766 followers away! Check back once you've reached the threshold.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setEligibilityState('initial')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3.5 rounded-xl transition-all text-sm shadow-sm"
              >
                Try Different Account
              </button>
              <button
                onClick={onBack}
                className="w-full bg-card hover:bg-accent border border-border text-foreground px-6 py-3 rounded-xl transition-all text-sm shadow-sm"
              >
                Back to Creators
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
