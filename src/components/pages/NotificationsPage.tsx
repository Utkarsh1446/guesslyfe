import { useState } from 'react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Bell, Filter, CheckCircle2, TrendingUp, DollarSign, Users, Trophy, Clock, Check } from 'lucide-react';

interface NotificationsPageProps {
  onBack?: () => void;
  onNavigateToMarket?: (marketId: string) => void;
  onNavigateToCreator?: (creatorId: string) => void;
}

type NotificationType = 'all' | 'markets' | 'dividends' | 'social' | 'system';

export function NotificationsPage({ onBack, onNavigateToMarket, onNavigateToCreator }: NotificationsPageProps) {
  const [selectedFilter, setSelectedFilter] = useState<NotificationType>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const filters = [
    { id: 'all' as const, label: 'All', icon: Bell },
    { id: 'markets' as const, label: 'Markets', icon: TrendingUp },
    { id: 'dividends' as const, label: 'Dividends', icon: DollarSign },
    { id: 'social' as const, label: 'Social', icon: Users },
    { id: 'system' as const, label: 'System', icon: Trophy },
  ];

  const notifications = [
    {
      id: '1',
      type: 'markets' as const,
      title: 'Market Resolved - You Won! 🎉',
      message: 'Bitcoin $100K by 2025 resolved to YES',
      detail: 'You earned $54.00 from your position',
      time: '5m ago',
      read: false,
      image: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=400&fit=crop',
      marketId: '1',
      amount: '+$54.00',
      amountPositive: true,
    },
    {
      id: '2',
      type: 'dividends' as const,
      title: 'Dividends Available',
      message: 'New dividends from Sarah Chen shares',
      detail: '$2.34 ready to claim',
      time: '2h ago',
      read: false,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      creatorId: '1',
      amount: '+$2.34',
      amountPositive: true,
    },
    {
      id: '3',
      type: 'markets' as const,
      title: 'Price Alert Triggered',
      message: 'Tesla stock exceeds $300 in Q1',
      detail: 'YES price dropped to 35¢ (-5%)',
      time: '4h ago',
      read: true,
      image: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=400&h=400&fit=crop',
      marketId: '2',
    },
    {
      id: '4',
      type: 'social' as const,
      title: 'New Creator Followed You',
      message: 'Alex Rivera started following you',
      detail: 'Check out their markets',
      time: '6h ago',
      read: true,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
      creatorId: '2',
    },
    {
      id: '5',
      type: 'markets' as const,
      title: 'Market Closing Soon',
      message: 'Presidential Election 2024',
      detail: 'Closes in 24 hours - Last chance to trade',
      time: '8h ago',
      read: true,
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop',
      marketId: '3',
    },
    {
      id: '6',
      type: 'social' as const,
      title: 'New Market Created',
      message: 'Sarah Chen created a new market',
      detail: 'AI regulation in 2025',
      time: '12h ago',
      read: true,
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
      creatorId: '1',
      marketId: '4',
    },
    {
      id: '7',
      type: 'dividends' as const,
      title: 'Dividend Payout Successful',
      message: 'You claimed $12.45 in dividends',
      detail: 'Transaction confirmed on Base',
      time: '1d ago',
      read: true,
      amount: '+$12.45',
      amountPositive: true,
    },
    {
      id: '8',
      type: 'system' as const,
      title: 'Achievement Unlocked',
      message: 'Early Adopter Badge',
      detail: 'You\'re among the first 1000 traders!',
      time: '1d ago',
      read: true,
    },
    {
      id: '9',
      type: 'markets' as const,
      title: 'Market Resolved - You Lost',
      message: 'NFL Super Bowl Winner resolved to NO',
      detail: 'Better luck next time!',
      time: '2d ago',
      read: true,
      image: 'https://images.unsplash.com/photo-1636007613585-48b105cfe3be?w=400&h=400&fit=crop',
      marketId: '5',
      amount: '-$25.00',
      amountPositive: false,
    },
    {
      id: '10',
      type: 'system' as const,
      title: 'Weekly Summary Available',
      message: 'Your trading performance this week',
      detail: '+$124.50 profit across 8 markets',
      time: '3d ago',
      read: true,
    },
  ];

  const filteredNotifications = notifications.filter(notif => {
    if (showUnreadOnly && notif.read) return false;
    if (selectedFilter === 'all') return true;
    return notif.type === selectedFilter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    console.log('Mark all as read');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'markets':
        return TrendingUp;
      case 'dividends':
        return DollarSign;
      case 'social':
        return Users;
      case 'system':
        return Trophy;
      default:
        return Bell;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      {/* Header */}
      <div className="bg-card border-b border-border py-4 px-5 lg:px-8 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between mb-1">
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
              <h1 className="text-foreground text-xl">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-muted-foreground text-sm">{unreadCount} unread</p>
              )}
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-primary text-sm hover:underline flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="px-5 lg:px-8 space-y-4 mt-6">
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isActive = selectedFilter === filter.id;
            return (
              <button
                key={filter.id}
                onClick={() => setSelectedFilter(filter.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-card text-foreground border-border hover:border-primary/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* Unread Toggle */}
        <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground text-sm">Show unread only</span>
          </div>
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              showUnreadOnly ? 'bg-primary' : 'bg-secondary'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                showUnreadOnly ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-foreground mb-2">No notifications</h3>
            <p className="text-muted-foreground text-sm">
              {showUnreadOnly
                ? 'You\'re all caught up!'
                : 'You don\'t have any notifications yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              return (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (notification.marketId && onNavigateToMarket) {
                      onNavigateToMarket(notification.marketId);
                    } else if (notification.creatorId && onNavigateToCreator) {
                      onNavigateToCreator(notification.creatorId);
                    }
                  }}
                  className={`bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer relative ${
                    !notification.read ? 'border-primary/50 bg-primary/5' : ''
                  }`}
                >
                  {!notification.read && (
                    <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full" />
                  )}

                  <div className="flex items-start gap-3">
                    {notification.image ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-border shadow-sm flex-shrink-0">
                        <ImageWithFallback
                          src={notification.image}
                          alt={notification.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        notification.type === 'markets' ? 'bg-chart-1/10 border border-chart-1/20' :
                        notification.type === 'dividends' ? 'bg-primary/10 border border-primary/20' :
                        notification.type === 'social' ? 'bg-chart-2/10 border border-chart-2/20' :
                        'bg-foreground/10 border border-foreground/20'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          notification.type === 'markets' ? 'text-chart-1' :
                          notification.type === 'dividends' ? 'text-primary' :
                          notification.type === 'social' ? 'text-chart-2' :
                          'text-foreground'
                        }`} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-foreground text-sm">{notification.title}</h3>
                        {notification.amount && (
                          <span className={`text-sm flex-shrink-0 ${
                            notification.amountPositive ? 'text-chart-1' : 'text-destructive'
                          }`}>
                            {notification.amount}
                          </span>
                        )}
                      </div>
                      <p className="text-foreground text-sm mb-1">{notification.message}</p>
                      <p className="text-muted-foreground text-xs mb-2">{notification.detail}</p>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-muted-foreground text-xs">{notification.time}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
