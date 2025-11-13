import { useState } from 'react';
import { X, TrendingUp, Info } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface BuySharesModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: {
    id: string;
    name: string;
    image: string;
    currentPrice: number;
    totalSupply: number;
  };
  onConfirm: (amount: number) => void;
}

export function BuySharesModal({ isOpen, onClose, creator, onConfirm }: BuySharesModalProps) {
  const [shares, setShares] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const sharesNum = parseFloat(shares) || 0;
  
  // Simulate bonding curve pricing
  const calculatePrice = (numShares: number) => {
    if (numShares === 0) return 0;
    const avgPrice = creator.currentPrice + (numShares * 0.05); // Price increases with quantity
    return numShares * avgPrice;
  };

  const totalCost = calculatePrice(sharesNum);
  const avgPrice = sharesNum > 0 ? totalCost / sharesNum : creator.currentPrice;
  const priceImpact = sharesNum > 0 ? ((avgPrice - creator.currentPrice) / creator.currentPrice) * 100 : 0;

  const handleConfirm = () => {
    if (sharesNum > 0) {
      setIsProcessing(true);
      onConfirm(sharesNum);
    }
  };

  const quickAmounts = [10, 50, 100];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-foreground text-lg">Buy Shares</h2>
            <p className="text-muted-foreground text-sm">Purchase creator shares</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
            disabled={isProcessing}
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Creator Info */}
          <div className="flex items-center gap-3 p-3 bg-secondary/50 border border-border rounded-xl">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shadow-sm">
              <ImageWithFallback
                src={creator.image}
                alt={creator.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-foreground">{creator.name}</h3>
              <p className="text-muted-foreground text-sm">Current price: ${creator.currentPrice.toFixed(2)}</p>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-foreground text-sm mb-2">Number of Shares</label>
            <input
              type="number"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="0"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={isProcessing}
            />
            
            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mt-2">
              {quickAmounts.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setShares(amount.toString())}
                  className="flex-1 px-3 py-1.5 bg-secondary text-foreground border border-border rounded-lg text-sm hover:bg-accent transition-colors"
                  disabled={isProcessing}
                >
                  {amount}
                </button>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          {sharesNum > 0 && (
            <div className="bg-secondary/50 border border-border rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shares</span>
                <span className="text-foreground">{sharesNum}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Average Price</span>
                <span className="text-foreground">${avgPrice.toFixed(2)}</span>
              </div>
              {priceImpact > 0.1 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price Impact</span>
                  <span className="text-destructive">+{priceImpact.toFixed(2)}%</span>
                </div>
              )}
              <div className="pt-2 border-t border-border flex justify-between">
                <span className="text-foreground">Total Cost</span>
                <span className="text-foreground">${totalCost.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Fee Info */}
          <div className="flex items-start gap-2 p-3 bg-chart-1/5 border border-chart-1/20 rounded-xl">
            <Info className="w-4 h-4 text-chart-1 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="text-chart-1 mb-1">No fees when buying shares!</p>
              <p>Only 5% fee applies when selling (2.5% to platform, 2.5% to shareholders)</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleConfirm}
              disabled={sharesNum === 0 || isProcessing}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : `Buy ${sharesNum || 0} Shares`}
            </button>
            
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="w-full px-4 py-3 bg-secondary text-foreground border border-border rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
