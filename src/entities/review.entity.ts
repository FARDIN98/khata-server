import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
} from 'typeorm';
import { User } from './user.entity';
import { DokanEvent } from './dokan-event.entity';

@Entity('reviews')
@Unique(['event', 'grahok'])
@Check(`"rating" >= 1 AND "rating" <= 5`)
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DokanEvent, (e) => e.reviews, { onDelete: 'CASCADE' })
  event: DokanEvent;

  @ManyToOne(() => User, (u) => u.reviews, { onDelete: 'CASCADE' })
  grahok: User;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text' })
  comment: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
