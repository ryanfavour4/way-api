import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsPositive,
  MaxLength,
  IsDateString,
} from 'class-validator';
import { UserGender } from '../entities/users.entity';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone_number?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: Date;

  @IsOptional()
  @IsEnum(UserGender)
  gender?: UserGender;

  @IsOptional()
  @IsInt()
  @IsPositive()
  avatar_id?: number;
}
