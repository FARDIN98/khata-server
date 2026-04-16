import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BookingStatus, UserRole } from '../../common/enums';
import { User } from '../../entities/user.entity';

@ApiTags('bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post('events/:eventId')
  @Roles(UserRole.GRAHOK)
  @ApiOperation({
    summary: 'Book a free event',
    description:
      'Customer books a free (feeInPaisa = 0) event. If the event is PUBLIC the booking is instantly APPROVED; if LOYALTY the caller\u2019s tier must meet `minTier` and the booking is created as PENDING for Dokandar approval. Rejects with 400 on past events, paid events (use /checkout), or full capacity; 409 on duplicate booking.',
  })
  @ApiParam({ name: 'eventId', description: 'Event UUID', format: 'uuid' })
  @ApiResponse({
    status: 201,
    description: 'Booking created (APPROVED for PUBLIC, PENDING for LOYALTY).',
  })
  @ApiResponse({
    status: 400,
    description: 'Event is paid, in the past, or at capacity.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description:
      'Caller is not a Grahok, or the event is LOYALTY and the caller\u2019s tier is below `minTier`.',
  })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  @ApiResponse({
    status: 409,
    description: 'Caller already has a booking for this event.',
  })
  bookFree(
    @CurrentUser() user: User,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.bookings.createFreeBooking(user, eventId);
  }

  @Post('events/:eventId/checkout')
  @Roles(UserRole.GRAHOK)
  @ApiOperation({
    summary: 'Start Stripe checkout for a paid event',
    description:
      'Creates (or reuses a PAYMENT_PENDING) Booking and spins up a Stripe Checkout Session. Returns `{ booking, checkoutUrl }` \u2014 redirect the user to `checkoutUrl`. After payment, the Stripe webhook flips the booking to PENDING (PUBLIC+paid is then auto-logic elsewhere; LOYALTY+paid still needs Dokandar approval). Rejects free events \u2014 use the free booking endpoint.',
  })
  @ApiParam({ name: 'eventId', description: 'Event UUID', format: 'uuid' })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created. Returns `{ booking, checkoutUrl }`.',
  })
  @ApiResponse({
    status: 400,
    description: 'Event is free, in the past, or at capacity.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description:
      'Caller is not a Grahok, or the event is LOYALTY and caller\u2019s tier is below `minTier`.',
  })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  @ApiResponse({
    status: 409,
    description:
      'Caller already has a non-PAYMENT_PENDING booking for this event.',
  })
  checkout(
    @CurrentUser() user: User,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.bookings.createCheckoutSession(user, eventId);
  }

  @Get('my')
  @Roles(UserRole.GRAHOK, UserRole.DOKANDAR)
  @ApiOperation({
    summary: 'List the caller\u2019s own bookings',
    description:
      'Returns all bookings placed by the authenticated user, newest first, with the associated event and Dokan. Usable by Grahoks to see their personal history and by Dokandars to see bookings they themselves placed as a customer at other shops.',
  })
  @ApiResponse({ status: 200, description: 'Array of bookings (may be empty).' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Grahok or Dokandar.',
  })
  listMine(@CurrentUser() user: User) {
    return this.bookings.listMyBookings(user.id);
  }

  @Get('event/:eventId')
  @Roles(UserRole.DOKANDAR)
  @ApiOperation({
    summary: 'List bookings for a Dokandar\u2019s own event',
    description:
      'Returns every booking attached to the given event, newest first, with the Grahok relation populated. Caller must be the Dokandar whose Dokan hosts this event \u2014 cross-shop access is blocked with 403. Used by the approval-queue UI.',
  })
  @ApiParam({ name: 'eventId', description: 'Event UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Array of bookings for the event.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description:
      'Caller is not a Dokandar, does not have a Dokan, or does not own this event.',
  })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  listForEvent(
    @CurrentUser() user: User,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    if (!user.dokan) {
      throw new ForbiddenException('You do not have a Dokan');
    }
    return this.bookings.listForEvent(eventId, user.dokan.id);
  }

  @Post(':id/approve')
  @Roles(UserRole.DOKANDAR)
  @ApiOperation({
    summary: 'Approve a pending booking',
    description:
      'Marks a booking as APPROVED. Caller must be the Dokandar who owns the event\u2019s Dokan. On transition to APPROVED, the customer\u2019s khata is updated (eventsAttended +1, totalSpent credited if paid) and tier is recomputed. Idempotent \u2014 calling on an already-APPROVED booking returns it unchanged. Rejects PAYMENT_PENDING \u2014 payment must clear first.',
  })
  @ApiParam({ name: 'id', description: 'Booking UUID', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'The APPROVED booking.' })
  @ApiResponse({
    status: 400,
    description: 'Booking is still PAYMENT_PENDING; wait for Stripe webhook.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description:
      'Caller is not a Dokandar, does not have a Dokan, or does not own this event.',
  })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  approve(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (!user.dokan) {
      throw new ForbiddenException('You do not have a Dokan');
    }
    return this.bookings.setStatus(id, user.dokan.id, BookingStatus.APPROVED);
  }

  @Post(':id/reject')
  @Roles(UserRole.DOKANDAR)
  @ApiOperation({
    summary: 'Reject a pending booking',
    description:
      'Marks a booking as REJECTED. Caller must be the Dokandar who owns the event\u2019s Dokan. Idempotent on already-REJECTED. Rejects PAYMENT_PENDING \u2014 let Stripe settle first before rejecting. Does not refund automatically; refunds are handled out-of-band.',
  })
  @ApiParam({ name: 'id', description: 'Booking UUID', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'The REJECTED booking.' })
  @ApiResponse({
    status: 400,
    description: 'Booking is still PAYMENT_PENDING.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Dokandar or does not own this event.',
  })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  reject(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (!user.dokan) {
      throw new ForbiddenException('You do not have a Dokan');
    }
    return this.bookings.setStatus(id, user.dokan.id, BookingStatus.REJECTED);
  }

  @Post(':id/ban')
  @Roles(UserRole.DOKANDAR)
  @ApiOperation({
    summary: 'Ban a booking',
    description:
      'Marks a booking as BANNED \u2014 the stronger form of REJECTED used when a Dokandar wants to flag a customer as blocked for this event. Caller must own the event. Idempotent on already-BANNED. Rejects PAYMENT_PENDING.',
  })
  @ApiParam({ name: 'id', description: 'Booking UUID', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'The BANNED booking.' })
  @ApiResponse({
    status: 400,
    description: 'Booking is still PAYMENT_PENDING.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Dokandar or does not own this event.',
  })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  ban(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (!user.dokan) {
      throw new ForbiddenException('You do not have a Dokan');
    }
    return this.bookings.setStatus(id, user.dokan.id, BookingStatus.BANNED);
  }
}
