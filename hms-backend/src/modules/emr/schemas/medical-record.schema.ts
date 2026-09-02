import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type MedicalRecordDocument = MedicalRecord & Document;

export enum MedicalRecordStatus {
  DRAFT = 'draft',
  FINALIZED = 'finalized',
}

@Schema({ _id: false })
class Vitals {
  @Prop() heightCm?: number;
  @Prop() weightKg?: number;
  @Prop() temperatureC?: number;
  @Prop() bloodPressureSystolic?: number;
  @Prop() bloodPressureDiastolic?: number;
  @Prop() pulseRate?: number;
  @Prop() respiratoryRate?: number;
  @Prop() spo2?: number;
  @Prop({ type: Types.ObjectId, ref: 'User' }) recordedBy?: Types.ObjectId;
  @Prop() recordedAt?: Date;
}
const VitalsSchema = SchemaFactory.createForClass(Vitals);

@Schema({ _id: false })
class Diagnosis {
  @Prop({ required: true }) description: string;
  @Prop() icd10Code?: string;
}
const DiagnosisSchema = SchemaFactory.createForClass(Diagnosis);

@Schema({ _id: false })
class RecordAttachment {
  @Prop() type: string; // e.g. "referral_letter", "scanned_note"
  @Prop() url: string;
  @Prop({ default: Date.now }) uploadedAt: Date;
}
const RecordAttachmentSchema = SchemaFactory.createForClass(RecordAttachment);

/**
 * One MedicalRecord = one visit's clinical documentation, 1:1 with an
 * Appointment. Split from Prescription (separate schema/module) on
 * purpose: a pharmacist dispensing medicine should be able to read the
 * prescription without being handed the full diagnosis/notes - narrower
 * data exposure than one giant "visit" document would allow.
 *
 * IMMUTABILITY: once status is FINALIZED, the service layer blocks further
 * edits. This matches real clinical record-keeping - a finalized note
 * doesn't get silently rewritten; a correction is a new addendum (not
 * modeled yet, flagged for a later phase).
 */
@Schema({ timestamps: true })
export class MedicalRecord {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true, unique: true, index: true })
  appointmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  // Denormalized for the same reason as Appointment.patientUserId - lets a
  // patient's JWT (hospitalId: null) query their own records directly.
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  patientUserId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop({ required: true })
  visitDate: Date;

  @Prop()
  chiefComplaint?: string;

  @Prop({ type: VitalsSchema, default: {} })
  vitals: Vitals;

  @Prop({ type: [DiagnosisSchema], default: [] })
  diagnosis: Diagnosis[];

  @Prop()
  doctorNotes?: string;

  @Prop()
  followUpDate?: Date;

  @Prop()
  referredTo?: string; // free-text specialist/department referral note

  @Prop({ type: [RecordAttachmentSchema], default: [] })
  attachments: RecordAttachment[];

  @Prop({ required: true, enum: MedicalRecordStatus, default: MedicalRecordStatus.DRAFT })
  status: MedicalRecordStatus;

  @Prop()
  finalizedAt?: Date;
}

export const MedicalRecordSchema = SchemaFactory.createForClass(MedicalRecord);
MedicalRecordSchema.index({ hospitalId: 1, patientId: 1, visitDate: -1 });
applyTenantPlugin(MedicalRecordSchema);