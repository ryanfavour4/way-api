import { Upload } from 'src/uploads/entities/upload.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  MERCHANT = 'merchant',
  ADMIN = 'admin',
  ADMIN_STAFF = 'admin_staff',
}

export enum UserStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  APPLE = 'apple',
}

export enum UserGender {
  MALE = 'male',
  FEMALE = 'female',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  @Column({ length: 255 })
  fullname!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username?: string;

  @Column({ length: 500, nullable: true })
  bio?: string;

  @Column({ length: 500, nullable: true })
  location?: string;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password?: string;

  @Column({ length: 20, nullable: true, unique: true })
  phone_number?: string;

  @Column({ type: 'timestamp', nullable: true })
  date_of_birth?: Date;

  @Column({
    type: 'enum',
    enum: UserGender,
    default: UserGender.MALE,
  })
  gender?: UserGender = UserGender.MALE;

  // Link assets and banners to your Upload entity
  @ManyToOne(() => Upload, {
    nullable: true,
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'avatar_id' })
  avatar?: Upload;

  @Column({ type: 'int', unsigned: true, nullable: true })
  avatar_id?: number;

  // Role Architecture (Replaces simple admin boolean)
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole = UserRole.USER;

  // Account Lifecycle State
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus = UserStatus.ACTIVE;

  // Auth Provider Configurations
  @Column({
    type: 'enum',
    enum: AuthProvider,
    default: AuthProvider.LOCAL,
  })
  provider: AuthProvider = AuthProvider.LOCAL;

  @Column({ type: 'varchar', nullable: true, unique: true })
  google_id?: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  apple_id?: string;

  // Verification & Security Flags
  @Column({ default: false })
  email_verified: boolean = false;

  @Column({ default: false })
  phone_verified: boolean = false;

  @Column({ type: 'varchar', length: 100, nullable: true })
  verification_token?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reset_password_token?: string;

  @Column({ type: 'timestamp', nullable: true })
  reset_password_expires?: Date;

  // Metadata & Timestamps
  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at?: Date;
}
