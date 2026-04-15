import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, QueryFailedError, Repository } from 'typeorm';
import { Review } from '../../entities/review.entity';
import { Booking } from '../../entities/booking.entity';
import { BookingStatus } from '../../common/enums';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review) private reviewsRepo: Repository<Review>,
    @InjectRepository(Booking) private bookingsRepo: Repository<Booking>,
  ) {}

  async create(grahokId: string, eventId: string, dto: CreateReviewDto) {
    const booking = await this.bookingsRepo.findOne({
      where: {
        grahok: { id: grahokId },
        event: { id: eventId, scheduledAt: LessThan(new Date()) },
        status: BookingStatus.APPROVED,
      },
      relations: ['event'],
    });
    if (!booking) {
      throw new ForbiddenException(
        'You can only review events you attended (APPROVED booking + past scheduledAt)',
      );
    }

    try {
      const review = this.reviewsRepo.create({
        grahok: { id: grahokId } as any,
        event: { id: eventId } as any,
        rating: dto.rating,
        comment: dto.comment,
      });
      return await this.reviewsRepo.save(review);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new ConflictException('You already reviewed this event');
      }
      throw err;
    }
  }

  async findForEvent(eventId: string) {
    return this.reviewsRepo.find({
      where: { event: { id: eventId } },
      relations: ['grahok'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, grahokId: string, dto: UpdateReviewDto) {
    const review = await this.loadOwnedOrFail(id, grahokId);
    this.assertWithinEditWindow(review);
    Object.assign(review, dto);
    return this.reviewsRepo.save(review);
  }

  async remove(id: string, grahokId: string) {
    const review = await this.loadOwnedOrFail(id, grahokId);
    this.assertWithinEditWindow(review);
    await this.reviewsRepo.remove(review);
    return { deleted: true };
  }

  private async loadOwnedOrFail(id: string, grahokId: string) {
    const review = await this.reviewsRepo.findOne({
      where: { id },
      relations: ['grahok'],
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.grahok.id !== grahokId) {
      throw new ForbiddenException('Not your review');
    }
    return review;
  }

  private assertWithinEditWindow(review: Review) {
    const age = Date.now() - review.createdAt.getTime();
    if (age > EDIT_WINDOW_MS) {
      throw new BadRequestException(
        'Reviews can only be edited or deleted within 24 hours',
      );
    }
  }
}
