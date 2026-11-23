import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MailingService } from './mailing.service';
import { SendManualMailDto } from './dto/create-mailing.dto';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';
import { UserRole } from 'src/users/entities/users.entity';

@Controller('mailing')
export class MailingController {
  constructor(private readonly mailingService: MailingService) {}

  @Post('send-manual')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.ADMIN_STAFF)
  async sendManual(@Body() dto: SendManualMailDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await this.mailingService.sendGenericEmail(
      dto.to,
      dto.subject,
      dto.template,
      dto.variables,
    );
  }
}
