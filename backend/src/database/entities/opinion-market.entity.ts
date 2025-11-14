import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { MarketStatus, MarketCategory } from '../enums';
import { Creator } from './creator.entity';
import { MarketPosition } from './market-position.entity';
import { MarketTrade } from './market-trade.entity';
import { CreatorVolumeTracking } from './creator-volume-tracking.entity';

@Entity('opinion_markets')
@Index(['creatorId'])
@Index(['endTime'])
@Index(['status'])
@Index(['volume'])
@Index(['createdAt'])
export class OpinionMarket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  creatorId: string;

  @Column({ type: 'varchar', nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: MarketCategory,
    nullable: true,
  })
  category: MarketCategory | null;

  @Column({ type: 'jsonb', nullable: false })
  outcomes: object;

  @Column({ type: 'integer', nullable: false })
  duration: number;

  @Column({ type: 'timestamp', nullable: false })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: MarketStatus,
    default: MarketStatus.ACTIVE,
  })
  status: MarketStatus;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  volume: number;

  @Column({ type: 'integer', default: 0 })
  totalTrades: number;

  @Column({ type: 'timestamp', nullable: true })
  resolutionTime: Date | null;

  @Column({ type: 'integer', nullable: true })
  winningOutcome: number | null;

  @Column({ type: 'text', nullable: true })
  resolutionNote: string | null;

  @Column({ type: 'uuid', nullable: true })
  resolvedBy: string | null;

  @Column({ type: 'varchar', nullable: true })
  contractAddress: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Creator, (creator) => creator.markets)
  @JoinColumn({ name: 'creatorId' })
  creator: Creator;

  @OneToMany(() => MarketPosition, (position) => position.market)
  positions: MarketPosition[];

  @OneToMany(() => MarketTrade, (trade) => trade.market)
  trades: MarketTrade[];

  @OneToMany(() => CreatorVolumeTracking, (tracking) => tracking.market)
  volumeTracking: CreatorVolumeTracking[];
}
