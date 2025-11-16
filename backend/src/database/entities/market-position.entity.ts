import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { OpinionMarket } from './opinion-market.entity';

@Entity('market_positions')
@Unique(['marketId', 'userAddress', 'outcome'])
@Index(['marketId'])
@Index(['userAddress'])
export class MarketPosition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  marketId: string;

  @Column({ type: 'varchar', nullable: false })
  userAddress: string;

  @Column({ type: 'integer', nullable: false })
  outcome: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: false })
  shares: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  yesShares: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  noShares: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  totalInvested: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  costBasis: number;

  @Column({ type: 'boolean', default: false })
  claimed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => OpinionMarket, (market) => market.positions)
  @JoinColumn({ name: 'marketId' })
  opinionMarket: OpinionMarket;
}
