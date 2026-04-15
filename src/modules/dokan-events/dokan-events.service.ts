import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DokanEvent } from '../../entities/dokan-event.entity';
import { EventType, Visibility } from '../../common/enums';
import { CreateDokanEventDto } from './dto/create-event.dto';
import { UpdateDokanEventDto } from './dto/update-event.dto';

export interface EventListFilters {
  type?: EventType;
  visibility?: Visibility;
  featured?: boolean;
  search?: string;
  upcoming?: boolean;
  dokanId?: string;
  category?: string;
}

@Injectable()
export class DokanEventsService {
  constructor(
    @InjectRepository(DokanEvent) private eventsRepo: Repository<DokanEvent>,
  ) {}

  async findAll(filters: EventListFilters) {
    const qb = this.eventsRepo
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.dokan', 'd')
      .orderBy('e.scheduledAt', 'ASC');

    if (filters.type) qb.andWhere('e.type = :type', { type: filters.type });
    if (filters.visibility)
      qb.andWhere('e.visibility = :v', { v: filters.visibility });
    if (filters.featured) qb.andWhere('e.isFeatured = true');
    if (filters.upcoming)
      qb.andWhere('e.scheduledAt > :now', { now: new Date() });
    if (filters.search)
      qb.andWhere('(e.title ILIKE :s OR e.description ILIKE :s)', {
        s: `%${filters.search}%`,
      });
    if (filters.dokanId) qb.andWhere('d.id = :did', { did: filters.dokanId });
    if (filters.category)
      qb.andWhere('d.category = :cat', { cat: filters.category });

    return qb.getMany();
  }

  async findOne(id: string) {
    const ev = await this.eventsRepo.findOne({
      where: { id },
      relations: ['dokan'],
    });
    if (!ev) throw new NotFoundException('Event not found');
    return ev;
  }

  async create(dokanId: string, dto: CreateDokanEventDto) {
    const ev = this.eventsRepo.create({
      ...dto,
      scheduledAt: new Date(dto.scheduledAt),
      dokan: { id: dokanId } as any,
    });
    return this.eventsRepo.save(ev);
  }

  async update(id: string, dokanId: string, dto: UpdateDokanEventDto) {
    const ev = await this.eventsRepo.findOne({
      where: { id },
      relations: ['dokan'],
    });
    if (!ev) throw new NotFoundException('Event not found');
    if (ev.dokan.id !== dokanId) {
      throw new ForbiddenException('You do not own this event');
    }
    const patch: Partial<DokanEvent> = { ...dto } as any;
    if (dto.scheduledAt) patch.scheduledAt = new Date(dto.scheduledAt);
    Object.assign(ev, patch);
    return this.eventsRepo.save(ev);
  }

  async remove(id: string, dokanId: string) {
    const ev = await this.eventsRepo.findOne({
      where: { id },
      relations: ['dokan'],
    });
    if (!ev) throw new NotFoundException('Event not found');
    if (ev.dokan.id !== dokanId) {
      throw new ForbiddenException('You do not own this event');
    }
    await this.eventsRepo.remove(ev);
    return { deleted: true };
  }

  async removeById(id: string) {
    const ev = await this.eventsRepo.findOne({ where: { id } });
    if (!ev) throw new NotFoundException('Event not found');
    await this.eventsRepo.remove(ev);
    return { deleted: true };
  }
}
