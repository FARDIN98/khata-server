import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth('bearer')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  @ApiOperation({
    summary: 'List all users (SUPER_ADMIN)',
    description:
      'Returns every user on the platform, newest first, with the `dokan` relation populated for Dokandars. Used by the moderation console.',
  })
  @ApiResponse({ status: 200, description: 'Array of users.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({ status: 403, description: 'Caller is not SUPER_ADMIN.' })
  listUsers() {
    return this.admin.listUsers();
  }

  @Delete('users/:id')
  @ApiOperation({
    summary: 'Delete a user (SUPER_ADMIN)',
    description:
      'Permanently removes the user. Destructive \u2014 TypeORM cascades will remove the user\u2019s owned Dokan (if Dokandar), and all of their bookings, khatas, invitations, and reviews. No soft-delete; there is no undo.',
  })
  @ApiParam({ name: 'id', description: 'User UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: '`{ deleted: true }` on success.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({ status: 403, description: 'Caller is not SUPER_ADMIN.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteUser(id);
  }

  @Get('dokans')
  @ApiOperation({
    summary: 'List all dokans (SUPER_ADMIN)',
    description:
      'Returns every Dokan on the platform, newest first, with the `owner` relation populated. Used by the moderation console.',
  })
  @ApiResponse({ status: 200, description: 'Array of Dokans.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({ status: 403, description: 'Caller is not SUPER_ADMIN.' })
  listDokans() {
    return this.admin.listDokans();
  }

  @Delete('dokans/:id')
  @ApiOperation({
    summary: 'Delete a dokan (SUPER_ADMIN)',
    description:
      'Permanently removes a Dokan. Destructive \u2014 TypeORM cascades will remove every event hosted by the shop and every CustomerKhata tied to it. The owning Dokandar user is NOT deleted.',
  })
  @ApiParam({ name: 'id', description: 'Dokan UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: '`{ deleted: true }` on success.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({ status: 403, description: 'Caller is not SUPER_ADMIN.' })
  @ApiResponse({ status: 404, description: 'Dokan not found.' })
  deleteDokan(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteDokan(id);
  }

  @Get('events')
  @ApiOperation({
    summary: 'List all events (SUPER_ADMIN)',
    description:
      'Returns every event on the platform, ordered by `scheduledAt` descending, with the hosting Dokan populated. Used by the moderation console.',
  })
  @ApiResponse({ status: 200, description: 'Array of events.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({ status: 403, description: 'Caller is not SUPER_ADMIN.' })
  listEvents() {
    return this.admin.listEvents();
  }

  @Delete('events/:id')
  @ApiOperation({
    summary: 'Delete an event (SUPER_ADMIN)',
    description:
      'Permanently removes an event. Destructive \u2014 cascades to all bookings, reviews, and invitations for the event. Does not refund paid bookings; refunds must be issued in Stripe out-of-band.',
  })
  @ApiParam({ name: 'id', description: 'Event UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: '`{ deleted: true }` on success.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({ status: 403, description: 'Caller is not SUPER_ADMIN.' })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  deleteEvent(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteEvent(id);
  }
}
