import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type BedDocument = Bed & Document;

export enum BedStatus {
  VACANT = 'vacant',
  OCCUPIED = 'occupied',
  CLEANING = 'cleaning', // just vacated, not yet ready for the next patient
  MAINTENANCE = 'maintenance',
}

@Schema({ timestamps: true })
export class Bed {
  @Prop({ type: Types.ObjectId, ref: 'Ward', required: true, index: true })
  wardId: Types.ObjectId;

  @Prop({ required: true })
  bedNumber: string;

  @Prop({ required: true, enum: BedStatus, default: BedStatus.VACANT, index: true })
  status: BedStatus;

  @Prop({ default: true })
  isActive: boolean;
}

export const BedSchema = SchemaFactory.createForClass(Bed);
BedSchema.index({ hospitalId: 1, wardId: 1, bedNumber: 1 }, { unique: true });
applyTenantPlugin(BedSchema);