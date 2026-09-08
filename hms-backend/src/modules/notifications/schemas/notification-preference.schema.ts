import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type NotificationPreferenceDocument = NotificationPreference & Document;

// Deliberately NOT tenant-scoped (no applyTenantPlugin) - a patient's
// notification preferences are a property of their platform-level account,
// not of any one hospital, same reasoning as User.hospitalId being null
// for patients.
@Schema({ timestamps: true })
export class NotificationPreference {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ default: true })
  smsEnabled: boolean;

  @Prop({ default: true })
  emailEnabled: boolean;

  @Prop({ default: true })
  pushEnabled: boolean;
}

export const NotificationPreferenceSchema = SchemaFactory.createForClass(NotificationPreference);
