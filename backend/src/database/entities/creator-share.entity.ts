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
import { Creator } from './creator.entity';

@Entity('creator_shares')
@Unique(['creatorId', 'holderAddress'])
@Index(['creatorId'])
@Index(['holderAddress'])
export class CreatorShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  creatorId: string;

  @Column({ type: 'varchar', nullable: false })
  holderAddress: string;

  @Column({ type: 'integer', nullable: false })
  sharesHeld: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  averageBuyPrice: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  totalInvested: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  // Relationships
  @ManyToOne(() => Creator, (creator) => creator.shares)
  @JoinColumn({ name: 'creatorId' })
  creator: Creator;
}
