import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Market } from './market.entity';
import { Outcome } from './outcome.entity';
import { User } from './user.entity';

export enum TradeAction {
  BUY = 'buy',
  SELL = 'sell',
}

@Entity('trades')
@Index(['marketId'])
@Index(['userId'])
@Index(['outcomeId'])
@Index(['walletAddress'])
@Index(['txHash'])
@Index(['createdAt'])
export class Trade {
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

  @Column({
    type: 'enum',
    enum: TradeAction,
    nullable: false,
  })
  action: TradeAction;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: false })
  shares: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: false })
  amount: string; // USDC amount

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: false })
  price: string; // Price per share

  @Column({ type: 'decimal', precision: 18, scale: 6, default: '0' })
  fee: string;

  @Column({ type: 'varchar', nullable: true })
  txHash: string | null;

  @Column({ type: 'varchar', nullable: true })
  blockNumber: string | null;

  @Column({ type: 'timestamp', nullable: true })
  blockTimestamp: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Market, (market) => market.trades)
  @JoinColumn({ name: 'marketId' })
  market: Market;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Outcome)
  @JoinColumn({ name: 'outcomeId' })
  outcome: Outcome;
}
