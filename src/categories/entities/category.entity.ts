import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ length: 100, unique: true })
  name!: string; // e.g., "Education", "Healthcare", "Infrastructure"

  // --- Lifecycle Metatags ---
  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;
}
