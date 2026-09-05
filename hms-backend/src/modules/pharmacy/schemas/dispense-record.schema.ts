import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type DispenseRecordDocument = DispenseRecord & Document;

@Schema({ _id: false })
class DispensedLine {
  @Prop({ required: true }) prescriptionLineId: string; // matches Prescription.medicines[].lineId
  @Prop({ type: Types.ObjectId, ref: 'Medicine', required: true }) medicineId: Types.ObjectId;
  @Prop({ required: true }) medicineName: string; // denormalized - survives catalog renames
  @Prop({ type: Types.ObjectId, ref: 'MedicineBatch', required: true }) batchId: Types.ObjectId;
  @Prop({ required: true }) batchNumber: string;
  @Prop({ required: true, min: 1 }) quantity: number;
  @Prop({ required: true, min: 0 }) unitPrice: number;
  @Prop({ required: true, min: 0 }) lineTotal: number;
}
const DispensedLineSchema = SchemaFactory.createForClass(DispensedLine);

// One dispensing transaction - a prescription may be dispensed across
// several of these if stock only partially covers it at first, or if the
// patient collects a multi-week course in installments.
@Schema({ timestamps: true })
export class DispenseRecord {
  @Prop({ type: Types.ObjectId, ref: 'Prescription', required: true, index: true })
  prescriptionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Patient', required: true, index: true })
  patientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  dispensedBy: Types.ObjectId;

  @Prop({ type: [DispensedLineSchema], required: true })
  items: DispensedLine[];

  @Prop({ required: true, min: 0 })
  totalAmount: number;
}

export const DispenseRecordSchema = SchemaFactory.createForClass(DispenseRecord);
DispenseRecordSchema.index({ hospitalId: 1, prescriptionId: 1 });
DispenseRecordSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });
applyTenantPlugin(DispenseRecordSchema);