import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type PrescriptionDocument = Prescription & Document;

export enum PrescriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  // "dispensed" is set by the future Pharmacy module once it exists -
  // left out of this enum for now rather than half-implementing a status
  // this module can't actually transition into yet.
}

@Schema({ _id: false })
class PrescribedMedicine {
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) dosage: string; // e.g. "500mg"
  @Prop({ required: true }) frequency: string; // e.g. "1-0-1" or "twice daily"
  @Prop({ required: true }) duration: string; // e.g. "5 days"
  @Prop() instructions?: string; // e.g. "after food"
}
const PrescribedMedicineSchema = SchemaFactory.createForClass(PrescribedMedicine);

/**
 * Deliberately separate from MedicalRecord: a pharmacist needs to read a
 * prescription to dispense medicine, but has no clinical reason to see the
 * diagnosis or doctor's notes behind it. Splitting the schema makes that
 * narrower RBAC trivial instead of requiring field-level access control
 * inside one giant "visit" document.
 */
@Schema({ timestamps: true })
export class Prescription {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', required: true, index: true })
  appointmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  patientUserId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop({ type: [PrescribedMedicineSchema], required: true })
  medicines: PrescribedMedicine[];

  @Prop()
  notes?: string;

  @Prop({ required: true, enum: PrescriptionStatus, default: PrescriptionStatus.ACTIVE })
  status: PrescriptionStatus;

  @Prop()
  cancelReason?: string;
}

export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);
PrescriptionSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });
applyTenantPlugin(PrescriptionSchema);