import { useState } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { X, Calendar, DollarSign, Info, Image as ImageIcon, CheckCircle2 } from 'lucide-react';

interface CreateMarketPageProps {
  onBack?: () => void;
  onSuccess?: (marketId: string) => void;
}

type Step = 'question' | 'details' | 'resolution' | 'review';

export function CreateMarketPage({ onBack, onSuccess }: CreateMarketPageProps) {
  const [currentStep, setCurrentStep] = useState<Step>('question');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [question, setQuestion] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState('');
  const [resolutionSource, setResolutionSource] = useState('');
  const [initialLiquidity, setInitialLiquidity] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const categories = [
    'Politics',
    'Sports',
    'Business',
    'Crypto',
    'Technology',
    'Entertainment',
    'Science',
    'Other',
  ];

  const steps = [
    { id: 'question' as const, label: 'Question', completed: question.length > 0 },
    { id: 'details' as const, label: 'Details', completed: category && description && endDate },
    { id: 'resolution' as const, label: 'Resolution', completed: resolutionSource.length > 0 },
    { id: 'review' as const, label: 'Review', completed: false },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].id);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].id);
    } else if (onBack) {
      onBack();
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    
    // Simulate market creation
    setTimeout(() => {
      setIsSubmitting(false);
      if (onSuccess) {
        onSuccess('new-market-1');
      }
    }, 2000);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'question':
        return question.length >= 10;
      case 'details':
        return category.length > 0 && description.length >= 20 && endDate.length > 0;
      case 'resolution':
        return resolutionSource.length >= 10;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="bg-card border-b border-border py-4 px-5 lg:px-8 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleBack}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
          >
            ←
          </button>
          <div>
            <h1 className="text-foreground text-xl">Create Market</h1>
            <p className="text-muted-foreground text-sm">Build a prediction market</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                    index < currentStepIndex
                      ? 'bg-primary border-primary'
                      : index === currentStepIndex
                      ? 'bg-primary/20 border-primary'
                      : 'bg-secondary border-border'
                  }`}
                >
                  {index < currentStepIndex ? (
                    <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                  ) : (
                    <span
                      className={`text-xs ${
                        index === currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground mt-1 hidden sm:block">
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 transition-all ${
                    index < currentStepIndex ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 lg:px-8 mt-6">
        {/* Step: Question */}
        {currentStep === 'question' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-foreground text-lg mb-2">What's your prediction question?</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Write a clear, specific question that can be resolved with YES or NO
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-foreground text-sm mb-2">Market Question *</label>
                  <textarea
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Will Bitcoin reach $100,000 by end of 2025?"
                    className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                    rows={3}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-muted-foreground text-xs">
                      {question.length}/200 characters
                    </span>
                    {question.length >= 10 && (
                      <span className="text-chart-1 text-xs">✓ Looks good!</span>
                    )}
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="text-xs text-muted-foreground">
                      <p className="text-primary mb-2">Tips for great questions:</p>
                      <ul className="space-y-1">
                        <li>• Be specific about dates and criteria</li>
                        <li>• Make it objectively verifiable</li>
                        <li>• Avoid ambiguous language</li>
                        <li>• Focus on a single clear outcome</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-secondary/30 border border-border rounded-xl p-4">
              <h3 className="text-foreground text-sm mb-3">Example Questions:</h3>
              <div className="space-y-2">
                {[
                  'Will Tesla stock price exceed $300 by March 31, 2025?',
                  'Will the Lakers win the NBA Championship this season?',
                  'Will Ethereum reach $5,000 by December 31, 2025?',
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setQuestion(example)}
                    className="w-full text-left px-3 py-2 bg-card border border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step: Details */}
        {currentStep === 'details' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-foreground text-lg mb-2">Market Details</h2>
                <p className="text-muted-foreground text-sm">
                  Add context and settings for your market
                </p>
              </div>

              <div>
                <label className="block text-foreground text-sm mb-2">Category *</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`px-4 py-2 rounded-xl border transition-all text-sm ${
                        category === cat
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary text-foreground border-border hover:border-primary/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-foreground text-sm mb-2">Description *</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide additional context, criteria, and details about how this market will be resolved..."
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={5}
                />
                <span className="text-muted-foreground text-xs mt-1">
                  {description.length}/1000 characters
                </span>
              </div>

              <div>
                <label className="block text-foreground text-sm mb-2">Market End Date *</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-muted-foreground text-xs mt-2">
                  Trading will close at this date. You'll have 48 hours to resolve the market.
                </p>
              </div>

              <div>
                <label className="block text-foreground text-sm mb-2">
                  Market Image (Optional)
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button className="px-4 py-3 bg-secondary border border-border rounded-xl hover:bg-accent transition-colors">
                    <ImageIcon className="w-4 h-4 text-foreground" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-foreground text-sm mb-2">
                  Initial Liquidity (Optional)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="number"
                    value={initialLiquidity}
                    onChange={(e) => setInitialLiquidity(e.target.value)}
                    placeholder="100"
                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <p className="text-muted-foreground text-xs mt-2">
                  Add your own liquidity to kickstart trading. Recommended: $100+
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step: Resolution */}
        {currentStep === 'resolution' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-foreground text-lg mb-2">Resolution Criteria</h2>
                <p className="text-muted-foreground text-sm">
                  Define how this market will be resolved
                </p>
              </div>

              <div>
                <label className="block text-foreground text-sm mb-2">Resolution Source *</label>
                <textarea
                  value={resolutionSource}
                  onChange={(e) => setResolutionSource(e.target.value)}
                  placeholder="This market will resolve based on official price data from CoinMarketCap as of 11:59 PM UTC on December 31, 2025. If Bitcoin's price is $100,000 or higher, it resolves to YES."
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                  rows={6}
                />
                <p className="text-muted-foreground text-xs mt-2">
                  Clearly specify the official source that will be used for resolution
                </p>
              </div>

              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="text-destructive mb-2">Important:</p>
                    <ul className="space-y-1">
                      <li>• Specify exact sources (e.g., "CoinMarketCap", "ESPN.com")</li>
                      <li>• Include specific timestamps or dates</li>
                      <li>• Define edge cases and tie-breakers</li>
                      <li>• Markets with unclear resolution criteria may be disputed</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {currentStep === 'review' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-foreground text-lg mb-2">Review Your Market</h2>
                <p className="text-muted-foreground text-sm">
                  Double-check all details before creating
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-muted-foreground text-xs mb-1 block">QUESTION</label>
                  <p className="text-foreground">{question}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-muted-foreground text-xs mb-1 block">CATEGORY</label>
                    <p className="text-foreground">{category}</p>
                  </div>
                  <div>
                    <label className="text-muted-foreground text-xs mb-1 block">END DATE</label>
                    <p className="text-foreground">
                      {new Date(endDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground text-xs mb-1 block">DESCRIPTION</label>
                  <p className="text-foreground text-sm">{description}</p>
                </div>

                <div>
                  <label className="text-muted-foreground text-xs mb-1 block">
                    RESOLUTION SOURCE
                  </label>
                  <p className="text-foreground text-sm">{resolutionSource}</p>
                </div>

                {initialLiquidity && (
                  <div>
                    <label className="text-muted-foreground text-xs mb-1 block">
                      INITIAL LIQUIDITY
                    </label>
                    <p className="text-foreground">${initialLiquidity}</p>
                  </div>
                )}
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-muted-foreground">
                    <p className="text-primary mb-1">Market Creation Fee: 0.01 ETH</p>
                    <p>This fee covers the smart contract deployment and ensures quality markets.</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating Market...' : 'Create Market'}
            </button>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStep !== 'review' && (
          <div className="max-w-2xl mx-auto mt-6">
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="w-full px-6 py-4 bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
