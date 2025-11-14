import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Creator } from './creator.entity';

@Entity('dividend_claims')
@Index(['userAddress'])
@Index(['creatorId'])
@Index(['claimedAt'])
export class DividendClaim {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  userAddress: string;

  @Column({ type: 'uuid', nullable: false })
  creatorId: string;

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

  @Column({ type: 'timestamp', nullable: false })
  claimedAt: Date;

  // Relationships
  @ManyToOne(() => Creator, (creator) => creator.dividendClaims)
  @JoinColumn({ name: 'creatorId' })
  creator: Creator;
}
