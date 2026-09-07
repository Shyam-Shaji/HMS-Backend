import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";

export interface GatewayOrder {
  gatewayOrderId: string;
  amount: number;
  currency: string;
}

/**
 * MOCK payment gateway integration. This exists so the rest of the
 * billing flow (invoice -> initiate online payment -> confirm -> mark
 * paid) is fully wired end-to-end, but it does NOT talk to a real
 * processor. Swapping in Razorpay/Stripe/PayU means:
 *
 * 1. createOrder(): call the real SDK's order/paymentIntent creation
 *    endpoint instead of generating a random id.
 * 2. verifyPayment(): verify the gateway's signature/webhook payload
 *    properly (e.g. Razorpay: HMAC-SHA256 of orderId+paymentId using your
 *    key secret; Stripe: construct the event from the webhook signature
 *    header using stripe.webhooks.constructEvent). The mock below always
 *    returns true, which is obviously NOT safe to ship - it exists only so
 *    the request/response shapes in BillingController don't need to
 *    change when you swap this out.
 * 3. Add the real gateway's publishable/secret keys to configuration.ts
 *    and validation.schema.ts (follow the JWT secrets pattern already
 *    there for how required secrets are validated at boot).
 */
@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger('PaymentGateway[MOCK]');

  async createOrder(amount: number, currency = 'INR'): Promise<GatewayOrder> {
    const gatewayOrderId = `mock_order_${randomUUID()}`;
    this.logger.debug(`Created mock gateway order ${gatewayOrderId} for ${amount} ${currency}`);
    return { gatewayOrderId, amount, currency };
  }

  async verifyPayment(gatewayOrderId: string, gatewayPaymentId: string, signature: string): Promise<boolean> {
    this.logger.debug(`[MOCK] Verifying payment ${gatewayPaymentId} for order ${gatewayOrderId}`);
    // Real implementation MUST cryptographically verify `signature` here.
    return Boolean(gatewayOrderId && gatewayPaymentId && signature);
  }
}
