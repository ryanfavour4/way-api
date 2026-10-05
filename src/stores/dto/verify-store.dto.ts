import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StoreVerificationStatus } from '../entities/store.entity';

export class VerifyStoreDto {
  @IsEnum(StoreVerificationStatus)
  status!: StoreVerificationStatus; // e.g. APPROVED, REJECTED, PENDING

  @IsString()
  @IsOptional()
  notes?: string;
}
