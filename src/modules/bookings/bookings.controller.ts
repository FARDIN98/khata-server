import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
@ApiBearerAuth()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post('events/:eventId')
  @Roles(UserRole.GRAHOK)
  @ApiOperation({ summary: 'Book a free event (public=instant, loyalty=pending)' })
  bookFree(
    @CurrentUser() user: User,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.bookings.createFreeBooking(user, eventId);
  }

  @Post('events/:eventId/checkout')
  @Roles(UserRole.GRAHOK)
  @ApiOperation({
    summary: 'Start Stripe checkout for a paid event; returns checkoutUrl',
  })
  checkout(
    @CurrentUser() user: User,
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return this.bookings.createCheckoutSession(user, eventId);
  }

  @Get('my')
  @Roles(UserRole.GRAHOK, UserRole.DOKANDAR)
  @ApiOperation({ summary: 'List the caller\u2019s own bookings' })
  listMine(@CurrentUser() user: User) {
    return this.bookings.listMyBookings(user.id);
  }

  @Get('event/:eventId')
  @Roles(UserRole.DOKANDAR)
  @ApiOperation({ summary: 'Dokandar lists bookings for their own event' })
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
  @ApiOperation({ summary: 'Dokandar approves a booking' })
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
  @ApiOperation({ summary: 'Dokandar rejects a booking' })
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
  @ApiOperation({ summary: 'Dokandar bans a booking (marks BANNED)' })
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
