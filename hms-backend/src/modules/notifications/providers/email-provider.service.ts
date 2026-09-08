import { Injectable, Logger } from "@nestjs/common";
import { SendResult } from "./sms-provider.service";

/**
 * MOCK email provider. Logs instead of sending. Swap in SendGrid/
 * Nodemailer+SMTP: add credentials to configuration.ts + validation.schema.ts,
 * replace the body of send() with the real call, keep the SendResult shape.
 */
@Injectable()
export class EmailProviderService {
  private readonly logger = new Logger('EmailProvider[MOCK]');

  async send(to: string, subject: string, body: string): Promise<SendResult> {
    this.logger.debug(`[MOCK EMAIL] to=${to} subject="${subject}" :: ${body}`);
    return { success: true, providerRef: `mock_email_${Date.now()}` };
  }
}
