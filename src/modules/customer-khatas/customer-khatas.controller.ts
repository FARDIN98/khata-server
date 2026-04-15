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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
@ApiBearerAuth()
export class CustomerKhatasController {
  constructor(private readonly khatas: CustomerKhatasService) {}

  @Get('my-dokan/:dokanId')
  @Roles(UserRole.GRAHOK, UserRole.DOKANDAR)
  @ApiOperation({ summary: 'Get my khata with a specific dokan' })
  myKhataForDokan(
    @CurrentUser() user: User,
    @Param('dokanId', ParseUUIDPipe) dokanId: string,
  ) {
    return this.khatas.findForGrahokAndDokan(user.id, dokanId);
  }

  @Get('my-shop')
  @Roles(UserRole.DOKANDAR)
  @ApiOperation({ summary: 'List all grahok khatas for the dokandar\u2019s shop' })
  listMyShop(@CurrentUser() user: User) {
    if (!user.dokan) {
      throw new ForbiddenException('You do not have a Dokan');
    }
    return this.khatas.findAllForDokan(user.dokan.id);
  }

  @Patch(':id/notes')
  @Roles(UserRole.DOKANDAR)
  @ApiOperation({ summary: 'Update dokandar notes on a khata' })
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
  @ApiOperation({ summary: 'Manually override a grahok\u2019s loyalty tier' })
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
