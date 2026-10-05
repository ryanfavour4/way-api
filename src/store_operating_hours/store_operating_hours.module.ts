import { Module } from '@nestjs/common';
import { StoreOperatingHoursService } from './store_operating_hours.service';
import { StoreOperatingHoursController } from './store_operating_hours.controller';

@Module({
  controllers: [StoreOperatingHoursController],
  providers: [StoreOperatingHoursService],
})
export class StoreOperatingHoursModule {}
