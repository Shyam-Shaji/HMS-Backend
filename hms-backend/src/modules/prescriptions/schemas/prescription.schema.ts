import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { applyTenantPlugin } from '../../../common/plugins/tenant.plugin';

export type PrescriptionDocument = Prescription & Document;

export enum PrescriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
}

export enum DispenseStatus {
  NOT_DISPENSED = 'not_dispensed',
  PARTIALLY_DISPENSED = 'partially_dispensed',
  FULLY_DISPENSED = 'fully_dispensed',
}

@Schema({ _id: false })
class PrescribedMedicine {
  // Stable identifier for this line, independent of Mongo's subdocument
  // _id (disabled at the schema level below) - the Pharmacy module
  // references a specific line by this id when recording a dispense, so
  // atomic array-element updates (arrayFilters) have something reliable
  // to match on even though the line describes a free-text drug name, not
  // a catalog reference.
  @Prop({ default: () => randomUUID() })
  lineId: string;

  @Prop({ required: true }) name: string;
  @Prop({ required: true }) dosage: string; // e.g. "500mg"
  @Prop({ required: true }) frequency: string; // e.g. "1-0-1" or "twice daily"
  @Prop({ required: true }) duration: string; // e.g. "5 days"
  @Prop() instructions?: string; // e.g. "after food"

  // Total units the doctor intends the patient to receive (optional -
  // some doctors just write dosage/frequency/duration and let the
  // pharmacist work out quantity). Pharmacy dispenses against this.
  @Prop() quantity?: number;
  @Prop({ default: 0 }) quantityDispensed: number;
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

  // Rolled up by PharmacyService after every dispense event - lets the
  // pharmacy queue screen filter to "still needs dispensing" without
  // inspecting every line of every prescription.
  @Prop({ required: true, enum: DispenseStatus, default: DispenseStatus.NOT_DISPENSED, index: true })
  dispenseStatus: DispenseStatus;
}

export const PrescriptionSchema = SchemaFactory.createForClass(Prescription);
PrescriptionSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });
applyTenantPlugin(PrescriptionSchema);
