import { PartialType } from '@nestjs/mapped-types';
import { CreateStoreSubscriptionDto } from './create-store_subscription.dto';

export class UpdateStoreSubscriptionDto extends PartialType(CreateStoreSubscriptionDto) {}
