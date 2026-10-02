import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Mailgun = require('mailgun.js');
import formData from 'form-data';
import { MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_ENDPOINT } from 'src/env';
import { IMailgunClient } from 'node_modules/mailgun.js/Types/Interfaces';
import * as path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';

@Injectable()
export class MailingService {
  private mg: IMailgunClient;
  private readonly logger = new Logger(MailingService.name);

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const mailgun = new (Mailgun as any)(formData);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.mg = mailgun.client({
      username: 'api',
      key: MAILGUN_API_KEY,
      url: `https://${MAILGUN_ENDPOINT}`, // api.mailgun.net
    });
  }

  /**
   * MAPPER & COMPILER: Loads HTML from folder and injects variables
   */
  private getHtmlContent(templateName: string, vars: any): string {
    try {
      // 1. Try the PRODUCTION path first (dist/src/...)
      const prodPath = path.resolve(
        process.cwd(),
        `dist/src/mailing/templates/${templateName}.html`,
      );

      // 2. Try the DEVELOPMENT path as fallback (src/...)
      const devPath = path.resolve(
        process.cwd(),
        `src/mailing/templates/${templateName}.html`,
      );

      // 3. Decide which one to use
      const finalPath = fs.existsSync(prodPath) ? prodPath : devPath;

      if (!fs.existsSync(finalPath)) {
        throw new Error(`Template file not found at ${finalPath}`);
      }

      // 4. Read and Compile
      const source = fs.readFileSync(finalPath, 'utf8');
      const template = handlebars.compile(source);

      return template(vars);
    } catch (error: any) {
      this.logger.error(
        `Template ${templateName} error: ${(error as { message: string }).message}`,
      );
      throw new InternalServerErrorException('Email template error');
    }
  }

  /**
   * CORE: Now uses HTML instead of Mailgun-hosted templates
   */
  private async send(
    to: string,
    subject: string,
    templateName: string,
    vars: any,
  ) {
    try {
      // Get compiled HTML
      const htmlBody = this.getHtmlContent(templateName, vars);

      const response = await this.mg.messages.create(MAILGUN_DOMAIN, {
        from: `G.E.M Fundraise <noreply@${MAILGUN_DOMAIN}>`,
        to: [to],
        subject: subject,
        html: htmlBody, // Changed from 'template' to 'html'
      });

      return response;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * TYPE 1: Thank You Email to Donor
   */
  async sendDonorSuccessEmail(
    email: string,
    amount: number,
    campaignTitle: string,
  ) {
    return this.send(email, 'Donation Successful! ❤️', 'donation-success', {
      amount: amount.toLocaleString(),
      campaign_title: campaignTitle,
    });
  }

  /**
   * TYPE 2: Notification to Campaign Owner
   */
  async sendOwnerNotification(
    ownerEmail: string,
    donorName: string,
    amount: number,
    campaignTitle: string,
  ) {
    return this.send(ownerEmail, 'New Donation Received! 🚀', 'new-donation', {
      donor_name: donorName || 'An anonymous donor',
      amount: amount.toLocaleString(),
      campaign_title: campaignTitle,
    });
  }

  /**
   * TYPE 3: Goal Reached Notification
   */
  async sendGoalReachedEmail(ownerEmail: string, campaignTitle: string) {
    return this.send(
      ownerEmail,
      'Congratulations! Goal Reached! 🎉',
      'goal_reached',
      {
        campaign_title: campaignTitle,
      },
    );
  }

  /**
   * TYPE 4: Manual Admin Email
   */
  async sendGenericEmail(
    to: string,
    subject: string,
    template: string,
    vars: any,
  ) {
    return this.send(to, subject, template, vars);
  }

  /**
   * TYPE 5: Verification Code (Sign up or Forgot Password)
   *
    {
          "to": "user@example.com",
          "subject": "Reset Your Password",
          "template": "email-verification",
          "variables": {
            "code": "552931",
            "message": "resetting your password"
          }
      }
   *
   */
  async sendVerificationCode(
    email: string,
    code: string,
    isPasswordReset: boolean = false,
  ) {
    const action = isPasswordReset
      ? 'resetting your password'
      : 'verifying your account';
    const subject = isPasswordReset
      ? 'Password Reset Code'
      : 'Verify Your Email';

    return this.send(email, subject, 'email-verification', {
      code: code,
      message: action,
    });
  }

  /**
   * TYPE 6: Welcome & Verification Email
   */
  async sendWelcomeEmail(email: string, fullname: string, verifyUrl: string) {
    return this.send(email, 'Welcome to G.E.M Fundraise! 🌟', 'welcome', {
      fullname,
      verifyUrl,
    });
  }
}
