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
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { User } from '../../entities/user.entity';

@ApiTags('invitations')
@Controller('invitations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('events/:eventId/grahoks/:grahokId')
  @Roles(UserRole.DOKANDAR)
  @ApiOperation({
    summary: 'Invite a customer to an event',
    description:
      'A Dokandar hand-picks a Grahok and issues a PENDING invitation for one of their own events. Accepting the invite bypasses loyalty-tier gating. Dokandars cannot invite to events they do not host.',
  })
  @ApiParam({ name: 'eventId', description: 'Event UUID', format: 'uuid' })
  @ApiParam({
    name: 'grahokId',
    description: 'Grahok (customer) UUID',
    format: 'uuid',
  })
  @ApiResponse({ status: 201, description: 'The newly issued Invitation (PENDING).' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description:
      'Caller is not a Dokandar, does not own a Dokan, or does not own this event.',
  })
  @ApiResponse({ status: 404, description: 'Event not found.' })
  @ApiResponse({
    status: 409,
    description: 'This Grahok has already been invited to this event.',
  })
  invite(
    @CurrentUser() user: User,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('grahokId', ParseUUIDPipe) grahokId: string,
  ) {
    if (!user.dokan) {
      throw new ForbiddenException('You do not have a Dokan');
    }
    return this.invitations.invite(user.dokan.id, eventId, grahokId);
  }

  @Get('my')
  @Roles(UserRole.GRAHOK)
  @ApiOperation({
    summary: 'List my invitations',
    description:
      'Returns all invitations issued to the authenticated Grahok, newest first, with the event and its Dokan loaded. Includes PENDING, ACCEPTED, and DECLINED so the UI can show an \u201cinbox\u201d and history together.',
  })
  @ApiResponse({ status: 200, description: 'Array of invitations.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({ status: 403, description: 'Caller is not a Grahok.' })
  listMine(@CurrentUser() user: User) {
    return this.invitations.listForGrahok(user.id);
  }

  @Post(':id/accept')
  @Roles(UserRole.GRAHOK)
  @ApiOperation({
    summary: 'Accept an invitation',
    description:
      'Flips the invitation to ACCEPTED and auto-creates an APPROVED booking for the event, bypassing the loyalty-tier gate (since it was a personal invite). If a booking already exists from a prior attempt, the duplicate is silently ignored.',
  })
  @ApiParam({ name: 'id', description: 'Invitation UUID', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'The ACCEPTED invitation.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Grahok, or the invitation is not theirs.',
  })
  @ApiResponse({ status: 404, description: 'Invitation not found.' })
  @ApiResponse({
    status: 409,
    description: 'Invitation is already ACCEPTED or DECLINED.',
  })
  accept(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invitations.accept(id, user.id);
  }

  @Post(':id/decline')
  @Roles(UserRole.GRAHOK)
  @ApiOperation({
    summary: 'Decline an invitation',
    description:
      'Flips the invitation to DECLINED. Does not create a booking. Can only be called on PENDING invites \u2014 already-resolved invites return 409.',
  })
  @ApiParam({ name: 'id', description: 'Invitation UUID', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'The DECLINED invitation.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Grahok, or the invitation is not theirs.',
  })
  @ApiResponse({ status: 404, description: 'Invitation not found.' })
  @ApiResponse({
    status: 409,
    description: 'Invitation is already ACCEPTED or DECLINED.',
  })
  decline(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invitations.decline(id, user.id);
  }
}
