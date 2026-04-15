import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dokan } from '../../entities/dokan.entity';
import { DokansController } from './dokans.controller';
import { DokansService } from './dokans.service';

@Module({
  imports: [TypeOrmModule.forFeature([Dokan])],
  controllers: [DokansController],
  providers: [DokansService],
  exports: [DokansService],
})
export class DokansModule {}
