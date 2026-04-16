import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
  @ApiOperation({
    summary: 'List dokans (public)',
    description:
      'Returns all shops, newest first. Optionally filter by category (free-text, case-sensitive match against the shop\u2019s stored category). No auth required \u2014 this powers the public Discover page.',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    description: 'Exact-match category filter (e.g. `cafe`, `apparel`).',
  })
  @ApiResponse({ status: 200, description: 'Array of Dokans (may be empty).' })
  list(@Query('category') category?: string) {
    return this.dokans.findAll(category);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOKANDAR)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Get the current Dokandar\u2019s own dokan',
    description:
      'Returns the Dokan owned by the authenticated shopkeeper. Intended for the Dokandar dashboard \u2014 clients use this to hydrate shop name, category, logo, etc. after login.',
  })
  @ApiResponse({ status: 200, description: 'The caller\u2019s Dokan entity.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Dokandar (RolesGuard rejected).',
  })
  @ApiResponse({
    status: 404,
    description: 'The authenticated user does not own a Dokan.',
  })
  me(@CurrentUser() user: User) {
    return this.dokans.findForOwner(user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOKANDAR)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Update the current Dokandar\u2019s own dokan',
    description:
      'Patches the caller\u2019s own Dokan with any subset of editable fields (name, category, address, description, logoUrl). Only the shop owner can edit their shop; SUPER_ADMIN-level edits are handled separately.',
  })
  @ApiResponse({ status: 200, description: 'The updated Dokan entity.' })
  @ApiResponse({ status: 400, description: 'Request body failed validation.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Dokandar (RolesGuard rejected).',
  })
  @ApiResponse({
    status: 404,
    description: 'The authenticated user does not own a Dokan.',
  })
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateDokanDto) {
    return this.dokans.updateForOwner(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a dokan with its events (public)',
    description:
      'Returns the Dokan by id along with its `events` relation, suitable for the public shop detail page. No auth required.',
  })
  @ApiParam({ name: 'id', description: 'Dokan UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'The Dokan with nested events.' })
  @ApiResponse({ status: 400, description: '`id` is not a valid UUID.' })
  @ApiResponse({
    status: 404,
    description: 'No Dokan exists with the supplied id.',
  })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.dokans.findOne(id);
  }
}
