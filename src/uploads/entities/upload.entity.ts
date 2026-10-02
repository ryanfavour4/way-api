import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

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

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
