import {
  Controller,
  Post,
  Body,
  Get,
  Headers,
  UnauthorizedException,
  UseGuards,
  Req,
  Res,
  BadRequestException,
  Query,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/create-auth.dto';
import type { Response } from 'express';
import { CLIENT_BASEURL } from 'src/env';
import { JwtAuthGuard } from './guard/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  async me(@Headers('authorization') authHeader: string) {
    if (!authHeader) throw new UnauthorizedException('No token provided');

    const token = authHeader.replace('Bearer ', '');
    return this.authService.getUserFromToken(token);
  }

  @Post('google')
  async googleLogin(@Body() body: { idToken: string }) {
    return this.authService.googleLogin(body.idToken);
  }

  @Post('register')
  async register(@Body() body: RegisterDto) {
    const { fullname, email, password, telephone, birthday } = body;

    return this.authService.registerLocal(
      fullname,
      email,
      password,
      telephone,
      birthday,
    );
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, res: Response) {
    if (!token) throw new BadRequestException('No token provided');

    await this.authService.verifyEmail(token);

    // Send them back to your site so they see a real page, not code
    return res.redirect(`${CLIENT_BASEURL}/auth/verify?verified=true`);
  }

  @Post('login')
  async login(@Body() body: LoginDto) {
    const { email, password } = body;

    return this.authService.loginLocal(email, password);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Patch('update-profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Req() req: { user: { id: number } },
    @Body() dto: UpdateProfileDto,
  ) {
    // req.user.id comes from your JWT Strategy
    const userId = req.user.id;
    return this.authService.updateProfile(userId, dto);
  }

  @Post('logout')
  async logout(@Req() req: { user: { id: number } }, @Res() res: Response) {
    // req.user.id comes from your JWT Strategy
    const userId = req.user.id;
    await this.authService.logout(userId);
    return res.json({ message: 'Successfully logged out' });
  }
}
