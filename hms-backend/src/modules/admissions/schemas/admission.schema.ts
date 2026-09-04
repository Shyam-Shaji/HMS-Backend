import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type AdmissionDocument = Admission & Document;

export enum AdmissionStatus {
    ADMITTED = 'admitted',
    DISCHARGED = 'discharged',
}

export enum AdmissionType {
    EMERGENCY = 'emergency',
    PLANNED = 'planned',
}

@Schema({ _id: false })
class TransferRecord {
  @Prop({ type: Types.ObjectId, ref: 'Ward' }) fromWardId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Bed' }) fromBedId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Ward' }) toWardId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'Bed' }) toBedId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'User' }) transferredBy: Types.ObjectId;
  @Prop({ default: Date.now }) transferredAt: Date;
  @Prop() reason?: string;
}
const TransferRecordSchema = SchemaFactory.createForClass(TransferRecord);

@Schema({ _id: false })
class DischargeSummary {
  @Prop() finalDiagnosis?: string;
  @Prop() summary?: string;
  @Prop() followUpInstructions?: string;
  @Prop({ type: Types.ObjectId, ref: 'User' }) dischargedBy?: Types.ObjectId;
  @Prop({ default: false }) nurseChecklistCompleted: boolean;
}
const DischargeSummarySchema = SchemaFactory.createForClass(DischargeSummary);

/**
 * One IPD stay. Ward/bed live on this record (current placement); every
 * move is also appended to transferHistory so "how did this patient move
 * through the hospital" is fully reconstructable later (audit/billing both
 * care about this - billing needs per-ward day counts for charges).
 */
@Schema({ timestamps: true })
export class Admission {
  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  patientUserId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', default: null })
  appointmentId: Types.ObjectId | null; // set if admission originated from an OPD visit

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  admittingDoctorId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Ward', required: true, index: true })
  wardId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Bed', required: true, index: true })
  bedId: Types.ObjectId;

  @Prop({ required: true, enum: AdmissionType })
  admissionType: AdmissionType;

  @Prop()
  reasonForAdmission?: string;

  @Prop()
  provisionalDiagnosis?: string;

  @Prop({ required: true, default: Date.now })
  admissionDate: Date;

  @Prop()
  estimatedDischargeDate?: Date;

  @Prop({ required: true, enum: AdmissionStatus, default: AdmissionStatus.ADMITTED, index: true })
  status: AdmissionStatus;

  @Prop({ type: [TransferRecordSchema], default: [] })
  transferHistory: TransferRecord[];

  @Prop()
  dischargeDate?: Date;

  @Prop({ type: DischargeSummarySchema })
  dischargeSummary?: DischargeSummary;
}

export const AdmissionSchema = SchemaFactory.createForClass(Admission);
AdmissionSchema.index({ hospitalId: 1, status: 1 });
// A bed can only have one ACTIVE admission at a time - defence-in-depth
// alongside the atomic bed-status flip done in the service layer.
AdmissionSchema.index(
  { hospitalId: 1, bedId: 1 },
  { unique: true, partialFilterExpression: { status: AdmissionStatus.ADMITTED } },
);
applyTenantPlugin(AdmissionSchema);