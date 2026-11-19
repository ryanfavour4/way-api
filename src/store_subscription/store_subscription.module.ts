import { Module } from '@nestjs/common';
import { StoreSubscriptionService } from './store_subscription.service';
import { StoreSubscriptionController } from './store_subscription.controller';

@Module({
  controllers: [StoreSubscriptionController],
  providers: [StoreSubscriptionService],
})
export class StoreSubscriptionModule {}
