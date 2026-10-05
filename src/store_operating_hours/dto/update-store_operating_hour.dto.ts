import { PartialType } from '@nestjs/mapped-types';
import { CreateStoreOperatingHourDto } from './create-store_operating_hour.dto';

export class UpdateStoreOperatingHourDto extends PartialType(CreateStoreOperatingHourDto) {}
