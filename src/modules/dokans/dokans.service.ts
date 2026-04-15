import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dokan } from '../../entities/dokan.entity';
import { UpdateDokanDto } from './dto/update-dokan.dto';

@Injectable()
export class DokansService {
  constructor(@InjectRepository(Dokan) private dokansRepo: Repository<Dokan>) {}

  async findAll(category?: string) {
    const qb = this.dokansRepo
      .createQueryBuilder('d')
      .orderBy('d.createdAt', 'DESC');
    if (category) qb.where('d.category = :category', { category });
    return qb.getMany();
  }

  async findOne(id: string) {
    const dokan = await this.dokansRepo.findOne({
      where: { id },
      relations: ['events'],
    });
    if (!dokan) throw new NotFoundException('Dokan not found');
    return dokan;
  }

  async findForOwner(ownerId: string) {
    const dokan = await this.dokansRepo.findOne({
      where: { owner: { id: ownerId } },
    });
    if (!dokan) throw new NotFoundException('You do not own a Dokan');
    return dokan;
  }

  async updateForOwner(ownerId: string, dto: UpdateDokanDto) {
    const dokan = await this.findForOwner(ownerId);
    Object.assign(dokan, dto);
    return this.dokansRepo.save(dokan);
  }

  async removeById(id: string) {
    const dokan = await this.dokansRepo.findOne({ where: { id } });
    if (!dokan) throw new NotFoundException('Dokan not found');
    await this.dokansRepo.remove(dokan);
    return { deleted: true };
  }
}
