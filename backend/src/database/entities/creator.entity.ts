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
  OneToOne,
} from 'typeorm';
import { CreatorStatus } from '../enums';
import { User } from './user.entity';
import { CreatorShare } from './creator-share.entity';
import { ShareTransaction } from './share-transaction.entity';
import { OpinionMarket } from './opinion-market.entity';
import { DividendEpoch } from './dividend-epoch.entity';
import { DividendClaim } from './dividend-claim.entity';
import { CreatorVolumeTracking } from './creator-volume-tracking.entity';

@Entity('creators')
@Index(['twitterHandle'])
@Index(['totalMarketVolume'])
@Index(['sharesUnlocked'])
export class Creator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  userId: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  twitterId: string;

  @Column({ type: 'varchar', nullable: false })
  twitterHandle: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  creatorAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  profilePictureUrl: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', nullable: true })
  websiteUrl: string | null;

  @Column({ type: 'integer', default: 0 })
  followerCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  engagementRate: number;

  @Column({ type: 'integer', default: 0 })
  postCount30d: number;

  @Column({ type: 'timestamp', nullable: true })
  qualifiedAt: Date | null;

  @Column({ type: 'boolean', default: false })
  stakePaid: boolean;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  stakeAmount: number | null;

  @Column({ type: 'boolean', default: false })
  stakeReturned: boolean;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  totalMarketVolume: number;

  @Column({ type: 'boolean', default: false })
  sharesUnlocked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  sharesUnlockedAt: Date | null;

  @Column({ type: 'varchar', nullable: true, unique: true })
  shareContractAddress: string | null;

  @Column({ type: 'integer', default: 0 })
  totalShares: number;

  @Column({
    type: 'enum',
    enum: CreatorStatus,
    default: CreatorStatus.PENDING,
  })
  status: CreatorStatus;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @OneToOne(() => User, (user) => user.creator)
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => CreatorShare, (share) => share.creator)
  shares: CreatorShare[];

  @OneToMany(() => ShareTransaction, (transaction) => transaction.creator)
  shareTransactions: ShareTransaction[];

  @OneToMany(() => OpinionMarket, (market) => market.creator)
  markets: OpinionMarket[];

  @OneToMany(() => DividendEpoch, (epoch) => epoch.creator)
  dividendEpochs: DividendEpoch[];

  @OneToMany(() => DividendClaim, (claim) => claim.creator)
  dividendClaims: DividendClaim[];

  @OneToMany(() => CreatorVolumeTracking, (tracking) => tracking.creator)
  volumeTracking: CreatorVolumeTracking[];
}
