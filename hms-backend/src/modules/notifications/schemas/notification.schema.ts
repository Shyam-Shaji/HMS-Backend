import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  OTP = 'otp',
  APPOINTMENT_CONFIRMATION = 'appointment_confirmation',
  APPOINTMENT_REMINDER = 'appointment_reminder',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  LAB_REPORT_READY = 'lab_report_ready',
  PRESCRIPTION_READY = 'prescription_ready',
  BILL_GENERATED = 'bill_generated',
  DISCHARGE_SUMMARY = 'discharge_summary',
  LOW_STOCK_ALERT = 'low_stock_alert',
  CUSTOM = 'custom',
}

export enum NotificationChannel {
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum ChannelDeliveryStatus {
  SENT = 'sent',
  FAILED = 'failed',
  SKIPPED = 'skipped', // e.g. user has no email on file, or opted out of this channel
}

@Schema({ _id: false })
class ChannelDelivery {
  @Prop({ required: true, enum: NotificationChannel }) channel: NotificationChannel;
  @Prop({ required: true, enum: ChannelDeliveryStatus }) status: ChannelDeliveryStatus;
  @Prop() providerRef?: string;
  @Prop() error?: string;
}
const ChannelDeliverySchema = SchemaFactory.createForClass(ChannelDelivery);

// One event, fanned out across whichever channels were attempted. The
// in-app inbox entry always exists (channel: IN_APP is never skipped) so
// "every SMS/email/push event is also visible in-app" - a requirement
// from the UI/UX plan - holds structurally rather than by convention.
@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: NotificationType, index: true })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: [ChannelDeliverySchema], required: true })
  channels: ChannelDelivery[];

  // Loose reference, same pattern as Invoice.lineItems[].referenceId -
  // points at whatever triggered this (an appointment, invoice, lab
  // order...) across several possible collections.
  @Prop()
  relatedEntityType?: string;

  @Prop()
  relatedEntityId?: string;

  @Prop({ default: false, index: true })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ hospitalId: 1, userId: 1, createdAt: -1 });
applyTenantPlugin(NotificationSchema);