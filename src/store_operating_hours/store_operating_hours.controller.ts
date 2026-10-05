import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { StoreOperatingHoursService } from './store_operating_hours.service';
import { CreateStoreOperatingHourDto } from './dto/create-store_operating_hour.dto';
import { UpdateStoreOperatingHourDto } from './dto/update-store_operating_hour.dto';

@Controller('store-operating-hours')
export class StoreOperatingHoursController {
  constructor(
    private readonly storeOperatingHoursService: StoreOperatingHoursService,
  ) {}

  @Post()
  create(@Body() createStoreOperatingHourDto: CreateStoreOperatingHourDto) {
    return this.storeOperatingHoursService.create(createStoreOperatingHourDto);
  }

  @Get()
  findAll() {
    return this.storeOperatingHoursService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storeOperatingHoursService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateStoreOperatingHourDto: UpdateStoreOperatingHourDto,
  ) {
    return this.storeOperatingHoursService.update(
      +id,
      updateStoreOperatingHourDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.storeOperatingHoursService.remove(+id);
  }
}
