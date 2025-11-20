import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Market } from './market.entity';
import { Outcome } from './outcome.entity';
import { User } from './user.entity';

@Entity('positions')
@Index(['marketId'])
@Index(['userId'])
@Index(['outcomeId'])
@Index(['walletAddress'])
@Unique(['marketId', 'userId', 'outcomeId'])
export class Position {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  marketId: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  outcomeId: string;

  @Column({ type: 'varchar', nullable: false })
  walletAddress: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: '0' })
  shares: string; // Number of shares held

  @Column({ type: 'decimal', precision: 18, scale: 6, default: '0' })
  costBasis: string; // Total amount spent

  @Column({ type: 'decimal', precision: 18, scale: 6, default: '0' })
  averagePrice: string; // Average price per share

  @Column({ type: 'decimal', precision: 18, scale: 6, default: '0' })
  realizedPnl: string; // Profit/Loss from sells

  @Column({ type: 'boolean', default: false })
  claimed: boolean;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  claimedAmount: string | null;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Market, (market) => market.positions)
  @JoinColumn({ name: 'marketId' })
  market: Market;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Outcome, (outcome) => outcome.positions)
  @JoinColumn({ name: 'outcomeId' })
  outcome: Outcome;
}
