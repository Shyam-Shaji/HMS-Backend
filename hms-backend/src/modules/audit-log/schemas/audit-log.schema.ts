import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: string;

  @Prop({ type: Types.ObjectId, ref: 'Hospital', default: null, index: true })
  hospitalId?: string | null;

  @Prop({ required: true })
  action: string; // e.g. "POST /api/v1/patients"

  @Prop()
  entityType?: string;

  @Prop()
  entityId?: string;

  @Prop()
  ipAddress?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
