import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CustomerKhata } from '../../entities/customer-khata.entity';
import { Booking } from '../../entities/booking.entity';
import { LoyaltyTier } from '../../common/enums';

const REGULAR_THRESHOLD_PAISA = 100_000n; // ৳1,000
const VIP_THRESHOLD_PAISA = 500_000n; // ৳5,000

@Injectable()
export class CustomerKhatasService {
  constructor(
    @InjectRepository(CustomerKhata)
    private khatasRepo: Repository<CustomerKhata>,
  ) {}

  async getOrCreateForPair(grahokId: string, dokanId: string) {
    let khata = await this.khatasRepo.findOne({
      where: { grahok: { id: grahokId }, dokan: { id: dokanId } },
    });
    if (!khata) {
      khata = this.khatasRepo.create({
        grahok: { id: grahokId } as any,
        dokan: { id: dokanId } as any,
        totalVisits: 0,
        eventsAttended: 0,
        totalSpentPaisa: '0',
        tier: LoyaltyTier.NEW,
      });
      khata = await this.khatasRepo.save(khata);
    }
    return khata;
  }

  recomputeTier(khata: CustomerKhata): LoyaltyTier {
    if (khata.manualTierOverride) return khata.manualTierOverride;
    const spent = BigInt(khata.totalSpentPaisa ?? '0');
    if (spent >= VIP_THRESHOLD_PAISA) return LoyaltyTier.VIP;
    if (spent >= REGULAR_THRESHOLD_PAISA || khata.eventsAttended >= 3) {
      return LoyaltyTier.REGULAR;
    }
    return LoyaltyTier.NEW;
  }

  async recordEventAttended(booking: Booking, manager?: EntityManager) {
    const repo = manager
      ? manager.getRepository(CustomerKhata)
      : this.khatasRepo;
    let khata = await repo.findOne({
      where: {
        grahok: { id: booking.grahok.id },
        dokan: { id: booking.event.dokan.id },
      },
    });
    if (!khata) {
      khata = repo.create({
        grahok: { id: booking.grahok.id } as any,
        dokan: { id: booking.event.dokan.id } as any,
        totalVisits: 0,
        eventsAttended: 0,
        totalSpentPaisa: '0',
        tier: LoyaltyTier.NEW,
      });
    }
    khata.totalVisits += 1;
    khata.eventsAttended += 1;
    const paid = BigInt(booking.paidAmountPaisa ?? 0);
    khata.totalSpentPaisa = String(BigInt(khata.totalSpentPaisa ?? '0') + paid);
    khata.tier = this.recomputeTier(khata);
    return repo.save(khata);
  }

  meetsTier(khata: CustomerKhata, minTier: LoyaltyTier): boolean {
    const rank: Record<LoyaltyTier, number> = {
      [LoyaltyTier.NEW]: 0,
      [LoyaltyTier.REGULAR]: 1,
      [LoyaltyTier.VIP]: 2,
    };
    return rank[khata.tier] >= rank[minTier];
  }

  async findOne(id: string) {
    const khata = await this.khatasRepo.findOne({
      where: { id },
      relations: ['grahok', 'dokan'],
    });
    if (!khata) throw new NotFoundException('Khata not found');
    return khata;
  }

  async findForGrahokAndDokan(grahokId: string, dokanId: string) {
    return this.getOrCreateForPair(grahokId, dokanId);
  }

  async findAllForDokan(dokanId: string) {
    return this.khatasRepo.find({
      where: { dokan: { id: dokanId } },
      relations: ['grahok'],
      order: { lastActivityAt: 'DESC' },
    });
  }

  async updateNotes(id: string, dokanId: string, notes: string) {
    const khata = await this.findOne(id);
    if (khata.dokan.id !== dokanId) {
      throw new ForbiddenException('Not your khata');
    }
    khata.dokandarNotes = notes;
    return this.khatasRepo.save(khata);
  }

  async updateTierOverride(
    id: string,
    dokanId: string,
    override: LoyaltyTier | null,
  ) {
    const khata = await this.findOne(id);
    if (khata.dokan.id !== dokanId) {
      throw new ForbiddenException('Not your khata');
    }
    khata.manualTierOverride = override as LoyaltyTier;
    khata.tier = this.recomputeTier(khata);
    return this.khatasRepo.save(khata);
  }
}
