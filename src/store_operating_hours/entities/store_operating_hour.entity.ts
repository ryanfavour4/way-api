import { Store } from 'src/stores/entities/store.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

@Entity('store_operating_hours')
@Unique(['store_id', 'day_of_week']) // Each store has only 1 schedule per day
export class StoreOperatingHours {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ unsigned: true })
  store_id!: number;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'store_id' })
  store!: Store;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
  })
  day_of_week!: DayOfWeek;

  @Column({ type: 'time', nullable: true })
  open_time?: string; // e.g., "08:00:00"

  @Column({ type: 'time', nullable: true })
  close_time?: string; // e.g., "18:00:00"

  @Column({ default: false })
  is_closed: boolean = false; // Set to true if store does not open on this day
}
