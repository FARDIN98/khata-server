import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DokanEvent } from '../../entities/dokan-event.entity';
import { DokanEventsController } from './dokan-events.controller';
import { DokanEventsService } from './dokan-events.service';

@Module({
  imports: [TypeOrmModule.forFeature([DokanEvent])],
  controllers: [DokanEventsController],
  providers: [DokanEventsService],
  exports: [DokanEventsService],
})
export class DokanEventsModule {}
