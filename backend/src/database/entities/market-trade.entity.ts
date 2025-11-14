import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TransactionType } from '../enums';
import { OpinionMarket } from './opinion-market.entity';

@Entity('market_trades')
@Index(['marketId'])
@Index(['userAddress'])
@Index(['txHash'])
@Index(['timestamp'])
export class MarketTrade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  marketId: string;

  @Column({ type: 'varchar', nullable: false })
  userAddress: string;

  @Column({ type: 'integer', nullable: false })
  outcome: number;

  @Column({
    type: 'enum',
    enum: TransactionType,
    nullable: false,
  })
  tradeType: TransactionType;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: false })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: false })
  shares: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  price: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  fees: number;

  @Column({ type: 'varchar', unique: true, nullable: true })
  txHash: string | null;

  @Column({ type: 'timestamp', nullable: false })
  timestamp: Date;

  // Relationships
  @ManyToOne(() => OpinionMarket, (market) => market.trades)
  @JoinColumn({ name: 'marketId' })
  market: OpinionMarket;
}
