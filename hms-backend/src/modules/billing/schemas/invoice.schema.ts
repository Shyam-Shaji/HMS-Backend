import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type InvoiceDocument = Invoice & Document;

export enum InvoiceStatus {
  DRAFT = 'draft', // auto-generated or in-progress, still editable
  ISSUED = 'issued', // locked, awaiting payment
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum LineItemCategory {
  CONSULTATION = 'consultation',
  ADMISSION = 'admission',
  PHARMACY = 'pharmacy',
  LAB = 'lab',
  PROCEDURE = 'procedure',
  OTHER = 'other',
}

export enum InsuranceClaimStatus {
  NOT_APPLICABLE = 'not_applicable',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SETTLED = 'settled',
}

@Schema({ _id: false })
class LineItem {
  @Prop({ required: true }) description: string;
  @Prop({ required: true, enum: LineItemCategory }) category: LineItemCategory;
  // Loose reference to whatever generated this line (appointment, admission,
  // dispense record, lab order) - not a typed ref since it can point to
  // several different collections; kept for traceability/audit only.
  @Prop() referenceId?: string;
  @Prop({ required: true, min: 0 }) quantity: number;
  @Prop({ required: true, min: 0 }) unitPrice: number;
  @Prop({ required: true, min: 0 }) amount: number;
}
const LineItemSchema = SchemaFactory.createForClass(LineItem);

@Schema({ _id: false })
class InsuranceClaim {
  @Prop() provider?: string;
  @Prop() policyNumber?: string;
  @Prop({ default: 0 }) claimedAmount: number;
  @Prop({ default: 0 }) approvedAmount: number;
  @Prop({ enum: InsuranceClaimStatus, default: InsuranceClaimStatus.NOT_APPLICABLE }) status: InsuranceClaimStatus;
  @Prop() submittedAt?: Date;
  @Prop() settledAt?: Date;
  @Prop() notes?: string;
}
const InsuranceClaimSchema = SchemaFactory.createForClass(InsuranceClaim);

@Schema({ timestamps: true })
export class Invoice {
  // Human-readable sequential number (via the shared Counter service),
  // separate from Mongo's _id - what actually gets printed on the bill.
  @Prop({ required: true })
  invoiceNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  patientUserId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Appointment', default: null })
  appointmentId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'Admission', default: null })
  admissionId: Types.ObjectId | null;

  @Prop({ type: [LineItemSchema], required: true })
  lineItems: LineItem[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ default: 0, min: 0 })
  discount: number;

  @Prop({ default: 0, min: 0 })
  tax: number;

  @Prop({ required: true, min: 0 })
  totalAmount: number;

  @Prop({ default: 0, min: 0 })
  amountPaid: number;

  @Prop({ required: true, min: 0 })
  balanceDue: number;

  @Prop({ required: true, enum: InvoiceStatus, default: InvoiceStatus.DRAFT, index: true })
  status: InvoiceStatus;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop()
  issuedAt?: Date;

  @Prop()
  dueDate?: Date;

  @Prop({ type: InsuranceClaimSchema, default: {} })
  insuranceClaim: InsuranceClaim;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
InvoiceSchema.index({ hospitalId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });
InvoiceSchema.index({ hospitalId: 1, status: 1 });
applyTenantPlugin(InvoiceSchema);
