import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum NotificationType {
  MARKET_RESOLVED = 'market_resolved',
  DIVIDENDS_AVAILABLE = 'dividends_available',
  SHARES_UNLOCKED = 'shares_unlocked',
  CREATOR_APPROVED = 'creator_approved',
  NEW_FOLLOWER = 'new_follower',
  PRICE_ALERT = 'price_alert',
  MARKET_ENDING_SOON = 'market_ending_soon',
  MARKET_OVERDUE = 'market_overdue',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  SYSTEM_ALERT = 'system_alert',
}

@Entity('notifications')
@Index(['userAddress'])
@Index(['read'])
@Index(['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  userAddress: string;

  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @Column({ type: 'varchar' })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'jsonb', nullable: true })
  data: object | null;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  actionUrl: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
