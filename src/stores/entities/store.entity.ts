import { Category } from 'src/categories/entities/category.entity';
import { Upload } from 'src/uploads/entities/upload.entity';
import { User } from 'src/users/entities/users.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export enum StoreType {
  RETAIL = 'retail',
  SERVICE = 'service',
  HYBRID = 'hybrid',
}

export enum StoreVerificationStatus {
  PENDING = 'pending',
  IN_REVIEW = 'in_review',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn({ unsigned: true })
  id!: number;

  // Merchant / Owner (FK to users)
  @Column({ unsigned: true })
  merchant_id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'merchant_id' })
  merchant!: User;

  // Business Identity
  @Column({ length: 255 })
  name!: string; // e.g., "Tech Haven"

  @Column({ length: 255, unique: true })
  slug!: string; // e.g., "tech-haven-ikeja" for web/deep links

  @Column({ length: 255, nullable: true })
  legal_name?: string; // e.g., "Tech Haven Retail LTD"

  @Column({ length: 100, nullable: true })
  rc_number?: string; // Corporate Affairs Commission (CAC) / Business Reg Number

  @Column({ length: 100, nullable: true })
  tax_id?: string; // Tax Identification Number (TIN)

  @Column({ type: 'text', nullable: true })
  description?: string;

  // Communication & Social Contacts
  @Column({ length: 255 })
  contact_email!: string;

  @Column({ length: 20 })
  primary_phone!: string; // WhatsApp / Direct Call

  @Column({ length: 20, nullable: true })
  secondary_phone?: string;

  @Column({ length: 255, nullable: true })
  website_url?: string;

  // Brand & Visual Assets (Referencing 'Upload' Entity)
  @Column({ unsigned: true, nullable: true })
  logo_id?: number;

  @ManyToOne(() => Upload, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'logo_id' })
  logo?: Upload;

  @Column({ unsigned: true, nullable: true })
  storefront_image_id?: number;

  @ManyToOne(() => Upload, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'storefront_image_id' })
  storefront_image?: Upload;

  // Physical Location & Geospatial Mapping
  @Column({ length: 255 })
  address_line!: string; // e.g., "14 Broadway Ave"

  @Column({ length: 100, nullable: true })
  unit_suite?: string; // e.g., "Suite 2B" or "Shop G12"

  @Column({ length: 255, nullable: true })
  landmark?: string; // e.g., "Opposite Ikeja City Mall" (Essential for local navigation)

  @Column({ length: 100, default: 'Ikeja' })
  city!: string;

  @Column({ length: 100, default: 'Lagos' })
  state!: string;

  @Column({ length: 100, default: 'Nigeria' })
  country!: string;

  @Column({ length: 20, nullable: true })
  postal_code?: string;

  @Index()
  @Column({ type: 'decimal', precision: 10, scale: 8 })
  latitude!: number;

  @Index()
  @Column({ type: 'decimal', precision: 11, scale: 8 })
  longitude!: number;

  // Trust & Admin Verification System
  @Column({
    type: 'enum',
    enum: StoreVerificationStatus,
    default: StoreVerificationStatus.PENDING,
  })
  verification_status: StoreVerificationStatus =
    StoreVerificationStatus.PENDING;

  @Column({ type: 'text', nullable: true })
  verification_notes?: string; // Feedback to merchant if rejected

  @Column({ type: 'timestamp', nullable: true })
  verified_at?: Date;

  @Column({ unsigned: true, nullable: true })
  verified_by_user_id?: number; // Admin / Staff who conducted manual verification

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by_user_id' })
  verified_by?: User;

  // Real-Time Operational State & Metrics
  @Column({ default: true })
  is_active: boolean = true; // Overall listing state (Active / Hidden by Merchant)

  @Column({ default: true })
  is_open_override: boolean = true; // Emergency manual open/closed override toggle

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.0 })
  rating_avg: number = 0.0; // Cached rating average (e.g., 4.8) for quick map renders

  @Column({ type: 'int', default: 0, unsigned: true })
  review_count: number = 0; // Cached review count (e.g., 124)

  @Column({ type: 'int', default: 0, unsigned: true })
  footfall_count: number = 0; // Total footfall visitors tracked via WAY navigation

  // Add this to your Store Entity:
  @Column({
    type: 'enum',
    enum: StoreType,
    default: StoreType.RETAIL,
  })
  store_type: StoreType = StoreType.RETAIL;

  // Primary Category (Required)
  @Column({ unsigned: true })
  primary_category_id!: number;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'primary_category_id' })
  primary_category!: Category;

  // Secondary Category (Optional)
  @Column({ unsigned: true, nullable: true })
  secondary_category_id?: number;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'secondary_category_id' })
  secondary_category?: Category;

  // Tertiary Category (Optional)
  @Column({ unsigned: true, nullable: true })
  tertiary_category_id?: number;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tertiary_category_id' })
  tertiary_category?: Category;

  // Audit Timestamps
  @CreateDateColumn({ type: 'timestamp' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at!: Date;

  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deleted_at?: Date;
}
