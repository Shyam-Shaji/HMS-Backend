import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type HospitalDocument = Hospital & Document;

@Schema({timestamps: true})
export class Hospital {
    @Prop({required: true, trim: true})
    name: string;

    @Prop({required: true, unique: true, trim: true, lowercase: true})
    slug: string; // used in subdomain/URL routing e.g. appollo.hms.app

    @Prop()
    address?: string;

    @Prop({type: [String], default:[]})
    branches?: string[];

    @Prop({ default: 'trial', enum: ['trial', 'basic', 'pro', 'enterprise'] })
    subscriptionPlan: string;

    @Prop({
    type: [String],
    default: ['opd', 'appointments'], // minimal default; hospital admin/super admin expands this
  })
  modulesEnabled: string[];

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  contactEmail?: string;

  @Prop()
  contactPhone?: string;
}

export const HospitalSchema = SchemaFactory.createForClass(Hospital);