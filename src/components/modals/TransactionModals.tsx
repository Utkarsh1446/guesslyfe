import { Loader2, CheckCircle2, XCircle, X, ExternalLink } from 'lucide-react';

// Transaction Pending Modal
interface TransactionPendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  txHash?: string;
  message?: string;
}

export function TransactionPendingModal({ 
  isOpen, 
  onClose, 
  txHash,
  message = 'Transaction is being processed...'
}: TransactionPendingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          
          <h2 className="text-foreground text-xl mb-2">Processing Transaction</h2>
          <p className="text-muted-foreground text-sm mb-6">{message}</p>
          
          <div className="bg-secondary/50 border border-border rounded-xl p-4 mb-6">
            <p className="text-muted-foreground text-xs mb-2">
              ⚠️ Don't close this window
            </p>
            <p className="text-muted-foreground text-xs">
              Your transaction is being confirmed on the blockchain. This may take a few moments.
            </p>
          </div>

          {txHash && (
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary text-sm hover:underline"
            >
              View on BaseScan
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// Transaction Success Modal
interface TransactionSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  txHash?: string;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function TransactionSuccessModal({ 
  isOpen, 
  onClose, 
  txHash,
  title = 'Transaction Successful!',
  message = 'Your transaction has been confirmed on the blockchain.',
  actionLabel,
  onAction
}: TransactionSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-end px-6 py-4 border-b border-border">
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-chart-1/10 border border-chart-1/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-chart-1" />
          </div>
          
          <h2 className="text-foreground text-xl mb-2">{title}</h2>
          <p className="text-muted-foreground text-sm mb-6">{message}</p>
          
          <div className="space-y-3">
            {actionLabel && onAction && (
              <button
                onClick={onAction}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                {actionLabel}
              </button>
            )}
            
            {txHash && (
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full px-4 py-3 bg-secondary text-foreground border border-border rounded-xl shadow-sm hover:shadow-md transition-all text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  View on BaseScan
                  <ExternalLink className="w-3 h-3" />
                </span>
              </a>
            )}
            
            <button
              onClick={onClose}
              className="w-full px-4 py-3 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Transaction Failed Modal
interface TransactionFailedModalProps {
  isOpen: boolean;
  onClose: () => void;
  error?: string;
  onRetry?: () => void;
}

export function TransactionFailedModal({ 
  isOpen, 
  onClose, 
  error = 'Transaction failed. Please try again.',
  onRetry
}: TransactionFailedModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-destructive" />
            </div>
            <h2 className="text-foreground text-lg">Transaction Failed</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 mb-6">
            <p className="text-foreground text-sm mb-2">Error</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
          
          <div className="space-y-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-xl shadow-md hover:shadow-lg transition-all"
              >
                Try Again
              </button>
            )}
            
            <button
              onClick={onClose}
              className="w-full px-4 py-3 bg-secondary text-foreground border border-border rounded-xl shadow-sm hover:shadow-md transition-all"
            >
              Close
            </button>
          </div>

          <div className="mt-6 text-center">
            <a href="#" className="text-primary text-sm hover:underline">
              Need help? Contact support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
