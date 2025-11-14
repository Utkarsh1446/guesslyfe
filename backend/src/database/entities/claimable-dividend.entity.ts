import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('claimable_dividends')
@Index(['userAddress'])
@Index(['creatorId'])
export class ClaimableDividend {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  userAddress: string;

  @Column({ type: 'uuid', nullable: false })
  creatorId: string;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: false })
  amount: number;

  @Column({ type: 'jsonb', nullable: false })
  epochsIncluded: object;

  @Column({ type: 'boolean', default: true })
  claimable: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
