import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type MedicineBatchDocument = MedicineBatch & Document;

// One received lot of a medicine. quantityAvailable is decremented as it's
// dispensed - kept separate from quantityReceived so "how much came in
// originally" is preserved for purchasing/audit history.
@Schema({ timestamps: true })
export class MedicineBatch {
  @Prop({ type: Types.ObjectId, ref: 'Medicine', required: true, index: true })
  medicineId: Types.ObjectId;

  @Prop({ required: true })
  batchNumber: string;

  @Prop({ required: true, index: true })
  expiryDate: Date;

  @Prop({ required: true, min: 0 })
  quantityReceived: number;

  @Prop({ required: true, min: 0 })
  quantityAvailable: number;

  @Prop({ required: true, min: 0 })
  pricePerUnit: number;

  @Prop()
  supplier?: string;

  @Prop({ default: Date.now })
  receivedDate: Date;
}

export const MedicineBatchSchema = SchemaFactory.createForClass(MedicineBatch);
MedicineBatchSchema.index({ hospitalId: 1, medicineId: 1, batchNumber: 1 }, { unique: true });
// FEFO dispensing reads batches sorted by expiryDate ascending, filtered
// to ones with stock left - this compound index makes that query cheap.
MedicineBatchSchema.index({ hospitalId: 1, medicineId: 1, expiryDate: 1, quantityAvailable: 1 });
applyTenantPlugin(MedicineBatchSchema);