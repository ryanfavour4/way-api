import { Injectable } from '@nestjs/common';
import { CreateStoreOperatingHourDto } from './dto/create-store_operating_hour.dto';
import { UpdateStoreOperatingHourDto } from './dto/update-store_operating_hour.dto';

@Injectable()
export class StoreOperatingHoursService {
  create(createStoreOperatingHourDto: CreateStoreOperatingHourDto) {
    return 'This action adds a new storeOperatingHour';
  }

  findAll() {
    return `This action returns all storeOperatingHours`;
  }

  findOne(id: number) {
    return `This action returns a #${id} storeOperatingHour`;
  }

  update(id: number, updateStoreOperatingHourDto: UpdateStoreOperatingHourDto) {
    return `This action updates a #${id} storeOperatingHour`;
  }

  remove(id: number) {
    return `This action removes a #${id} storeOperatingHour`;
  }
}
