import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Dokan } from '../../entities/dokan.entity';
import { DokanEvent } from '../../entities/dokan-event.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private usersRepo: Repository<User>,
    @InjectRepository(Dokan) private dokansRepo: Repository<Dokan>,
    @InjectRepository(DokanEvent) private eventsRepo: Repository<DokanEvent>,
  ) {}

  listUsers() {
    return this.usersRepo.find({
      relations: ['dokan'],
      order: { createdAt: 'DESC' },
    });
  }

  listDokans() {
    return this.dokansRepo.find({
      relations: ['owner'],
      order: { createdAt: 'DESC' },
    });
  }

  listEvents() {
    return this.eventsRepo.find({
      relations: ['dokan'],
      order: { scheduledAt: 'DESC' },
    });
  }

  async deleteUser(id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepo.remove(user);
    return { deleted: true };
  }

  async deleteDokan(id: string) {
    const dokan = await this.dokansRepo.findOne({ where: { id } });
    if (!dokan) throw new NotFoundException('Dokan not found');
    await this.dokansRepo.remove(dokan);
    return { deleted: true };
  }

  async deleteEvent(id: string) {
    const event = await this.eventsRepo.findOne({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    await this.eventsRepo.remove(event);
    return { deleted: true };
  }
}
