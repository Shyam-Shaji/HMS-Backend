import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type LabOrderDocument = LabOrder & Document;

export enum LabOrderStatus {
  ORDERED = 'ordered',
  SAMPLE_COLLECTED = 'sample_collected',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum LabOrderPriority {
  ROUTINE = 'routine',
  URGENT = 'urgent',
  STAT = 'stat', // immediate/critical - drawn now, results ASAP
}

export enum ResultFlag {
  NORMAL = 'normal',
  LOW = 'low',
  HIGH = 'high',
  CRITICAL = 'critical',
}

@Schema({ _id: false })
class ResultParameter {
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) value: string; // stored as string - some results are qualitative ("positive"/"negative")
  @Prop() unit?: string;
  @Prop() referenceRangeLow?: number;
  @Prop() referenceRangeHigh?: number;
  @Prop({ enum: ResultFlag }) flag?: ResultFlag;
}
const ResultParameterSchema = SchemaFactory.createForClass(ResultParameter);

/**
 * One test order end-to-end: from a doctor ordering it (during an OPD
 * visit OR an IPD admission - exactly one of appointmentId/admissionId is
 * set) through sample collection, processing, and a verified result.
 * Results live embedded here rather than a separate collection since it's
 * strictly 1:1 with the order - same reasoning as MedicalRecord's vitals.
 *
 * IMMUTABILITY: once verified (status COMPLETED), result fields are
 * locked by the service layer, same pattern as EMR's finalize step - a
 * verified lab result is a clinical/legal record, not a draft.
 */
@Schema({ timestamps: true })
export class LabOrder {
  @Prop({ type: Types.ObjectId, ref: 'Appointment', default: null })
  appointmentId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Admission', default: null })
  admissionId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  patientUserId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  orderedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'TestCatalog', required: true })
  testId: Types.ObjectId;

  // Denormalized so the order's record survives a later catalogue rename.
  @Prop({ required: true })
  testNameSnapshot: string;

  // Price at the time of ordering - the Billing module reads this rather
  // than the live TestCatalog price, so a later price change doesn't
  // retroactively alter what an already-ordered test is billed at.
  @Prop({ default: 0 })
  priceSnapshot: number;

  @Prop({ required: true, enum: LabOrderPriority, default: LabOrderPriority.ROUTINE })
  priority: LabOrderPriority;

  @Prop({ required: true, enum: LabOrderStatus, default: LabOrderStatus.ORDERED, index: true })
  status: LabOrderStatus;

  @Prop({ required: true, default: Date.now })
  orderedAt: Date;

  @Prop()
  clinicalNotes?: string; // doctor's reason for ordering, relevant symptoms

  @Prop()
  sampleCollectedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  sampleCollectedBy?: Types.ObjectId;

  @Prop({ type: [ResultParameterSchema], default: [] })
  resultParameters: ResultParameter[];

  @Prop()
  reportFileUrl?: string; // for REPORT-type tests (imaging, biopsy, etc.)

  @Prop()
  resultNotes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  verifiedBy?: Types.ObjectId;

  @Prop()
  verifiedAt?: Date;

  @Prop()
  cancelReason?: string;
}

export const LabOrderSchema = SchemaFactory.createForClass(LabOrder);
LabOrderSchema.index({ hospitalId: 1, status: 1, priority: 1 });
LabOrderSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });
applyTenantPlugin(LabOrderSchema);