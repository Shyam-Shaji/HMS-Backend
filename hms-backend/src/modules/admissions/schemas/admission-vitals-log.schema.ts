import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type AdmissionVitalsLogDocument = AdmissionVitalsLog & Document;

// Time-series vitals for an admitted patient - unlike OPD's one-vitals-set-
// per-visit (MedicalRecord.vitals), IPD nursing charts vitals repeatedly
// through the day, so this is its own append-only collection.
@Schema({ timestamps: true })
export class AdmissionVitalsLog {
  @Prop({ type: Types.ObjectId, ref: 'Admission', required: true, index: true })
  admissionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recordedBy: Types.ObjectId;

  @Prop({ required: true, default: Date.now })
  recordedAt: Date;

  @Prop() temperatureC?: number;
  @Prop() bloodPressureSystolic?: number;
  @Prop() bloodPressureDiastolic?: number;
  @Prop() pulseRate?: number;
  @Prop() respiratoryRate?: number;
  @Prop() spo2?: number;
  @Prop() notes?: string;
}

export const AdmissionVitalsLogSchema = SchemaFactory.createForClass(AdmissionVitalsLog);
AdmissionVitalsLogSchema.index({ hospitalId: 1, admissionId: 1, recordedAt: -1 });
applyTenantPlugin(AdmissionVitalsLogSchema);
