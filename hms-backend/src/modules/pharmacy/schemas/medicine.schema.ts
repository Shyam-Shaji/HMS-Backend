import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type MedicineDocument = Medicine & Document;

// Catalog entry - the "what" (a drug the hospital stocks). Actual stock
// quantities/expiry live on MedicineBatch, because a drug can have several
// batches in stock at once, each expiring at a different time (FEFO
// dispensing - First-Expiry-First-Out - depends on this split).
@Schema({ timestamps: true })
export class Medicine {
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @Prop()
  genericName?: string;

  @Prop()
  manufacturer?: string;

  @Prop()
  category?: string; // e.g. "antibiotic", "analgesic"

  @Prop({ required: true })
  unit: string; // e.g. "tablet", "ml", "vial"

  // Total stock at/below this triggers the low-stock alert.
  @Prop({ default: 10 })
  reorderLevel: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const MedicineSchema = SchemaFactory.createForClass(Medicine);
MedicineSchema.index({ hospitalId: 1, name: 'text', genericName: 'text' });
applyTenantPlugin(MedicineSchema);
