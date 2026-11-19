import { Injectable } from '@nestjs/common';
import { CreateStoreSubscriptionDto } from './dto/create-store_subscription.dto';
import { UpdateStoreSubscriptionDto } from './dto/update-store_subscription.dto';

@Injectable()
export class StoreSubscriptionService {
  create(createStoreSubscriptionDto: CreateStoreSubscriptionDto) {
    return 'This action adds a new storeSubscription';
  }

  findAll() {
    return `This action returns all storeSubscription`;
  }

  findOne(id: number) {
    return `This action returns a #${id} storeSubscription`;
  }

  update(id: number, updateStoreSubscriptionDto: UpdateStoreSubscriptionDto) {
    return `This action updates a #${id} storeSubscription`;
  }

  remove(id: number) {
    return `This action removes a #${id} storeSubscription`;
  }
}
