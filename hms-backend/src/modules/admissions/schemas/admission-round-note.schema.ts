import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type AdmissionRoundNoteDocument = AdmissionRoundNote & Document;

// Doctor's bedside rounds notes - one entry per round, tablet-friendly.
@Schema({ timestamps: true })
export class AdmissionRoundNote {
  @Prop({ type: Types.ObjectId, ref: 'Admission', required: true, index: true })
  admissionId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  doctorId: Types.ObjectId;

  @Prop({ required: true })
  note: string;
}

export const AdmissionRoundNoteSchema = SchemaFactory.createForClass(AdmissionRoundNote);
AdmissionRoundNoteSchema.index({ hospitalId: 1, admissionId: 1, createdAt: -1 });
applyTenantPlugin(AdmissionRoundNoteSchema);