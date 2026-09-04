import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type WardDocument = Ward & Document;

export enum WardType {
  GENERAL = 'general',
  ICU = 'icu',
  PRIVATE = 'private',
  SEMI_PRIVATE = 'semi_private',
  EMERGENCY = 'emergency',
  MATERNITY = 'maternity',
  PEDIATRIC = 'pediatric',
}

@Schema({ timestamps: true })
export class Ward {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, enum: WardType })
  type: WardType;

  @Prop()
  floor?: string;

  @Prop({ default: 0 })
  chargesPerDay: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const WardSchema = SchemaFactory.createForClass(Ward);
applyTenantPlugin(WardSchema);