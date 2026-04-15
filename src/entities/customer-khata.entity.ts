import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LoyaltyTier } from '../common/enums';
import { User } from './user.entity';
import { Dokan } from './dokan.entity';

@Entity('customer_khatas')
@Unique(['grahok', 'dokan'])
export class CustomerKhata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.khatas, { onDelete: 'CASCADE' })
  grahok: User;

  @ManyToOne(() => Dokan, (d) => d.customerKhatas, { onDelete: 'CASCADE' })
  dokan: Dokan;

  @Column({ default: 0 })
  totalVisits: number;

  @Column({ default: 0 })
  eventsAttended: number;

  @Column({ type: 'bigint', default: 0 })
  totalSpentPaisa: string;

  @Column({ type: 'enum', enum: LoyaltyTier, default: LoyaltyTier.NEW })
  tier: LoyaltyTier;

  @Column({ type: 'enum', enum: LoyaltyTier, nullable: true })
  manualTierOverride: LoyaltyTier;

  @Column({ type: 'text', nullable: true })
  dokandarNotes: string;

  @CreateDateColumn()
  firstSeenAt: Date;

  @UpdateDateColumn()
  lastActivityAt: Date;
}
