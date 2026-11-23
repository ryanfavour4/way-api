import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/users/entities/users.entity';

@Entity('uploads')
export class Upload {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column()
  url!: string;

  @Column()
  public_id!: string;

  @Column()
  asset_id!: string;

  @Column()
  type!: string; // "testimonial-avatar", "profile", etc.

  @Column({
    type: 'enum',
    enum: ['image', 'video', 'raw', 'application'],
    default: 'image',
  })
  resource_type!: string;

  @Column({ type: 'int', unsigned: true, nullable: true })
  uploaded_by_user_id?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploaded_by_user?: User;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
