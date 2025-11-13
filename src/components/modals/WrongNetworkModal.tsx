import { AlertTriangle, X } from 'lucide-react';

interface WrongNetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchNetwork: () => void;
  currentNetwork?: string;
}

export function WrongNetworkModal({ 
  isOpen, 
  onClose, 
  onSwitchNetwork,
  currentNetwork = 'Ethereum Mainnet' 
}: WrongNetworkModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-destructive" />
            </div>
            <h2 className="text-foreground text-lg">Wrong Network</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 mb-6">
            <p className="text-foreground text-sm mb-2">
              You're currently connected to <span className="text-destructive">{currentNetwork}</span>
            </p>
            <p className="text-muted-foreground text-sm">
              Guessly only works on Base network. Please switch your network to continue.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={onSwitchNetwork}
              className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              Switch to Base Network
            </button>
            
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-secondary text-foreground border border-border rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              Cancel
            </button>
          </div>

          {/* Manual Instructions */}
          <div className="mt-6 p-4 bg-secondary/50 border border-border rounded-xl">
            <h3 className="text-foreground text-sm mb-3">Manual Setup</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Network Name: Base</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Chain ID: 8453</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary">•</span>
                <span>RPC URL: https://mainnet.base.org</span>
              </div>
              <div className="flex gap-2">
                <span className="text-primary">•</span>
                <span>Currency: ETH</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
