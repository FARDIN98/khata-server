import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { EventType, Visibility, LoyaltyTier } from '../common/enums';
import { Dokan } from './dokan.entity';
import { Booking } from './booking.entity';
import { Review } from './review.entity';
import { Invitation } from './invitation.entity';

@Entity('dokan_events')
export class DokanEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: EventType })
  type: EventType;

  @Column()
  venue: string;

  @Column({ nullable: true })
  eventLink: string;

  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: Visibility, default: Visibility.PUBLIC })
  visibility: Visibility;

  @Column({ type: 'enum', enum: LoyaltyTier, nullable: true })
  minTier: LoyaltyTier;

  @Column({ default: 0 })
  feeInPaisa: number;

  @Column({ default: 50 })
  capacity: number;

  @Column({ default: false })
  isFeatured: boolean;

  @ManyToOne(() => Dokan, (d) => d.events, { onDelete: 'CASCADE' })
  dokan: Dokan;

  @OneToMany(() => Booking, (b) => b.event)
  bookings: Booking[];

  @OneToMany(() => Review, (r) => r.event)
  reviews: Review[];

  @OneToMany(() => Invitation, (i) => i.event)
  invitations: Invitation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
