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
@ApiBearerAuth()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('events/:eventId/grahoks/:grahokId')
  @Roles(UserRole.DOKANDAR)
  @ApiOperation({ summary: 'Dokandar invites a grahok to their event' })
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
  @ApiOperation({ summary: 'List my pending/past invitations' })
  listMine(@CurrentUser() user: User) {
    return this.invitations.listForGrahok(user.id);
  }

  @Post(':id/accept')
  @Roles(UserRole.GRAHOK)
  @ApiOperation({ summary: 'Accept an invitation (creates APPROVED booking, bypasses tier)' })
  accept(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invitations.accept(id, user.id);
  }

  @Post(':id/decline')
  @Roles(UserRole.GRAHOK)
  @ApiOperation({ summary: 'Decline an invitation' })
  decline(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invitations.decline(id, user.id);
  }
}
