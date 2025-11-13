import { X, Wallet, ExternalLink } from 'lucide-react';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (wallet: string) => void;
}

export function ConnectWalletModal({ isOpen, onClose, onConnect }: ConnectWalletModalProps) {
  if (!isOpen) return null;

  const wallets = [
    {
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect using MetaMask',
      id: 'metamask',
    },
    {
      name: 'Coinbase Wallet',
      icon: '🔵',
      description: 'Connect using Coinbase',
      id: 'coinbase',
    },
    {
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Scan with mobile wallet',
      id: 'walletconnect',
    },
    {
      name: 'Rainbow',
      icon: '🌈',
      description: 'Connect using Rainbow',
      id: 'rainbow',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-foreground text-lg">Connect Wallet</h2>
            <p className="text-muted-foreground text-sm">Choose your preferred wallet</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Wallet Options */}
        <div className="p-6 space-y-3">
          {wallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => onConnect(wallet.id)}
              className="w-full bg-secondary hover:bg-accent border border-border rounded-xl p-4 transition-all flex items-center gap-4 text-left shadow-sm hover:shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center text-2xl">
                {wallet.icon}
              </div>
              <div className="flex-1">
                <div className="text-foreground">{wallet.name}</div>
                <div className="text-muted-foreground text-sm">{wallet.description}</div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-secondary/30 border-t border-border">
          <div className="flex items-start gap-2">
            <Wallet className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-muted-foreground text-xs">
              <p className="mb-1">
                By connecting your wallet, you agree to our Terms of Service and Privacy Policy.
              </p>
              <p>
                New to Web3 wallets?{' '}
                <a href="#" className="text-primary hover:underline">
                  Learn more
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
