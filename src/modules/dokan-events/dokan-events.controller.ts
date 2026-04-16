import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DokanEventsService } from './dokan-events.service';
import { CreateDokanEventDto } from './dto/create-event.dto';
import { UpdateDokanEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EventType, UserRole, Visibility } from '../../common/enums';
import { User } from '../../entities/user.entity';

@ApiTags('dokan-events')
@Controller('dokan-events')
export class DokanEventsController {
  constructor(private readonly events: DokanEventsService) {}

  @Get()
  @ApiOperation({
    summary: 'List events with optional filters',
    description:
      'Public catalog of events across all Dokans, ordered by `scheduledAt` ascending. All query params are optional and combine with AND semantics. Loyalty-gated events are included in listings but booking is restricted server-side at request time \u2014 this endpoint does not hide them based on the caller\u2019s tier.',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: EventType,
    description: 'Filter by event type (e.g. `WORKSHOP`, `SAMPLE_SALE`).',
  })
  @ApiQuery({
    name: 'visibility',
    required: false,
    enum: Visibility,
    description:
      '`PUBLIC` (anyone may book) or `LOYALTY` (minTier gate applies).',
  })
  @ApiQuery({
    name: 'featured',
    required: false,
    type: Boolean,
    description: 'When `true`, returns only events flagged `isFeatured`.',
  })
  @ApiQuery({
    name: 'upcoming',
    required: false,
    type: Boolean,
    description: 'When `true`, excludes events whose `scheduledAt` is in the past.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description:
      'Case-insensitive substring match against event title or description.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Filter by the hosting Dokan\u2019s category (exact match).',
  })
  @ApiQuery({
    name: 'dokanId',
    required: false,
    description: 'Return only events belonging to this Dokan id.',
  })
  @ApiResponse({ status: 200, description: 'Array of events (may be empty).' })
  list(
    @Query('type') type?: EventType,
    @Query('visibility') visibility?: Visibility,
    @Query('featured', new ParseBoolPipe({ optional: true })) featured?: boolean,
    @Query('upcoming', new ParseBoolPipe({ optional: true })) upcoming?: boolean,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('dokanId') dokanId?: string,
  ) {
    return this.events.findAll({
      type,
      visibility,
      featured,
      upcoming,
      search,
      category,
      dokanId,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get event detail (public)',
    description:
      'Returns full event detail with its hosting Dokan. No auth required \u2014 this powers the public event page. Tier-gated booking is still enforced at the bookings endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'The event with nested Dokan.' })
  @ApiResponse({ status: 400, description: '`id` is not a valid UUID.' })
  @ApiResponse({ status: 404, description: 'No event with the supplied id.' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.events.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOKANDAR)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Create a new event for the caller\u2019s dokan',
    description:
      'A Dokandar creates an event that will be hosted at their own Dokan. `scheduledAt` must be an ISO timestamp. If `visibility` is `LOYALTY`, `minTier` is required and gates booking at runtime.',
  })
  @ApiResponse({ status: 201, description: 'The newly created event.' })
  @ApiResponse({ status: 400, description: 'Request body failed validation.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Dokandar, or does not own a Dokan.',
  })
  create(@CurrentUser() user: User, @Body() dto: CreateDokanEventDto) {
    if (!user.dokan) {
      throw new ForbiddenException('You do not have a Dokan');
    }
    return this.events.create(user.dokan.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOKANDAR)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Update own event',
    description:
      'Patches a subset of fields on an event. The caller must be the Dokandar whose Dokan hosts the event; otherwise a 403 is returned. Does not reassign ownership.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'The updated event.' })
  @ApiResponse({ status: 400, description: 'Request body failed validation.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Dokandar, or does not own this event.',
  })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDokanEventDto,
  ) {
    if (!user.dokan) {
      throw new ForbiddenException('You do not have a Dokan');
    }
    return this.events.update(id, user.dokan.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOKANDAR)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Delete own event',
    description:
      'Removes an event hosted by the caller\u2019s Dokan. Cascades delete to bookings, reviews, and invitations for the event at the database level.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: '`{ deleted: true }` on success.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Dokandar, or does not own this event.',
  })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    if (!user.dokan) {
      throw new ForbiddenException('You do not have a Dokan');
    }
    return this.events.remove(id, user.dokan.id);
  }
}
