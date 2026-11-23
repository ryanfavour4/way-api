import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum NewsletterSubscriberStatus {
  SUBSCRIBED = 'subscribed',
  UNSUBSCRIBED = 'unsubscribed',
}

@Entity('newsletter_subscribers')
export class NewsletterSubscriber {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({
    type: 'enum',
    enum: NewsletterSubscriberStatus,
    default: NewsletterSubscriberStatus.SUBSCRIBED,
  })
  status!: NewsletterSubscriberStatus;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
