import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../../entities/booking.entity';
import { DokanEvent } from '../../entities/dokan-event.entity';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { CustomerKhatasModule } from '../customer-khatas/customer-khatas.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, DokanEvent]),
    CustomerKhatasModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
