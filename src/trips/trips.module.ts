import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { AuthModule } from '../auth/auth.module';
import { DeepseekModule } from '../deepseek/deepseek.module';
import { FoursquareModule } from '../foursquare/foursquare.module';

@Module({
  imports: [AuthModule, DeepseekModule, FoursquareModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
