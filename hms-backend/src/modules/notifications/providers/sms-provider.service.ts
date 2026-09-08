import { Injectable, Logger } from "@nestjs/common";

export interface SendResult {
    success: boolean;
    providerRef?: string;
    error?: string;
}

/**
 * MOCK SMS provider. Logs instead of sending. Swap in Twilio/MSG91:
 * - Add their API key/from-number to configuration.ts + validation.schema.ts
 *   (follow the JWT secrets pattern already there).
 * - Replace the body of send() with the real SDK call.
 * - Keep the SendResult shape so NotificationsService doesn't need to change.
 */
@Injectable()
export class SmsProviderService {
    private readonly logger = new Logger('SmsProvider[MOCK]');

    async send(to: string, message: string): Promise<SendResult> {
        this.logger.debug(`[MOCK SMS] to=${to} :: ${message}`);
        return {success: true, providerRef: `mock_sms_${Date.now()}`};
    }
}