import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Creator } from './creator.entity';
import { Outcome } from './outcome.entity';
import { Position } from './position.entity';
import { Trade } from './trade.entity';
import { MarketStatus, MarketCategory } from '../enums';

@Entity('markets')
@Index(['status'])
@Index(['category'])
@Index(['creatorId'])
@Index(['endTime'])
@Index(['contractAddress'])
export class Market {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  description: string;

  @Column({
    type: 'enum',
    enum: MarketCategory,
    default: MarketCategory.OTHER,
  })
  category: MarketCategory;

  @Column({
    type: 'enum',
    enum: MarketStatus,
    default: MarketStatus.ACTIVE,
  })
  status: MarketStatus;

  @Column({ type: 'varchar', nullable: true })
  contractAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  txHash: string | null;

  @Column({ type: 'uuid' })
  creatorId: string;

  @Column({ type: 'timestamp', nullable: false })
  endTime: Date;

  @Column({ type: 'integer', nullable: false })
  duration: number; // in seconds (6h to 7d)

  @Column({ type: 'text', nullable: true })
  resolutionCriteria: string | null;

  @Column({ type: 'simple-array', nullable: true })
  evidenceLinks: string[] | null;

  @Column({ type: 'simple-array', nullable: true })
  tags: string[] | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: '0' })
  totalVolume: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: '0' })
  totalLiquidity: string;

  @Column({ type: 'integer', default: 0 })
  participantCount: number;

  @Column({ type: 'integer', default: 0 })
  tradeCount: number;

  @Column({ type: 'integer', nullable: true })
  winningOutcomeIndex: number | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Creator, (creator) => creator.markets, { eager: false })
  @JoinColumn({ name: 'creatorId' })
  creator: Creator;

  @OneToMany(() => Outcome, (outcome) => outcome.market, { cascade: true })
  outcomes: Outcome[];

  @OneToMany(() => Position, (position) => position.market)
  positions: Position[];

  @OneToMany(() => Trade, (trade) => trade.market)
  trades: Trade[];
}
