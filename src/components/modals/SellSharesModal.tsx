import { useState } from 'react';
import { X, AlertTriangle, TrendingDown } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface SellSharesModalProps {
  isOpen: boolean;
  onClose: () => void;
  creator: {
    id: string;
    name: string;
    image: string;
    currentPrice: number;
  };
  holdings: {
    shares: number;
    avgBuyPrice: number;
  };
  onConfirm: (amount: number) => void;
}

export function SellSharesModal({ isOpen, onClose, creator, holdings, onConfirm }: SellSharesModalProps) {
  const [shares, setShares] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const sharesNum = parseFloat(shares) || 0;
  
  // Simulate bonding curve pricing (price decreases when selling)
  const calculateProceeds = (numShares: number) => {
    if (numShares === 0) return 0;
    const avgPrice = creator.currentPrice - (numShares * 0.05); // Price decreases with quantity
    return numShares * Math.max(avgPrice, 0.01); // Minimum price of $0.01
  };

  const grossProceeds = calculateProceeds(sharesNum);
  const platformFee = grossProceeds * 0.025; // 2.5%
  const shareholderFee = grossProceeds * 0.025; // 2.5%
  const totalFees = platformFee + shareholderFee;
  const netProceeds = grossProceeds - totalFees;
  
  const profitLoss = netProceeds - (sharesNum * holdings.avgBuyPrice);
  const profitLossPercent = sharesNum > 0 ? (profitLoss / (sharesNum * holdings.avgBuyPrice)) * 100 : 0;

  const handleConfirm = () => {
    if (sharesNum > 0 && sharesNum <= holdings.shares) {
      setIsProcessing(true);
      onConfirm(sharesNum);
    }
  };

  const quickPercentages = [25, 50, 100];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-foreground text-lg">Sell Shares</h2>
            <p className="text-muted-foreground text-sm">You own {holdings.shares} shares</p>
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

          {/* Holdings Info */}
          <div className="bg-secondary/50 border border-border rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Your Shares</div>
                <div className="text-foreground">{holdings.shares}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Avg. Buy Price</div>
                <div className="text-foreground">${holdings.avgBuyPrice.toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-foreground text-sm mb-2">Number of Shares to Sell</label>
            <input
              type="number"
              value={shares}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0;
                if (val <= holdings.shares) {
                  setShares(e.target.value);
                }
              }}
              placeholder="0"
              max={holdings.shares}
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={isProcessing}
            />
            
            {/* Quick Percentage Buttons */}
            <div className="flex gap-2 mt-2">
              {quickPercentages.map((percent) => (
                <button
                  key={percent}
                  onClick={() => {
                    const amount = (holdings.shares * percent) / 100;
                    setShares(amount.toString());
                  }}
                  className="flex-1 px-3 py-1.5 bg-secondary text-foreground border border-border rounded-lg text-sm hover:bg-accent transition-colors"
                  disabled={isProcessing}
                >
                  {percent}%
                </button>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          {sharesNum > 0 && (
            <div className="bg-secondary/50 border border-border rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gross Proceeds</span>
                <span className="text-foreground">${grossProceeds.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee (2.5%)</span>
                <span className="text-destructive">-${platformFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shareholder Fee (2.5%)</span>
                <span className="text-destructive">-${shareholderFee.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between">
                <span className="text-foreground">Net Proceeds</span>
                <span className="text-foreground">${netProceeds.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">Profit/Loss</span>
                <span className={profitLoss >= 0 ? 'text-chart-1' : 'text-destructive'}>
                  {profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)} ({profitLoss >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}

          {/* Fee Warning */}
          <div className="flex items-start gap-2 p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="text-destructive mb-1">5% total fee applies when selling</p>
              <p>2.5% goes to platform, 2.5% distributed to all shareholders as dividends</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleConfirm}
              disabled={sharesNum === 0 || sharesNum > holdings.shares || isProcessing}
              className="w-full px-4 py-3 bg-destructive text-destructive-foreground rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? 'Processing...' : `Sell ${sharesNum || 0} Shares`}
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
