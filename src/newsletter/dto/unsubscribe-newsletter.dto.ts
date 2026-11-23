import { IsEmail, IsNotEmpty } from 'class-validator';

export class UnsubscribeNewsletterDto {
  @IsEmail({}, { message: 'A valid email address is required.' })
  @IsNotEmpty({ message: 'Email cannot be empty.' })
  email!: string;
}
