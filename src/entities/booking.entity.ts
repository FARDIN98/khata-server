import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingStatus } from '../common/enums';
import { User } from './user.entity';
import { DokanEvent } from './dokan-event.entity';

@Entity('bookings')
@Unique(['grahok', 'event'])
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (u) => u.bookings, { onDelete: 'CASCADE' })
  grahok: User;

  @ManyToOne(() => DokanEvent, (e) => e.bookings, { onDelete: 'CASCADE' })
  event: DokanEvent;

  @Column({ type: 'enum', enum: BookingStatus, default: BookingStatus.PENDING })
  status: BookingStatus;

  @Column({ nullable: true })
  stripeSessionId: string;

  @Column({ nullable: true })
  stripePaymentIntentId: string;

  @Column({ type: 'int', nullable: true })
  paidAmountPaisa: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
