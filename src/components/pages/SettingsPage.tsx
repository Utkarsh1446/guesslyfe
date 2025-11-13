import { useState } from 'react';
import { Bell, Globe, Shield, User, Wallet, Moon, Sun, Twitter, LogOut, ChevronRight, Check, GraduationCap } from 'lucide-react';

interface SettingsPageProps {
  onBack?: () => void;
  onDisconnectWallet?: () => void;
  onRestartTutorial?: () => void;
}

export function SettingsPage({ onBack, onDisconnectWallet, onRestartTutorial }: SettingsPageProps) {
  const [notifications, setNotifications] = useState({
    markets: true,
    dividends: true,
    social: true,
    priceAlerts: false,
    newsletter: true,
  });

  const [privacy, setPrivacy] = useState({
    showActivity: true,
    showPortfolio: false,
    allowMessages: true,
  });

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const userProfile = {
    address: '0x742d...5f3a',
    walletType: 'MetaMask',
    connectedDate: 'Jan 15, 2025',
    twitter: '@cryptotrader',
    isCreator: true,
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="bg-card border-b border-border py-4 px-5 lg:px-8 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-lg hover:bg-accent flex items-center justify-center transition-colors"
            >
              ←
            </button>
          )}
          <div>
            <h1 className="text-foreground text-xl">Settings</h1>
            <p className="text-muted-foreground text-sm">Manage your preferences</p>
          </div>
        </div>
      </div>

      <div className="px-5 lg:px-8 space-y-6 mt-6">
        {/* Account Section */}
        <div>
          <h2 className="text-foreground mb-4">Account</h2>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-foreground mb-1">Wallet Address</div>
                    <div className="text-muted-foreground text-sm">{userProfile.address}</div>
                  </div>
                </div>
                <div className="px-3 py-1 bg-chart-1/10 text-chart-1 rounded-lg text-xs border border-chart-1/20">
                  Connected
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{userProfile.walletType}</span>
                <span>•</span>
                <span>Connected {userProfile.connectedDate}</span>
              </div>
            </div>

            {userProfile.twitter && (
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Twitter className="w-5 h-5 text-[#1DA1F2]" />
                  <div>
                    <div className="text-foreground text-sm">Twitter</div>
                    <div className="text-muted-foreground text-xs">{userProfile.twitter}</div>
                  </div>
                </div>
                <div className="px-2 py-1 bg-chart-1/10 text-chart-1 rounded-lg text-xs border border-chart-1/20 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Verified
                </div>
              </div>
            )}

            <button className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="text-foreground text-sm">Edit Profile</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Notifications Section */}
        <div>
          <h2 className="text-foreground mb-4">Notifications</h2>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {[
              { key: 'markets', label: 'Market Updates', desc: 'Market resolutions and closures' },
              { key: 'dividends', label: 'Dividend Alerts', desc: 'When dividends are ready to claim' },
              { key: 'social', label: 'Social Activity', desc: 'Followers and creator updates' },
              { key: 'priceAlerts', label: 'Price Alerts', desc: 'Significant price movements' },
              { key: 'newsletter', label: 'Weekly Newsletter', desc: 'Market insights and trends' },
            ].map((item, index) => (
              <div
                key={item.key}
                className={`p-4 flex items-center justify-between ${
                  index > 0 ? 'border-t border-border' : ''
                }`}
              >
                <div>
                  <div className="text-foreground text-sm mb-1">{item.label}</div>
                  <div className="text-muted-foreground text-xs">{item.desc}</div>
                </div>
                <button
                  onClick={() =>
                    setNotifications({
                      ...notifications,
                      [item.key]: !notifications[item.key as keyof typeof notifications],
                    })
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    notifications[item.key as keyof typeof notifications]
                      ? 'bg-primary'
                      : 'bg-secondary'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                      notifications[item.key as keyof typeof notifications]
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Section */}
        <div>
          <h2 className="text-foreground mb-4">Privacy</h2>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {[
              {
                key: 'showActivity',
                label: 'Show Activity',
                desc: 'Let others see your trading activity',
              },
              {
                key: 'showPortfolio',
                label: 'Public Portfolio',
                desc: 'Display your holdings publicly',
              },
              {
                key: 'allowMessages',
                label: 'Allow Messages',
                desc: 'Receive messages from other users',
              },
            ].map((item, index) => (
              <div
                key={item.key}
                className={`p-4 flex items-center justify-between ${
                  index > 0 ? 'border-t border-border' : ''
                }`}
              >
                <div>
                  <div className="text-foreground text-sm mb-1">{item.label}</div>
                  <div className="text-muted-foreground text-xs">{item.desc}</div>
                </div>
                <button
                  onClick={() =>
                    setPrivacy({
                      ...privacy,
                      [item.key]: !privacy[item.key as keyof typeof privacy],
                    })
                  }
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    privacy[item.key as keyof typeof privacy] ? 'bg-primary' : 'bg-secondary'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                      privacy[item.key as keyof typeof privacy]
                        ? 'translate-x-5'
                        : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Appearance Section */}
        <div>
          <h2 className="text-foreground mb-4">Appearance</h2>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="text-foreground text-sm mb-3">Theme</div>
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 p-3 rounded-xl border transition-all ${
                    theme === 'dark'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-secondary border-border text-foreground hover:border-primary/50'
                  }`}
                >
                  <Moon className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-xs">Dark</div>
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 p-3 rounded-xl border transition-all ${
                    theme === 'light'
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-secondary border-border text-foreground hover:border-primary/50'
                  }`}
                >
                  <Sun className="w-5 h-5 mx-auto mb-1" />
                  <div className="text-xs">Light</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Help & Support Section */}
        <div>
          <h2 className="text-foreground mb-4">Help & Support</h2>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            {onRestartTutorial && (
              <button 
                onClick={onRestartTutorial}
                className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors border-b border-border"
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <div className="text-foreground text-sm">Restart Tutorial</div>
                    <div className="text-muted-foreground text-xs">Learn how to use Guessly</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* About Section */}
        <div>
          <h2 className="text-foreground mb-4">About</h2>
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <button className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors border-b border-border">
              <span className="text-foreground text-sm">Terms of Service</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors border-b border-border">
              <span className="text-foreground text-sm">Privacy Policy</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button className="w-full p-4 flex items-center justify-between hover:bg-accent transition-colors border-b border-border">
              <span className="text-foreground text-sm">Help & Support</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="p-4 text-center text-muted-foreground text-xs">
              Version 1.0.0 • Built on Base
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div>
          <h2 className="text-destructive mb-4">Danger Zone</h2>
          <div className="bg-card border border-destructive/20 rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={onDisconnectWallet}
              className="w-full p-4 flex items-center justify-between hover:bg-destructive/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5 text-destructive" />
                <span className="text-destructive text-sm">Disconnect Wallet</span>
              </div>
              <ChevronRight className="w-4 h-4 text-destructive" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
