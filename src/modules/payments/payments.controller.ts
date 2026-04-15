import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { BookingsService } from '../bookings/bookings.service';

@ApiExcludeController()
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly bookings: BookingsService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature?: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }
    if (!req.rawBody) {
      throw new BadRequestException(
        'Raw body unavailable; webhook misconfigured',
      );
    }

    const event = this.payments.verifyWebhook(req.rawBody, signature);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const sessionId = session.id;
      const paymentIntentId = session.payment_intent ?? '';
      const amountPaisa = session.amount_total ?? 0;

      const result = await this.bookings.markPaid(
        sessionId,
        paymentIntentId,
        amountPaisa,
      );
      return { received: true, updated: result.updated };
    }

    return { received: true, ignored: event.type };
  }
}
