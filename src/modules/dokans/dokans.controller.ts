import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DokansService } from './dokans.service';
import { UpdateDokanDto } from './dto/update-dokan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { User } from '../../entities/user.entity';

@ApiTags('dokans')
@Controller('dokans')
export class DokansController {
  constructor(private readonly dokans: DokansService) {}

  @Get()
  @ApiOperation({ summary: 'List dokans, optionally filtered by category' })
  list(@Query('category') category?: string) {
    return this.dokans.findAll(category);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOKANDAR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current Dokandar\u2019s own dokan' })
  me(@CurrentUser() user: User) {
    return this.dokans.findForOwner(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOKANDAR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update the current Dokandar\u2019s own dokan' })
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateDokanDto) {
    return this.dokans.updateForOwner(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a dokan with its events (public)' })
  detail(@Param('id') id: string) {
    return this.dokans.findOne(id);
  }
}
