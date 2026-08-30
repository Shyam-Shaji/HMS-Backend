import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type DoctorAvailabilityDocument = DoctorAvailability & Document;

@Schema({ timestamps: true })
export class DoctorAvailability {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop({ required: true, min: 0, max: 6 })
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday

  @Prop({ required: true })
  startTime: string; // "HH:mm"

  @Prop({ required: true })
  endTime: string; // "HH:mm"

  @Prop({ default: 15 })
  slotDurationMinutes: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const DoctorAvailabilitySchema = SchemaFactory.createForClass(DoctorAvailability);
DoctorAvailabilitySchema.index({ hospitalId: 1, doctorId: 1, dayOfWeek: 1 });
applyTenantPlugin(DoctorAvailabilitySchema);