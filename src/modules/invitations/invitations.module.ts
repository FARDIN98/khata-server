import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invitation } from '../../entities/invitation.entity';
import { DokanEvent } from '../../entities/dokan-event.entity';
import { Booking } from '../../entities/booking.entity';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invitation, DokanEvent, Booking])],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
