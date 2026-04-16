import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import Stripe from 'stripe';
import { Booking } from '../../entities/booking.entity';
import { DokanEvent } from '../../entities/dokan-event.entity';
import { User } from '../../entities/user.entity';
import {
  BookingStatus,
  LoyaltyTier,
  Visibility,
} from '../../common/enums';
import { CustomerKhatasService } from '../customer-khatas/customer-khatas.service';

@Injectable()
export class BookingsService {
  private stripe: Stripe.Stripe | null = null;

  constructor(
    @InjectRepository(Booking) private bookingsRepo: Repository<Booking>,
    @InjectRepository(DokanEvent) private eventsRepo: Repository<DokanEvent>,
    private khatas: CustomerKhatasService,
    private config: ConfigService,
  ) {}

  private getStripe(): Stripe.Stripe {
    if (this.stripe) return this.stripe;
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (!key) {
      throw new InternalServerErrorException(
        'STRIPE_SECRET_KEY is not configured',
      );
    }
    this.stripe = new Stripe(key);
    return this.stripe;
  }

  async createFreeBooking(grahok: User, eventId: string) {
    const event = await this.loadEventOrFail(eventId);
    this.assertFutureEvent(event);
    if (event.feeInPaisa > 0) {
      throw new BadRequestException(
        'This event requires payment. Use /checkout instead.',
      );
    }

    const status = await this.resolveCreationStatus(grahok, event);
    try {
      const booking = this.bookingsRepo.create({
        grahok,
        event,
        status,
      });
      return await this.bookingsRepo.save(booking);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new ConflictException('You already have a booking for this event');
      }
      throw err;
    }
  }

  async createCheckoutSession(grahok: User, eventId: string) {
    const event = await this.loadEventOrFail(eventId);
    this.assertFutureEvent(event);
    if (event.feeInPaisa <= 0) {
      throw new BadRequestException(
        'This event is free. Use the free booking endpoint.',
      );
    }
    if (event.visibility === Visibility.LOYALTY) {
      await this.assertTierForLoyalty(grahok, event);
    }

    const existing = await this.bookingsRepo.findOne({
      where: { grahok: { id: grahok.id }, event: { id: eventId } },
    });
    if (existing && existing.status !== BookingStatus.PAYMENT_PENDING) {
      throw new ConflictException(
        `You already have a booking for this event (status=${existing.status})`,
      );
    }

    const booking =
      existing ??
      (await this.bookingsRepo.save(
        this.bookingsRepo.create({
          grahok,
          event,
          status: BookingStatus.PAYMENT_PENDING,
        }),
      ));

    const frontendOrigin =
      this.config.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:3000';
    const currency = (
      this.config.get<string>('STRIPE_CURRENCY') ?? 'usd'
    ).toLowerCase();

    const session = await this.getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: event.feeInPaisa,
            product_data: {
              name: event.title,
              description: event.description?.slice(0, 300),
            },
          },
        },
      ],
      client_reference_id: booking.id,
      metadata: {
        bookingId: booking.id,
        grahokId: grahok.id,
        eventId: event.id,
      },
      success_url: `${frontendOrigin}/bookings/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendOrigin}/events/${event.id}`,
    });

    booking.stripeSessionId = session.id;
    await this.bookingsRepo.save(booking);

    return { booking, checkoutUrl: session.url };
  }

  async markPaid(
    sessionId: string,
    paymentIntentId: string,
    amountPaisa: number,
  ) {
    const booking = await this.bookingsRepo.findOne({
      where: { stripeSessionId: sessionId },
      relations: ['grahok', 'event', 'event.dokan'],
    });
    if (!booking) {
      return { updated: false, reason: 'booking not found' };
    }
    if (booking.status !== BookingStatus.PAYMENT_PENDING) {
      return { updated: false, reason: 'already processed', booking };
    }
    booking.status = BookingStatus.PENDING;
    booking.stripePaymentIntentId = paymentIntentId;
    booking.paidAmountPaisa = amountPaisa;
    await this.bookingsRepo.save(booking);

    return { updated: true, booking };
  }

  async listMyBookings(grahokId: string) {
    return this.bookingsRepo.find({
      where: { grahok: { id: grahokId } },
      relations: ['event', 'event.dokan'],
      order: { createdAt: 'DESC' },
    });
  }

  async listForEvent(eventId: string, dokanId: string) {
    const event = await this.loadEventOrFail(eventId);
    if (event.dokan.id !== dokanId) {
      throw new ForbiddenException('Not your event');
    }
    return this.bookingsRepo.find({
      where: { event: { id: eventId } },
      relations: ['grahok'],
      order: { createdAt: 'DESC' },
    });
  }

  async setStatus(
    id: string,
    dokanId: string,
    status: BookingStatus,
  ) {
    const booking = await this.bookingsRepo.findOne({
      where: { id },
      relations: ['event', 'event.dokan', 'grahok'],
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.event.dokan.id !== dokanId) {
      throw new ForbiddenException('Not your event');
    }
    booking.status = status;
    const saved = await this.bookingsRepo.save(booking);
    if (status === BookingStatus.APPROVED) {
      await this.khatas.recordEventAttended(saved);
    }
    return saved;
  }

  private async loadEventOrFail(eventId: string) {
    const event = await this.eventsRepo.findOne({
      where: { id: eventId },
      relations: ['dokan'],
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  private assertFutureEvent(event: DokanEvent) {
    if (event.scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Cannot book a past or ongoing event');
    }
  }

  private async resolveCreationStatus(grahok: User, event: DokanEvent) {
    if (event.visibility === Visibility.LOYALTY) {
      await this.assertTierForLoyalty(grahok, event);
      return BookingStatus.PENDING;
    }
    return BookingStatus.APPROVED;
  }

  private async assertTierForLoyalty(grahok: User, event: DokanEvent) {
    if (!event.minTier) return;
    const khata = await this.khatas.getOrCreateForPair(
      grahok.id,
      event.dokan.id,
    );
    if (!this.khatas.meetsTier(khata, event.minTier as LoyaltyTier)) {
      throw new ForbiddenException(
        `This event requires ${event.minTier} tier. Your current tier is ${khata.tier}.`,
      );
    }
  }
}
