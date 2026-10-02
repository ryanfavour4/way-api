import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthProvider, User } from 'src/users/entities/users.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ForgotPasswordDto,
  GoogleProfileDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/create-auth.dto';
import { CLIENT_BASEURL, GOOGLE_CLIENT_ID, RESEND_API_KEY } from 'src/env';
import * as bcrypt from 'bcryptjs'; // Changed from 'bcrypt'
import { v4 as uuidv4 } from 'uuid'; // pnpm add uuid
import { Resend } from 'resend'; // pnpm add resend
import { MailingService } from 'src/mailing/mailing.service';
import { OAuth2Client } from 'google-auth-library';
import { UploadsService } from 'src/uploads/uploads.service';

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
    private mailingService: MailingService, // <--- Inject the Mailing Service
    private uploadsService: UploadsService, // <--- Inject the Mailing Service
  ) {}
  private resend = new Resend(RESEND_API_KEY);
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;

  /**
   * Helper to generate JWT and return standard response
   */
  private generateAuthResponse(user: User) {
    const payload = { id: user.id, name: user.fullname };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        phone_number: user.phone_number,
        date_of_birth: user.date_of_birth,
        email_verified: user.email_verified,
        provider: user.provider,
        role: user.role,
        location: user.location,
        gender: user.gender,
        phone_verified: user.phone_verified,
        status: user.status,
        created_at: user.created_at,
        updated_at: user.updated_at,
      },
    };
  }

  async getUserFromToken(token: string): Promise<User> {
    try {
      const payload: { id: string; name: string } =
        this.jwtService.verify(token);
      const user = await this.userRepo.findOne({
        where: { id: Number(payload.id) },
      });
      if (!user) throw new UnauthorizedException('User not found');
      return user;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  async createOrLoginGoogleUser(profile: GoogleProfileDto) {
    const googleId = profile.id;

    // 1. Find user by Google ID
    let user = await this.userRepo.findOne({
      where: { google_id: googleId },
    });

    // 2. fallback by email
    if (!user && profile.email) {
      user = await this.userRepo.findOne({
        where: { email: profile.email },
      });
    }

    // 3. update or create
    if (user) {
      user.google_id = googleId;
      user.fullname = user.fullname || profile.name || '';
      user.avatar_id = user.avatar_id || profile.avatarId;
    } else {
      user = this.userRepo.create({
        google_id: googleId,
        email: profile.email,
        fullname: profile.name,
        avatar_id: profile.avatarId,
        provider: AuthProvider.GOOGLE,
        email_verified: true,
      });
    }

    await this.userRepo.save(user);

    const { token } = this.generateAuthResponse(user);

    return {
      user,
      token,
    };
  }

  async googleLogin(idToken: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) throw new UnauthorizedException();
    // 1. Handle the avatar dynamically
    let avatarId: number | null = null;

    if (payload.picture) {
      // Pass the picture URL, your 'avatars' folder type, and a unique identifier name
      const upload = await this.uploadsService.uploadFileFromUrl(
        payload.picture,
        'user-profile',
        `google-${payload.sub}`,
      );

      // If it successfully uploaded, grab the DB ID
      if (upload) avatarId = upload.id;
    }

    // 2. Pass it straight into your user creator
    return this.createOrLoginGoogleUser({
      id: payload.sub,
      email: payload.email!,
      name: payload.name ?? '',
      avatarId: avatarId || undefined,
      username: '',
    });
  }

  async registerLocal(
    fullname: string,
    email: string,
    password: string,
    phone_number: string,
    date_of_birth: string,
  ) {
    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) throw new BadRequestException('Email already in use');

    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
    const verificationToken = uuidv4();

    // Create a username
    const baseUsername = fullname.toLowerCase().replace(/\s/g, '');
    const username = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`;

    const user = this.userRepo.create({
      fullname,
      username,
      email,
      phone_number,
      date_of_birth,
      password: hashedPassword,
      verification_token: verificationToken,
      provider: AuthProvider.LOCAL,
      email_verified: false,
    });

    await this.userRepo.save(user);

    // --- UPDATED MAILING LOGIC ---
    const verifyUrl = `${CLIENT_BASEURL}/auth/verify?token=${verificationToken}`;

    try {
      // Use your MailingService instead of Resend
      await this.mailingService.sendWelcomeEmail(email, fullname, verifyUrl);
    } catch (error) {
      // We catch the error so the user still gets registered even if the email fails
      this.logger.error(`Welcome email failed for ${email}:`, error);
    }

    return this.generateAuthResponse(user);
  }

  async verifyEmail(token: string) {
    const user = await this.userRepo.findOne({
      where: { verification_token: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    user.email_verified = true;

    // Simply set to null. TypeORM handles this correctly if the column is nullable.
    user.verification_token = null as unknown as undefined;

    await this.userRepo.save(user);

    return {
      message: 'Email successfully verified!',
      verified: true,
    };
  }

  async loginLocal(email: string, password: string) {
    // Only allow local login if the user actually has a local account/password
    const user = await this.userRepo.findOne({
      where: { email },
      select: [
        'id',
        'password',
        'fullname',
        'email',
        'avatar',
        'username',
        'provider',
        'role',
        'location',
        'phone_number',
        'date_of_birth',
        'location',
        'gender',
        'email_verified',
        'status',
        'bio',
        'phone_verified',
        'created_at',
        'updated_at',
      ], // Ensure password is fetched
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // COMPARE HASHED PASSWORD
    const isMatch: boolean = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    return this.generateAuthResponse(user);
  }

  /**
   * STEP 1 & 2: Send the 6-digit code
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });

    // For security, don't tell the user if the email doesn't exist
    if (!user)
      return { message: 'If this email exists, a code has been sent.' };

    // Generate a simple 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save code to user (we use verificationToken for this to avoid adding more columns)
    user.verification_token = code;
    await this.userRepo.save(user);

    // Send the email using your existing MailingService
    await this.mailingService.sendVerificationCode(user.email, code, true);

    return { message: 'Code sent successfully' };
  }

  /**
   * STEP 3: Verify code and Update password
   */
  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepo.findOne({
      where: {
        email: dto.email,
        verification_token: dto.code,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid code or email');
    }

    // Hash the new password
    user.password = await bcrypt.hash(dto.newPassword, this.SALT_ROUNDS);

    // Clear the token so it can't be used again
    user.verification_token = null as unknown as undefined;

    await this.userRepo.save(user);

    return { message: 'Password reset successful. You can now login.' };
  }

  // src/auth/auth.service.ts
  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');

    // If they are changing username, check if it's already taken by someone else
    if (dto.username && dto.username !== user.username) {
      const existing = await this.userRepo.findOne({
        where: { username: dto.username },
      });
      if (existing) throw new BadRequestException('Username is already taken');
    }

    // Merge the DTO into the user entity
    Object.assign(user, dto);

    const updatedUser = await this.userRepo.save(user);

    // Return the standard response format you already use
    return this.generateAuthResponse(updatedUser);
  }

  // Logout: Invalidate the token (server-side logic if using Redis/DB)
  async logout(userId: number) {
    // For stateless JWT, we can't invalidate the token server-side
    // You can handle this client-side by deleting the token
    // Or implement a blacklisting system if needed
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    // user.currentHashedRefreshToken = null;
    await this.userRepo.save(user);
    return { message: 'Logged out successfully' };
  }
}
