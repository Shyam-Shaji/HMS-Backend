import { Injectable, Logger } from "@nestjs/common";
import { SendResult } from "./sms-provider.service";

/**
 * MOCK push provider. Logs instead of sending. Swap in Firebase Cloud
 * Messaging: this needs device tokens registered per user, which aren't
 * modeled yet (no DeviceToken schema exists) - a real implementation
 * needs that addition first, then a call to admin.messaging().send() here.
 */
@Injectable()
export class PushProviderService {
  private readonly logger = new Logger('PushProvider[MOCK]');

  async send(userId: string, title: string, body: string): Promise<SendResult> {
    this.logger.debug(`[MOCK PUSH] userId=${userId} title="${title}" :: ${body}`);
    return { success: true, providerRef: `mock_push_${Date.now()}` };
  }
}