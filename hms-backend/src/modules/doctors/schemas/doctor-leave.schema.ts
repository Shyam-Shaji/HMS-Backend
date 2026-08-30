import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type DoctorLeaveDocument = DoctorLeave & Document;

@Schema({ timestamps: true })
export class DoctorLeave {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  doctorId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop()
  fromTime?: string;

  @Prop()
  toTime?: string;

  @Prop()
  reason?: string;
}

export const DoctorLeaveSchema = SchemaFactory.createForClass(DoctorLeave);
DoctorLeaveSchema.index({ hospitalId: 1, doctorId: 1, date: 1 });
applyTenantPlugin(DoctorLeaveSchema);