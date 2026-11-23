import { IsBoolean, IsEmail, IsNotEmpty } from 'class-validator';

export class SubscribeNewsletterDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email!: string;

  @IsBoolean({ message: 'Consent must be a boolean value.' })
  @IsNotEmpty({ message: 'Consent is required.' })
  consent!: boolean;
}
