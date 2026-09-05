import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type PurchaseOrderDocument = PurchaseOrder & Document;

export enum PurchaseOrderStatus {
  PENDING = 'pending',
  RECEIVED = 'received',
  CANCELLED = 'cancelled',
}

@Schema({ _id: false })
class PurchaseOrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Medicine', required: true })
  medicineId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  estimatedUnitPrice: number;
}
const PurchaseOrderItemSchema = SchemaFactory.createForClass(PurchaseOrderItem);

/**
 * Placing a PO doesn't create stock - batch number/expiry are only known
 * when goods actually arrive. Receiving the PO (a separate service call
 * with real batch details per item) is what creates MedicineBatch records
 * and increments available stock.
 */
@Schema({ timestamps: true })
export class PurchaseOrder {
  @Prop({ type: Types.ObjectId, ref: 'Supplier', required: true, index: true })
  supplierId: Types.ObjectId;

  @Prop({ type: [PurchaseOrderItemSchema], required: true })
  items: PurchaseOrderItem[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  orderedBy: Types.ObjectId;

  @Prop({ required: true, enum: PurchaseOrderStatus, default: PurchaseOrderStatus.PENDING, index: true })
  status: PurchaseOrderStatus;

  @Prop()
  expectedDeliveryDate?: Date;

  @Prop()
  receivedDate?: Date;
}

export const PurchaseOrderSchema = SchemaFactory.createForClass(PurchaseOrder);
applyTenantPlugin(PurchaseOrderSchema);