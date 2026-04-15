import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe.Stripe | null = null;

  constructor(private config: ConfigService) {}

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

  verifyWebhook(rawBody: Buffer, signature: string) {
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET is not configured',
      );
    }
    try {
      return this.getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        secret,
      );
    } catch (err) {
      throw new UnauthorizedException(
        `Stripe signature verification failed: ${(err as Error).message}`,
      );
    }
  }
}
