import { useState } from 'react';
import { ArrowLeft, Upload, Camera, CheckCircle2, ArrowRight } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface CreatorProfileSetupPageProps {
  onBack: () => void;
  onComplete: () => void;
}

type SetupStep = 'bio' | 'avatar' | 'categories' | 'review';

export function CreatorProfileSetupPage({ onBack, onComplete }: CreatorProfileSetupPageProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('bio');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const categories = [
    'Politics', 'Sports', 'Technology', 'Business', 'Entertainment',
    'Crypto', 'Science', 'Health', 'Gaming', 'Finance'
  ];

  const steps: SetupStep[] = ['bio', 'avatar', 'categories', 'review'];
  const stepIndex = steps.indexOf(currentStep);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case 'bio':
        return displayName.length >= 2 && bio.length >= 20;
      case 'avatar':
        return avatarUrl.length > 0;
      case 'categories':
        return selectedCategories.length > 0;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
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

      {/* Progress Bar */}
      <div className="bg-card border-b border-border px-5 lg:px-8 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-foreground text-sm">
              Step {stepIndex + 1} of {steps.length}
            </span>
            <span className="text-muted-foreground text-xs">
              {Math.round(progress)}% complete
            </span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="px-5 lg:px-8 pt-8 pb-8 max-w-2xl mx-auto">
        {/* Bio Step */}
        {currentStep === 'bio' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-foreground text-2xl tracking-tight mb-2">Tell us about yourself</h1>
              <p className="text-muted-foreground text-sm">
                This information will be displayed on your creator profile
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-foreground text-sm mb-2">
                  Display Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name or alias"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <p className="text-muted-foreground text-xs mt-1">
                  {displayName.length}/50 characters
                </p>
              </div>

              <div>
                <label className="block text-foreground text-sm mb-2">
                  Bio <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell people what makes you unique as a creator..."
                  rows={6}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                />
                <p className="text-muted-foreground text-xs mt-1">
                  {bio.length}/500 characters (minimum 20)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Avatar Step */}
        {currentStep === 'avatar' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-foreground text-2xl tracking-tight mb-2">Choose your profile picture</h1>
              <p className="text-muted-foreground text-sm">
                This will be shown across Guessly
              </p>
            </div>

            <div className="max-w-sm mx-auto space-y-6">
              {/* Avatar Preview */}
              <div className="flex justify-center">
                <div className="relative">
                  {avatarUrl ? (
                    <div className="w-32 h-32 rounded-2xl overflow-hidden border-4 border-primary/20 shadow-lg">
                      <ImageWithFallback
                        src={avatarUrl}
                        alt="Profile preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-2xl bg-secondary border-4 border-border flex items-center justify-center">
                      <Camera className="w-12 h-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-foreground text-sm mb-2">
                  Image URL <span className="text-destructive">*</span>
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/your-avatar.jpg"
                  className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>

              {/* Quick Options */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                <p className="text-primary text-xs mb-3">Quick preview options:</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
                  ].map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAvatarUrl(url)}
                      className="w-12 h-12 rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                    >
                      <ImageWithFallback
                        src={url}
                        alt={`Option ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Categories Step */}
        {currentStep === 'categories' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-foreground text-2xl tracking-tight mb-2">Select your categories</h1>
              <p className="text-muted-foreground text-sm">
                Choose the topics you'll create markets about
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-4 py-3 rounded-xl border-2 transition-all text-sm ${
                    selectedCategories.includes(category)
                      ? 'bg-primary/10 border-primary text-primary shadow-md'
                      : 'bg-card border-border text-foreground hover:border-primary/50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="bg-secondary/50 border border-border rounded-xl p-4 text-center">
              <p className="text-muted-foreground text-sm">
                {selectedCategories.length === 0 
                  ? 'Select at least one category to continue'
                  : `${selectedCategories.length} ${selectedCategories.length === 1 ? 'category' : 'categories'} selected`
                }
              </p>
            </div>
          </div>
        )}

        {/* Review Step */}
        {currentStep === 'review' && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-chart-1/10 border border-chart-1/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-chart-1" />
              </div>
              <h1 className="text-foreground text-2xl tracking-tight mb-2">Review your profile</h1>
              <p className="text-muted-foreground text-sm">
                Make sure everything looks good before submitting
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6 shadow-md space-y-6">
              {/* Avatar & Name */}
              <div className="flex items-center gap-4 pb-6 border-b border-border">
                <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-border shadow-sm">
                  <ImageWithFallback
                    src={avatarUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-foreground text-lg mb-1">{displayName}</h3>
                  <p className="text-muted-foreground text-sm">@{displayName.toLowerCase().replace(/\s+/g, '')}</p>
                </div>
              </div>

              {/* Bio */}
              <div>
                <h4 className="text-foreground text-sm mb-2">Bio</h4>
                <p className="text-muted-foreground text-sm leading-relaxed">{bio}</p>
              </div>

              {/* Categories */}
              <div>
                <h4 className="text-foreground text-sm mb-3">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map((category) => (
                    <span
                      key={category}
                      className="px-3 py-1 bg-primary/10 text-primary text-xs rounded-lg border border-primary/20"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <p className="text-primary text-sm">
                ✓ Once you submit, your creator profile will be live and people can start buying your shares!
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {stepIndex > 0 && (
            <button
              onClick={handlePrevious}
              className="px-6 py-3 bg-card border border-border text-foreground rounded-xl hover:bg-accent transition-all"
            >
              Previous
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex-1 px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
              canProceed()
                ? 'bg-primary text-primary-foreground shadow-md hover:shadow-lg'
                : 'bg-secondary text-muted-foreground cursor-not-allowed'
            }`}
          >
            <span>{currentStep === 'review' ? 'Complete Setup' : 'Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
