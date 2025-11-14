import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Creator } from './creator.entity';
import { OpinionMarket } from './opinion-market.entity';

@Entity('creator_volume_tracking')
@Unique(['creatorId', 'marketId'])
@Index(['creatorId'])
@Index(['marketId'])
export class CreatorVolumeTracking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  creatorId: string;

  @Column({ type: 'uuid', nullable: false })
  marketId: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: false })
  marketVolume: number;

  @Column({ type: 'timestamp', nullable: false })
  trackedAt: Date;

  // Relationships
  @ManyToOne(() => Creator, (creator) => creator.volumeTracking)
  @JoinColumn({ name: 'creatorId' })
  creator: Creator;

  @ManyToOne(() => OpinionMarket, (market) => market.volumeTracking)
  @JoinColumn({ name: 'marketId' })
  market: OpinionMarket;
}
