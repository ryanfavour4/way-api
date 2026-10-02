import {
  IsString,
  IsEmail,
  IsPhoneNumber,
  IsDateString,
  IsOptional,
} from 'class-validator';

export class GoogleProfileDto {
  id!: string;
  email?: string;
  name?: string;
  avatarId?: number;
  username?: string;
}

export class RegisterDto {
  @IsString()
  fullname!: string;

  @IsString()
  password!: string;

  @IsPhoneNumber()
  telephone!: string;

  @IsDateString() // YYYY-MM-DD
  birthday!: string;

  @IsString()
  @IsEmail()
  email!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class ForgotPasswordDto {
  @IsString()
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  code!: string;

  @IsString()
  newPassword!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  fullname?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}
