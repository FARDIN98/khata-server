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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'List events with optional filters' })
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
  @ApiOperation({ summary: 'Get event detail (public)' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.events.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOKANDAR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dokandar creates a new event for own dokan' })
  create(@CurrentUser() user: User, @Body() dto: CreateDokanEventDto) {
    if (!user.dokan) {
      throw new ForbiddenException('You do not have a Dokan');
    }
    return this.events.create(user.dokan.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOKANDAR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dokandar updates own event' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Dokandar deletes own event' })
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
