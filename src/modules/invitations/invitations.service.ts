import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Invitation } from '../../entities/invitation.entity';
import { DokanEvent } from '../../entities/dokan-event.entity';
import { Booking } from '../../entities/booking.entity';
import { BookingStatus, InviteStatus } from '../../common/enums';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(Invitation) private invitationsRepo: Repository<Invitation>,
    @InjectRepository(DokanEvent) private eventsRepo: Repository<DokanEvent>,
    @InjectRepository(Booking) private bookingsRepo: Repository<Booking>,
  ) {}

  async invite(dokanId: string, eventId: string, grahokId: string) {
    const event = await this.eventsRepo.findOne({
      where: { id: eventId },
      relations: ['dokan'],
    });
    if (!event) throw new NotFoundException('Event not found');
    if (event.dokan.id !== dokanId) {
      throw new ForbiddenException('Not your event');
    }

    try {
      const invite = this.invitationsRepo.create({
        event: { id: eventId } as any,
        grahok: { id: grahokId } as any,
        status: InviteStatus.PENDING,
      });
      return await this.invitationsRepo.save(invite);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new ConflictException('Grahok already invited to this event');
      }
      throw err;
    }
  }

  async listForGrahok(grahokId: string) {
    return this.invitationsRepo.find({
      where: { grahok: { id: grahokId } },
      relations: ['event', 'event.dokan'],
      order: { createdAt: 'DESC' },
    });
  }

  async accept(id: string, grahokId: string) {
    const invite = await this.loadOwnedOrFail(id, grahokId);
    if (invite.status !== InviteStatus.PENDING) {
      throw new ConflictException(`Invite already ${invite.status}`);
    }
    invite.status = InviteStatus.ACCEPTED;
    await this.invitationsRepo.save(invite);

    try {
      const booking = this.bookingsRepo.create({
        grahok: { id: grahokId } as any,
        event: { id: invite.event.id } as any,
        status: BookingStatus.APPROVED,
      });
      await this.bookingsRepo.save(booking);
    } catch (err) {
      if (!(err instanceof QueryFailedError && (err as any).code === '23505')) {
        throw err;
      }
    }

    return invite;
  }

  async decline(id: string, grahokId: string) {
    const invite = await this.loadOwnedOrFail(id, grahokId);
    if (invite.status !== InviteStatus.PENDING) {
      throw new ConflictException(`Invite already ${invite.status}`);
    }
    invite.status = InviteStatus.DECLINED;
    return this.invitationsRepo.save(invite);
  }

  private async loadOwnedOrFail(id: string, grahokId: string) {
    const invite = await this.invitationsRepo.findOne({
      where: { id },
      relations: ['grahok', 'event'],
    });
    if (!invite) throw new NotFoundException('Invitation not found');
    if (invite.grahok.id !== grahokId) {
      throw new ForbiddenException('Not your invitation');
    }
    return invite;
  }
}
