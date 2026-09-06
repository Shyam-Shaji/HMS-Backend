import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { applyTenantPlugin } from "../../../common/plugins/tenant.plugin";

export type TestCatalogDocument = TestCatalog & Document;

export enum ResultType {
  // e.g. CBC, lipid panel - numeric values against reference ranges
  STRUCTURED = 'structured',
  // e.g. X-ray, MRI, biopsy - a report/PDF, no discrete parameters
  REPORT = 'report',
}

@Schema({ _id: false })
class ParameterDefinition {
  @Prop({ required: true }) name: string; // e.g. "Hemoglobin"
  @Prop({ required: true }) unit: string; // e.g. "g/dL"
  @Prop() referenceRangeLow?: number;
  @Prop() referenceRangeHigh?: number;
}
const ParameterDefinitionSchema = SchemaFactory.createForClass(ParameterDefinition);

// The catalogue entry defines WHAT a test measures (its expected
// parameters and reference ranges for structured tests) so the lab
// technician's Result Entry screen can be pre-populated instead of typed
// from scratch every time, and so flagging (high/low/critical) can be
// computed automatically against a known range.
@Schema({ timestamps: true })
export class TestCatalog {
  @Prop({ required: true, trim: true, index: true })
  name: string;

  @Prop()
  code?: string; // internal/LOINC-style code, optional

  @Prop()
  category?: string; // e.g. "hematology", "biochemistry", "radiology"

  @Prop({ required: true })
  sampleType: string; // e.g. "blood", "urine", "swab", "n/a" for imaging

  @Prop({ required: true, enum: ResultType })
  resultType: ResultType;

  @Prop({ type: [ParameterDefinitionSchema], default: [] })
  parameters: ParameterDefinition[]; // only meaningful when resultType = STRUCTURED

  @Prop({ default: 0 })
  price: number;

  @Prop({ default: 24 })
  turnaroundTimeHours: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const TestCatalogSchema = SchemaFactory.createForClass(TestCatalog);
applyTenantPlugin(TestCatalogSchema);