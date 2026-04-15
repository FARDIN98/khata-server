import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InviteStatus } from '../common/enums';
import { User } from './user.entity';
import { DokanEvent } from './dokan-event.entity';

@Entity('invitations')
@Unique(['event', 'grahok'])
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DokanEvent, (e) => e.invitations, { onDelete: 'CASCADE' })
  event: DokanEvent;

  @ManyToOne(() => User, (u) => u.invitations, { onDelete: 'CASCADE' })
  grahok: User;

  @Column({ type: 'enum', enum: InviteStatus, default: InviteStatus.PENDING })
  status: InviteStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
