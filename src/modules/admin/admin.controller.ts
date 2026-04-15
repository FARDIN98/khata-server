import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'SUPER_ADMIN lists all users' })
  listUsers() {
    return this.admin.listUsers();
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'SUPER_ADMIN deletes a user (cascades Dokan, bookings, khatas)' })
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteUser(id);
  }

  @Get('dokans')
  @ApiOperation({ summary: 'SUPER_ADMIN lists all dokans' })
  listDokans() {
    return this.admin.listDokans();
  }

  @Delete('dokans/:id')
  @ApiOperation({ summary: 'SUPER_ADMIN deletes a dokan (cascades events, khatas)' })
  deleteDokan(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteDokan(id);
  }

  @Get('events')
  @ApiOperation({ summary: 'SUPER_ADMIN lists all events' })
  listEvents() {
    return this.admin.listEvents();
  }

  @Delete('events/:id')
  @ApiOperation({ summary: 'SUPER_ADMIN deletes an event (cascades bookings, reviews, invitations)' })
  deleteEvent(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.deleteEvent(id);
  }
}
