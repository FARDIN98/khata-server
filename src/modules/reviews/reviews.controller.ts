import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { User } from '../../entities/user.entity';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('events/:eventId')
  @ApiOperation({ summary: 'List reviews for an event (public)' })
  listForEvent(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.reviews.findForEvent(eventId);
  }

  @Post('events/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GRAHOK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Grahok creates a review (requires past APPROVED booking)' })
  create(
    @CurrentUser() user: User,
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviews.create(user.id, eventId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GRAHOK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Edit own review within 24 hours of creation' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviews.update(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GRAHOK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own review within 24 hours of creation' })
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviews.remove(id, user.id);
  }
}
