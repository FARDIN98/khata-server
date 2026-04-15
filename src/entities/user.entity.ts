import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../common/enums';
import { Dokan } from './dokan.entity';
import { Booking } from './booking.entity';
import { Review } from './review.entity';
import { CustomerKhata } from './customer-khata.entity';
import { Invitation } from './invitation.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.GRAHOK,
  })
  role: UserRole;

  @OneToOne(() => Dokan, (d) => d.owner, { nullable: true })
  dokan?: Dokan;

  @OneToMany(() => CustomerKhata, (k) => k.grahok)
  khatas: CustomerKhata[];

  @OneToMany(() => Booking, (b) => b.grahok)
  bookings: Booking[];

  @OneToMany(() => Review, (r) => r.grahok)
  reviews: Review[];

  @OneToMany(() => Invitation, (i) => i.grahok)
  invitations: Invitation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
