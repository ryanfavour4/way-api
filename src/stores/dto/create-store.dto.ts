import {
  IsString,
  IsOptional,
  IsEmail,
  IsNumber,
  IsEnum,
  IsNotEmpty,
  Min,
  Max,
} from 'class-validator';
import { StoreType } from '../entities/store.entity';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  legal_name?: string;

  @IsString()
  @IsOptional()
  rc_number?: string;

  @IsString()
  @IsOptional()
  tax_id?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEmail()
  @IsNotEmpty()
  contact_email!: string;

  @IsString()
  @IsNotEmpty()
  primary_phone!: string;

  @IsString()
  @IsOptional()
  secondary_phone?: string;

  @IsString()
  @IsOptional()
  website_url?: string;

  @IsNumber()
  @IsOptional()
  logo_id?: number;

  @IsNumber()
  @IsOptional()
  storefront_image_id?: number;

  @IsString()
  @IsNotEmpty()
  address_line!: string;

  @IsString()
  @IsOptional()
  unit_suite?: string;

  @IsString()
  @IsOptional()
  landmark?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  postal_code?: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

  @IsEnum(StoreType)
  @IsOptional()
  store_type?: StoreType;

  @IsNumber()
  @IsNotEmpty()
  primary_category_id!: number;

  @IsNumber()
  @IsOptional()
  secondary_category_id?: number;

  @IsNumber()
  @IsOptional()
  tertiary_category_id?: number;
}
