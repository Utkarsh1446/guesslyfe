import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
} from 'typeorm';
import { Creator } from './creator.entity';

@Entity('users')
@Index(['twitterId'])
@Index(['twitterHandle'])
@Index(['walletAddress'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  twitterId: string;

  @Column({ type: 'varchar', nullable: false })
  twitterHandle: string;

  @Column({ type: 'varchar', nullable: false })
  displayName: string;

  @Column({ type: 'varchar', nullable: false })
  profilePictureUrl: string;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true })
  walletAddress: string | null;

  @Column({ type: 'integer', default: 0 })
  followerCount: number;

  @Column({ type: 'integer', default: 0 })
  followingCount: number;

  @Column({ type: 'integer', default: 0 })
  twitterFollowers: number;

  @Column({ type: 'text', nullable: true })
  twitterAccessToken: string | null;

  @Column({ type: 'text', nullable: true })
  twitterRefreshToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;

  @Column({ type: 'boolean', default: false })
  isAdmin: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date | null;

  // Relationships
  @OneToOne(() => Creator, (creator) => creator.user)
  creator: Creator;
}
