import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CustomerKhatasService } from './customer-khatas.service';
import {
  UpdateKhataNotesDto,
  UpdateKhataTierDto,
} from './dto/update-khata.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { User } from '../../entities/user.entity';

@ApiTags('customer-khatas')
@Controller('customer-khatas')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('bearer')
export class CustomerKhatasController {
  constructor(private readonly khatas: CustomerKhatasService) {}

  @Get('my-dokan/:dokanId')
  @Roles(UserRole.GRAHOK, UserRole.DOKANDAR)
  @ApiOperation({
    summary: 'Get my loyalty ledger with a specific dokan',
    description:
      'Returns the caller\u2019s CustomerKhata for the given Dokan \u2014 totalSpent, eventsAttended, tier, manual override, and Dokandar notes. If no khata exists yet, one is created on the fly with tier NEW so the UI always has something to render.',
  })
  @ApiParam({ name: 'dokanId', description: 'Dokan UUID', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description:
      'The caller\u2019s khata for this Dokan (created with tier NEW if absent).',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Grahok or Dokandar.',
  })
  myKhataForDokan(
    @CurrentUser() user: User,
    @Param('dokanId', ParseUUIDPipe) dokanId: string,
  ) {
    return this.khatas.findForGrahokAndDokan(user.id, dokanId);
  }

  @Get('my-shop')
  @Roles(UserRole.DOKANDAR)
  @ApiOperation({
    summary: 'List every customer khata for the Dokandar\u2019s shop',
    description:
      'Returns all CustomerKhata rows for the authenticated Dokandar\u2019s Dokan, ordered by `lastActivityAt` descending. Drives the loyalty dashboard where shopkeepers see who their regulars and VIPs are.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of khatas for every customer seen at the shop.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Dokandar, or does not have a Dokan.',
  })
  listMyShop(@CurrentUser() user: User) {
    if (!user.dokan) {
      throw new ForbiddenException('You do not have a Dokan');
    }
    return this.khatas.findAllForDokan(user.dokan.id);
  }

  @Patch(':id/notes')
  @Roles(UserRole.DOKANDAR)
  @ApiOperation({
    summary: 'Update Dokandar notes on a khata',
    description:
      'Writes private Dokandar-only notes against a specific customer khata (e.g. \u201cprefers evening pickup\u201d, \u201callergic to peanuts\u201d). The khata must belong to the caller\u2019s Dokan. Notes are never shown to the customer.',
  })
  @ApiParam({ name: 'id', description: 'CustomerKhata UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'The updated khata.' })
  @ApiResponse({ status: 400, description: 'Request body failed validation.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Dokandar, or the khata is not at their Dokan.',
  })
  @ApiResponse({ status: 404, description: 'Khata not found.' })
  updateNotes(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKhataNotesDto,
  ) {
    if (!user.dokan) {
      throw new ForbiddenException('You do not have a Dokan');
    }
    return this.khatas.updateNotes(id, user.dokan.id, dto.dokandarNotes);
  }

  @Patch(':id/tier-override')
  @Roles(UserRole.DOKANDAR)
  @ApiOperation({
    summary: 'Manually override a customer\u2019s loyalty tier',
    description:
      'Sets `manualTierOverride` on the khata to NEW, REGULAR, VIP, or `null` to clear. When non-null, the override wins over the auto-computed tier (VIP when totalSpent \u2265 \u09f35,000; REGULAR when totalSpent \u2265 \u09f31,000 OR eventsAttended \u2265 3; else NEW). The tier field is recomputed and persisted.',
  })
  @ApiParam({ name: 'id', description: 'CustomerKhata UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'The updated khata.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid tier value in request body.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Dokandar, or the khata is not at their Dokan.',
  })
  @ApiResponse({ status: 404, description: 'Khata not found.' })
  updateTierOverride(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateKhataTierDto,
  ) {
    if (!user.dokan) {
      throw new ForbiddenException('You do not have a Dokan');
    }
    return this.khatas.updateTierOverride(
      id,
      user.dokan.id,
      dto.manualTierOverride,
    );
  }
}
