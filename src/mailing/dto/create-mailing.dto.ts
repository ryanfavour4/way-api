import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';

export class SendManualMailDto {
  @IsEmail()
  to!: string;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  template!: string; // The Mailgun template name

  @IsObject()
  @IsOptional()
  variables?: {
    message: string; // The actual content
    [key: string]: any;
  }; // Dynamic data for the template
}
