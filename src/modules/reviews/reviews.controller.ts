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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'List reviews for an event (public)',
    description:
      'Returns every review for the given event, newest first, with the Grahok author populated. No auth required \u2014 this powers the public event page\u2019s reviews panel.',
  })
  @ApiParam({ name: 'eventId', description: 'Event UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Array of reviews (may be empty).' })
  @ApiResponse({ status: 400, description: '`eventId` is not a valid UUID.' })
  listForEvent(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return this.reviews.findForEvent(eventId);
  }

  @Post('events/:eventId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.GRAHOK)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Create a review for an attended event',
    description:
      'A Grahok posts a 1\u20135 star review with an optional comment. Requires an APPROVED booking for the event AND `scheduledAt` in the past \u2014 you can only review what you actually attended. One review per (Grahok, event); duplicates return 409.',
  })
  @ApiParam({ name: 'eventId', description: 'Event UUID', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'The newly created review.' })
  @ApiResponse({ status: 400, description: 'Request body failed validation.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description:
      'Caller is not a Grahok, or has no APPROVED+past-date booking for this event.',
  })
  @ApiResponse({
    status: 409,
    description: 'Caller has already reviewed this event.',
  })
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
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Edit own review (24h window)',
    description:
      'Update the rating and/or comment on a review the caller authored, provided it was created in the last 24 hours. After that the review is frozen to preserve the integrity of event feedback.',
  })
  @ApiParam({ name: 'id', description: 'Review UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'The updated review.' })
  @ApiResponse({
    status: 400,
    description:
      'Request body failed validation, or the 24-hour edit window has elapsed.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Grahok, or the review is not theirs.',
  })
  @ApiResponse({ status: 404, description: 'Review not found.' })
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
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'Delete own review (24h window)',
    description:
      'Hard-deletes a review the caller authored, provided it was created in the last 24 hours. After that the review is locked and cannot be removed by the author.',
  })
  @ApiParam({ name: 'id', description: 'Review UUID', format: 'uuid' })
  @ApiResponse({ status: 200, description: '`{ deleted: true }` on success.' })
  @ApiResponse({
    status: 400,
    description: 'The 24-hour edit window has elapsed.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid JWT.' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not a Grahok, or the review is not theirs.',
  })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  remove(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviews.remove(id, user.id);
  }
}
