import { Controller, Post, Body } from '@nestjs/common';
import { MailingService } from './mailing.service';
import { SendManualMailDto } from './dto/create-mailing.dto';

@Controller('mailing')
export class MailingController {
  constructor(private readonly mailingService: MailingService) {}

  @Post('send-manual')
  // Add your Admin Guard here later
  async sendManual(@Body() dto: SendManualMailDto) {
    return await this.mailingService.sendGenericEmail(
      dto.to,
      dto.subject,
      dto.template,
      dto.variables,
    );
  }
}
