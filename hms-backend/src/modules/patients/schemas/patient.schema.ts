import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type PatientDocument = Patient & Document;

export enum Gender {
    MALE = 'male',
    FEMALE = 'female',
    OTHER = 'other',
}

export enum BloodGroup {
  A_POS = 'A+',
  A_NEG = 'A-',
  B_POS = 'B+',
  B_NEG = 'B-',
  AB_POS = 'AB+',
  AB_NEG = 'AB-',
  O_POS = 'O+',
  O_NEG = 'O-',
  UNKNOWN = 'unknown',
}

@Schema({ _id: false })
class EmergencyContact {
  @Prop() name: string;
  @Prop() phone: string;
  @Prop() relation: string;
}
const EmergencyContactSchema = SchemaFactory.createForClass(EmergencyContact);

@Schema({ _id: false })
class Insurance {
  @Prop() provider: string;
  @Prop() policyNumber: string;
  @Prop() validTill: Date;
}
const InsuranceSchema = SchemaFactory.createForClass(Insurance);

@Schema({ _id: false })
class PatientDocumentFile {
  @Prop() type: string; // e.g. "id_proof", "insurance_card", "old_report"
  @Prop() url: string;
  @Prop({ default: Date.now }) uploadedAt: Date;
}
const PatientDocumentFileSchema = SchemaFactory.createForClass(PatientDocumentFile);

/**
 * A Patient record belongs to ONE hospital (hospitalId, injected by the
 * tenant plugin) - this is that hospital's clinical file for this person,
 * with its own UHID, exactly like a real hospital's patient file system.
 *
 * `userId` optionally links this record to a platform-level User account
 * (role: PATIENT) so the person can log into the patient portal and see
 * this record. A single User may be linked to multiple Patient records
 * across different hospitals (see "Select Hospital/Branch" in the UI plan) -
 * a walk-in patient with no portal account yet has userId: null until they
 * register/link later.
 */
@Schema({ timestamps: true })
export class Patient {
  // Unique within a hospital (not globally) - see compound index below.
  @Prop({ required: true })
  uhid: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  userId: Types.ObjectId | null;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true })
  dob: Date;

  @Prop({ required: true, enum: Gender })
  gender: Gender;

  @Prop({ enum: BloodGroup, default: BloodGroup.UNKNOWN })
  bloodGroup: BloodGroup;

  @Prop({ required: true, index: true })
  phone: string;

  @Prop({ lowercase: true, trim: true })
  email?: string;

  @Prop()
  address?: string;

  @Prop({ type: EmergencyContactSchema })
  emergencyContact?: EmergencyContact;

  @Prop({ type: [String], default: [] })
  allergies: string[];

  @Prop({ type: [String], default: [] })
  chronicConditions: string[];

  @Prop({ type: InsuranceSchema })
  insurance?: Insurance;

  @Prop({ type: [PatientDocumentFileSchema], default: [] })
  documents: PatientDocumentFile[];

  @Prop({ default: true })
  isActive: boolean;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);
PatientSchema.index({ hospitalId: 1, uhid: 1 }, { unique: true });
PatientSchema.index({ hospitalId: 1, name: 'text', phone: 'text' });

applyTenantPlugin(PatientSchema);