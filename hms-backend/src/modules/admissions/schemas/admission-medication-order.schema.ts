import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type AdmissionMedicationOrderDocument = AdmissionMedicationOrder & Document;

export enum AdministrationStatus {
  ADMINISTERED = 'administered',
  MISSED = 'missed',
  HELD = 'held',
}

@Schema({ _id: false })
class AdministrationEntry {
  @Prop({ required: true, default: Date.now }) administeredAt: Date;
  @Prop({ required: true, enum: AdministrationStatus }) status: AdministrationStatus;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true }) administeredBy: Types.ObjectId;
  @Prop() notes?: string;
}
const AdministrationEntrySchema = SchemaFactory.createForClass(AdministrationEntry);

// The Medication Administration Record (MAR): a doctor's standing order
// for an admitted patient, plus a running log of every dose given/missed/
// held against it - the nurse's checklist screen reads/writes this.
@Schema({ timestamps: true })
export class AdmissionMedicationOrder {
  @Prop({ type: Types.ObjectId, ref: 'Admission', required: true, index: true })
  admissionId: Types.ObjectId;

  @Prop({ required: true })
  medicineName: string;

  @Prop({ required: true })
  dosage: string;

  @Prop({ required: true })
  route: string; // e.g. "oral", "IV", "IM"

  @Prop({ required: true })
  frequency: string; // e.g. "every 8 hours"

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  orderedBy: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: [AdministrationEntrySchema], default: [] })
  administrations: AdministrationEntry[];
}

export const AdmissionMedicationOrderSchema = SchemaFactory.createForClass(AdmissionMedicationOrder);
AdmissionMedicationOrderSchema.index({ hospitalId: 1, admissionId: 1 });
applyTenantPlugin(AdmissionMedicationOrderSchema);