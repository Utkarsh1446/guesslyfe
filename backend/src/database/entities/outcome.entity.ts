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
import { Market } from './market.entity';
import { Position } from './position.entity';

@Entity('outcomes')
@Index(['marketId'])
@Index(['outcomeIndex'])
export class Outcome {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  marketId: string;

  @Column({ type: 'integer', nullable: false })
  outcomeIndex: number; // 0, 1, 2, 3 (for 2-4 outcomes)

  @Column({ type: 'varchar', nullable: false })
  text: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: false })
  initialProbability: string; // e.g., "45.50" for 45.5%

  @Column({ type: 'decimal', precision: 5, scale: 2, default: '0' })
  currentProbability: string; // Updated based on trading

  @Column({ type: 'decimal', precision: 18, scale: 6, default: '0' })
  totalShares: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: '0' })
  totalStaked: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Market, (market) => market.outcomes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'marketId' })
  market: Market;

  @OneToMany(() => Position, (position) => position.outcome)
  positions: Position[];
}
