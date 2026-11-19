import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { StoreSubscriptionService } from './store_subscription.service';
import { CreateStoreSubscriptionDto } from './dto/create-store_subscription.dto';
import { UpdateStoreSubscriptionDto } from './dto/update-store_subscription.dto';

@Controller('store-subscription')
export class StoreSubscriptionController {
  constructor(
    private readonly storeSubscriptionService: StoreSubscriptionService,
  ) {}

  @Post()
  create(@Body() createStoreSubscriptionDto: CreateStoreSubscriptionDto) {
    return this.storeSubscriptionService.create(createStoreSubscriptionDto);
  }

  @Get()
  findAll() {
    return this.storeSubscriptionService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storeSubscriptionService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateStoreSubscriptionDto: UpdateStoreSubscriptionDto,
  ) {
    return this.storeSubscriptionService.update(
      +id,
      updateStoreSubscriptionDto,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.storeSubscriptionService.remove(+id);
  }
}
