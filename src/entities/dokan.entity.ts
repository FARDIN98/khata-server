import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { DokanEvent } from './dokan-event.entity';
import { CustomerKhata } from './customer-khata.entity';

@Entity('dokans')
export class Dokan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  category: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ type: 'text' })
  description: string;

  @OneToOne(() => User, (u) => u.dokan, { onDelete: 'CASCADE' })
  @JoinColumn()
  owner: User;

  @OneToMany(() => DokanEvent, (e) => e.dokan)
  events: DokanEvent[];

  @OneToMany(() => CustomerKhata, (k) => k.dokan)
  customerKhatas: CustomerKhata[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
