import { useState } from 'react';
import { X, Info, TrendingUp, TrendingDown } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface TradeMarketModalProps {
  isOpen: boolean;
  onClose: () => void;
  market: {
    id: string;
    question: string;
    image: string;
    yesPrice: number;
    noPrice: number;
  };
  initialOutcome?: 'yes' | 'no';
  initialAction?: 'buy' | 'sell';
  onConfirm: (outcome: 'yes' | 'no', action: 'buy' | 'sell', amount: number) => void;
}

export function TradeMarketModal({ 
  isOpen, 
  onClose, 
  market, 
  initialOutcome = 'yes',
  initialAction = 'buy',
  onConfirm 
}: TradeMarketModalProps) {
  const [outcome, setOutcome] = useState<'yes' | 'no'>(initialOutcome);
  const [action, setAction] = useState<'buy' | 'sell'>(initialAction);
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const amountNum = parseFloat(amount) || 0;
  const currentPrice = outcome === 'yes' ? market.yesPrice : market.noPrice;
  
  // Calculate shares based on amount in USDC
  const estimatedShares = amountNum > 0 ? Math.floor((amountNum / currentPrice) * 100) : 0;
  const tradingFee = amountNum * 0.015; // 1.5% fee
  const totalCost = action === 'buy' ? amountNum + tradingFee : amountNum - tradingFee;
  
  // Potential profit calculation
  const maxProfit = action === 'buy' 
    ? (estimatedShares * (100 - currentPrice)) / 100
    : (estimatedShares * currentPrice) / 100;

  const handleConfirm = () => {
    if (amountNum > 0) {
      setIsProcessing(true);
      onConfirm(outcome, action, amountNum);
    }
  };

  const quickAmounts = [10, 50, 100];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-foreground text-lg">Trade Market</h2>
            <p className="text-muted-foreground text-sm">Place your prediction</p>
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
          {/* Market Info */}
          <div className="flex items-start gap-3 p-3 bg-secondary/50 border border-border rounded-xl">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shadow-sm flex-shrink-0">
              <ImageWithFallback
                src={market.image}
                alt={market.question}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-foreground text-sm line-clamp-2">{market.question}</p>
            </div>
          </div>

          {/* Action Toggle (Buy/Sell) */}
          <div className="flex gap-2 p-1 bg-secondary rounded-xl">
            <button
              onClick={() => setAction('buy')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                action === 'buy'
                  ? 'bg-chart-1 text-chart-1-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              disabled={isProcessing}
            >
              Buy
            </button>
            <button
              onClick={() => setAction('sell')}
              className={`flex-1 px-4 py-2 rounded-lg transition-all ${
                action === 'sell'
                  ? 'bg-destructive text-destructive-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              disabled={isProcessing}
            >
              Sell
            </button>
          </div>

          {/* Outcome Toggle (YES/NO) */}
          <div className="flex gap-2 p-1 bg-secondary rounded-xl">
            <button
              onClick={() => setOutcome('yes')}
              className={`flex-1 px-4 py-3 rounded-lg transition-all ${
                outcome === 'yes'
                  ? 'bg-chart-1/20 border-2 border-chart-1'
                  : 'border-2 border-transparent hover:border-border'
              }`}
              disabled={isProcessing}
            >
              <div className="text-chart-1 text-xs mb-1">YES</div>
              <div className="text-foreground text-lg">{market.yesPrice}¢</div>
            </button>
            <button
              onClick={() => setOutcome('no')}
              className={`flex-1 px-4 py-3 rounded-lg transition-all ${
                outcome === 'no'
                  ? 'bg-destructive/20 border-2 border-destructive'
                  : 'border-2 border-transparent hover:border-border'
              }`}
              disabled={isProcessing}
            >
              <div className="text-destructive text-xs mb-1">NO</div>
              <div className="text-foreground text-lg">{market.noPrice}¢</div>
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-foreground text-sm mb-2">Amount (USDC)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-4 py-3 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              disabled={isProcessing}
            />
            
            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mt-2">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt.toString())}
                  className="flex-1 px-3 py-1.5 bg-secondary text-foreground border border-border rounded-lg text-sm hover:bg-accent transition-colors"
                  disabled={isProcessing}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {/* Trade Summary */}
          {amountNum > 0 && (
            <div className="bg-secondary/50 border border-border rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated Shares</span>
                <span className="text-foreground">{estimatedShares}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price per Share</span>
                <span className="text-foreground">{currentPrice}¢</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Trading Fee (1.5%)</span>
                <span className="text-destructive">${tradingFee.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-border flex justify-between">
                <span className="text-foreground">
                  {action === 'buy' ? 'Total Cost' : 'You Receive'}
                </span>
                <span className="text-foreground">${totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">Max Profit</span>
                <span className="text-chart-1">+${maxProfit.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl">
            <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              {action === 'buy' ? (
                <p>
                  You're buying {outcome.toUpperCase()} shares. If the market resolves to {outcome.toUpperCase()}, 
                  each share pays out $1.00 (100¢).
                </p>
              ) : (
                <p>
                  You're selling your {outcome.toUpperCase()} position. You'll receive the current market price 
                  minus fees.
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleConfirm}
              disabled={amountNum === 0 || isProcessing}
              className={`w-full px-4 py-3 rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                action === 'buy'
                  ? 'bg-chart-1 text-chart-1-foreground'
                  : 'bg-destructive text-destructive-foreground'
              }`}
            >
              {isProcessing ? 'Processing...' : `${action === 'buy' ? 'Buy' : 'Sell'} ${outcome.toUpperCase()} for $${amountNum || 0}`}
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
