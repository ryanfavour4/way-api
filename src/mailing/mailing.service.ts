import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME } from 'src/env';
import * as path from 'path';
import * as fs from 'fs';
import * as handlebars from 'handlebars';

@Injectable()
export class MailingService {
  // Infer client type dynamically to avoid node_modules path errors
  private readonly logger = new Logger(MailingService.name);
  private readonly brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

  constructor() {}

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
      // 1. Compile your existing Handlebars templates into static HTML
      const htmlBody = this.getHtmlContent(templateName, vars);

      // 2. Format the payload per Brevo API specifications
      const payload = {
        sender: {
          name: BREVO_SENDER_NAME || 'ICM Team',
          email: BREVO_SENDER_EMAIL,
        },
        to: [{ email: to }], // You can add a name here if you pass it down later
        subject: subject,
        htmlContent: htmlBody,
      };

      // 3. Send via Brevo HTTP API
      const response = await fetch(this.brevoApiUrl, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const errorData = await response.json().catch(() => null);
        this.logger.error(
          `Brevo API Error: ${response.status} - ${response.statusText}`,
          errorData,
        );
        throw new Error(`Brevo rejected the request: ${response.statusText}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data = await response.json();
      this.logger.log(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Email sent successfully to ${to}. MessageId: ${data.messageId}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return data;
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw new InternalServerErrorException('Failed to send email');
    }
  }

  /**
   * TYPE 1: Thank You Email to Donor
   */
  async sendDonorSuccessEmail(
    email: string,
    amount: number,
    projectName: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.send(email, 'Donation Successful! ❤️', 'donation-success', {
      amount: amount.toLocaleString(),
      project_name: projectName,
    });
  }

  /**
   * TYPE 2: Notification to Project Owner
   */
  async sendOwnerNotification(
    ownerEmail: string,
    donorName: string,
    amount: number,
    projectName: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.send(ownerEmail, 'New Donation Received! 🚀', 'new-donation', {
      donor_name: donorName || 'An anonymous donor',
      amount: amount.toLocaleString(),
      project_name: projectName,
    });
  }

  /**
   * TYPE 3: Goal Reached Notification
   */
  async sendGoalReachedEmail(ownerEmail: string, projectName: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.send(
      ownerEmail,
      'Congratulations! Goal Reached! 🎉',
      'goal_reached',
      {
        project_name: projectName,
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.send(email, subject, 'email-verification', {
      code: code,
      message: action,
    });
  }

  /**
   * TYPE 6: Welcome & Verification Email
   */
  async sendWelcomeEmail(email: string, fullname: string, verifyUrl: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return this.send(email, 'Welcome to WAY! 🧭 ↗️', 'welcome', {
      fullname,
      verifyUrl,
    });
  }
}
