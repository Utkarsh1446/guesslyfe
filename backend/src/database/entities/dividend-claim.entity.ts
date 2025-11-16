import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Creator } from './creator.entity';
import { User } from './user.entity';
import { ClaimableDividend } from './claimable-dividend.entity';

@Entity('dividend_claims')
@Index(['userAddress'])
@Index(['creatorId'])
@Index(['claimedAt'])
export class DividendClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  userAddress: string;

  @Column({ type: 'varchar', nullable: true })
  claimer: string | null;

  @Column({ type: 'uuid', nullable: false })
  creatorId: string;

  @Column({ type: 'uuid', nullable: true })
  claimableDividendId: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: false })
  amount: number;

  @Column({ type: 'varchar', nullable: false })
  tweetUrl: string;

  @Column({ type: 'varchar', unique: true, nullable: true })
  tweetId: string | null;

  @Column({ type: 'boolean', default: false })
  verified: boolean;

  @Column({ type: 'varchar', unique: true, nullable: true })
  txHash: string | null;

  @Column({ type: 'varchar', nullable: true })
  transactionHash: string | null;

  @Column({ type: 'integer', nullable: true })
  blockNumber: number | null;

  @Column({ type: 'timestamp', nullable: false })
  claimedAt: Date;

  // Relationships
  @ManyToOne(() => Creator, (creator) => creator.dividendClaims)
  @JoinColumn({ name: 'creatorId' })
  creator: Creator;

  @ManyToOne(() => ClaimableDividend, { nullable: true })
  @JoinColumn({ name: 'claimableDividendId' })
  claimableDividend: ClaimableDividend | null;
}
