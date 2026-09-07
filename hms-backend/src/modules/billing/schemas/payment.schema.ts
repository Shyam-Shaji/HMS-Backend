import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type PaymentDocument = Payment & Document;

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
  BANK_TRANSFER = 'bank_transfer',
  ONLINE_GATEWAY = 'online_gateway',
  INSURANCE = 'insurance',
}

export enum PaymentStatus {
  PENDING = 'pending', // online gateway payment initiated, awaiting confirmation
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

@Schema({ _id: false })
class RefundInfo {
  @Prop({ default: 0 }) refundedAmount: number;
  @Prop() refundedAt?: Date;
  @Prop({ type: Types.ObjectId, ref: 'User' }) refundedBy?: Types.ObjectId;
  @Prop() reason?: string;
}
const RefundInfoSchema = SchemaFactory.createForClass(RefundInfo);

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Invoice', required: true, index: true })
  invoiceId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, enum: PaymentMethod })
  method: PaymentMethod;

  @Prop({ required: true, enum: PaymentStatus, default: PaymentStatus.COMPLETED, index: true })
  status: PaymentStatus;

  // For in-person payments: whatever reference the staff's own card/UPI
  // terminal produced. For online gateway payments: the gateway's order
  // id, set at initiation.
  @Prop()
  transactionRef?: string;

  // Set once the gateway confirms - see PaymentGatewayService.
  @Prop()
  gatewayPaymentId?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  collectedBy?: Types.ObjectId; // billing staff who recorded it; null for patient-initiated online payments

  @Prop({ default: Date.now })
  paidAt: Date;

  @Prop({ type: RefundInfoSchema })
  refund?: RefundInfo;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ hospitalId: 1, invoiceId: 1, createdAt: -1 });
applyTenantPlugin(PaymentSchema);