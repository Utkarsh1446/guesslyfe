import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Creator } from './creator.entity';

@Entity('dividend_epochs')
@Unique(['creatorId', 'epochNumber'])
@Index(['creatorId'])
export class DividendEpoch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  creatorId: string;

  @Column({ type: 'varchar', nullable: true })
  creatorAddress: string | null;

  @Column({ type: 'integer', nullable: false })
  epochNumber: number;

  @Column({ type: 'timestamp', nullable: false })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: false })
  endTime: Date;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  shareFeesCollected: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  marketFeesCollected: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  totalFees: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  totalDividends: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  totalSharesAtSnapshot: number;

  @Column({ type: 'boolean', default: false })
  distributed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  distributedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isFinalized: boolean;

  @Column({ type: 'timestamp', nullable: true })
  finalizedAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  // Relationships
  @ManyToOne(() => Creator, (creator) => creator.dividendEpochs)
  @JoinColumn({ name: 'creatorId' })
  creator: Creator;
}
