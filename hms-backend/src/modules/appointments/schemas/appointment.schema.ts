import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type AppointmentDocument = Appointment & Document;

export enum AppointmentStatus {
  BOOKED = 'booked',
  CHECKED_IN = 'checked_in',
  IN_CONSULTATION = 'in_consultation',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum AppointmentType {
  IN_PERSON = 'in_person',
  VIDEO = 'video',
}

@Schema({ timestamps: true })
export class Appointment {
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  // Denormalized from Patient.userId at booking time so the patient portal
  // can query "my appointments" directly (their JWT hospitalId is null,
  // so the tenant plugin doesn't scope them to one hospital - this field does
  // the scoping instead, across all hospitals they've booked with).
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  patientUserId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop()
  department?: string;

  // scheduledDate = midnight of the day (fast range queries / grouping);
  // scheduledTime = "HH:mm"; scheduledAt = the two combined (exact instant,
  // used for the uniqueness guard against double-booking).
  @Prop({ required: true, index: true })
  scheduledDate: Date;

  @Prop({ required: true })
  scheduledTime: string;

  @Prop({ required: true })
  scheduledAt: Date;

  @Prop({ default: 15 })
  durationMinutes: number;

  // Sequential per doctor per day - what gets shown on the waiting-room
  // board and the patient's "you are #4" live status.
  @Prop({ required: true })
  tokenNumber: number;

  @Prop({ required: true, enum: AppointmentStatus, default: AppointmentStatus.BOOKED, index: true })
  status: AppointmentStatus;

  @Prop({ enum: AppointmentType, default: AppointmentType.IN_PERSON })
  type: AppointmentType;

  @Prop()
  reason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  bookedBy?: Types.ObjectId; // staff member who booked it, or the patient themself

  @Prop()
  checkInTime?: Date;

  @Prop()
  consultationStartTime?: Date;

  @Prop()
  consultationEndTime?: Date;

  @Prop()
  cancelReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  cancelledBy?: Types.ObjectId;
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// DB-level double-booking guard: only ACTIVE appointments (not cancelled/
// no-show) are constrained to uniqueness on (hospital, doctor, exact time).
// This protects against race conditions even if two requests hit the
// service at the exact same millisecond for the same slot.
AppointmentSchema.index(
  { hospitalId: 1, doctorId: 1, scheduledAt: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [AppointmentStatus.BOOKED, AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_CONSULTATION] },
    },
  },
);
AppointmentSchema.index({ hospitalId: 1, doctorId: 1, scheduledDate: 1, tokenNumber: 1 });

applyTenantPlugin(AppointmentSchema);
