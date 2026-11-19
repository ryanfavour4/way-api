import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Store } from 'src/stores/entities/store.entity';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
}

@Entity('store_subscriptions')
export class StoreSubscription {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ unsigned: true })
  @Index()
  store_id!: number;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({ length: 100, default: 'verified_badge' })
  plan_type: string = 'verified_badge'; // e.g., 'verified_badge', 'pro_merchant'

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.ACTIVE,
  })
  status: SubscriptionStatus = SubscriptionStatus.ACTIVE;

  // Generic Payment & Provider Details
  @Column({ length: 50, nullable: true })
  payment_provider?: string; // e.g., 'paystack', 'flutterwave', 'stripe'

  @Column({ length: 255, nullable: true })
  provider_subscription_id?: string; // Standardized sub/plan ID from the gateway

  @Column({ length: 255, nullable: true })
  provider_customer_id?: string; // External customer or authorization token reference

  @Column({ length: 50, nullable: true })
  payment_method?: string; // e.g., 'card', 'bank_transfer', 'ussd'

  @Column({ length: 3, default: 'NGN' })
  currency: string = 'NGN';

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount_paid!: number;

  // Subscription Lifecycle
  @Column({ type: 'timestamp' })
  starts_at!: Date;

  @Column({ type: 'timestamp' })
  expires_at!: Date;

  @Column({ default: true })
  auto_renew: boolean = true;

  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
