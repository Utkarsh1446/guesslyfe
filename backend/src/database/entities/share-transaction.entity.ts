import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TransactionType } from '../enums';
import { Creator } from './creator.entity';

@Entity('share_transactions')
@Index(['creatorId'])
@Index(['buyerAddress'])
@Index(['sellerAddress'])
@Index(['txHash'])
@Index(['timestamp'])
export class ShareTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', nullable: false })
  creatorId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
    nullable: false,
  })
  transactionType: TransactionType;

  @Column({ type: 'varchar', nullable: true })
  buyerAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  buyer: string | null;

  @Column({ type: 'varchar', nullable: true })
  sellerAddress: string | null;

  @Column({ type: 'varchar', nullable: true })
  seller: string | null;

  @Column({ type: 'integer', nullable: false })
  shares: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: true })
  pricePerShare: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 6, nullable: false })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  fees: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  protocolFee: number;

  @Column({ type: 'decimal', precision: 18, scale: 6, default: 0 })
  creatorFee: number;

  @Column({ type: 'varchar', unique: true, nullable: true })
  txHash: string | null;

  @Column({ type: 'integer', nullable: true })
  blockNumber: number | null;

  @Column({ type: 'timestamp', nullable: false })
  timestamp: Date;

  // Relationships
  @ManyToOne(() => Creator, (creator) => creator.shareTransactions)
  @JoinColumn({ name: 'creatorId' })
  creator: Creator;
}
