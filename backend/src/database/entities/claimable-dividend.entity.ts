import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { DividendEpoch } from './dividend-epoch.entity';

@Entity('claimable_dividends')
@Index(['userAddress'])
@Index(['creatorId'])
export class ClaimableDividend {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  userAddress: string;

  @Column({ type: 'varchar', nullable: true })
  shareholder: string | null;

  @Column({ type: 'uuid', nullable: false })
  creatorId: string;

  @Column({ type: 'uuid', nullable: true })
  dividendEpochId: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: false })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  claimableAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  sharesHeld: number;

  @Column({ type: 'jsonb', nullable: false })
  epochsIncluded: object;

  @Column({ type: 'boolean', default: true })
  claimable: boolean;

  @Column({ type: 'boolean', default: false })
  isClaimed: boolean;

  @Column({ type: 'timestamp', nullable: true })
  claimedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  transactionHash: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => DividendEpoch, { nullable: true })
  @JoinColumn({ name: 'dividendEpochId' })
  dividendEpoch: DividendEpoch | null;
}
