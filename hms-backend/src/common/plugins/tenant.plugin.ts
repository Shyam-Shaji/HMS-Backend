import { Schema } from "mongoose";
import { getCurrentHospitalId } from "../context/tenant-context";

/**
 * Apply to every tenant-scoped schema (Patient, Appointment, EMR, Invoice,
 * etc. - added in later phases). It does two things:
 *
 * 1. Auto-injects hospitalId on save if not explicitly set, from the
 *    current request's AsyncLocalStorage context.
 * 2. Auto-filters every find/count/update/delete query by the current
 *    hospitalId, so a service method literally cannot leak another
 *    hospital's data even if a developer forgets to filter manually.
 *
 * Super admin requests (hospitalId === null in context) bypass the filter
 * so the platform owner can query across tenants when explicitly needed.
 *
 * Usage in a schema file:
 *   const patientSchema = new Schema({...});
 *   applyTenantPlugin(patientSchema);
 */
export function applyTenantPlugin(schema: Schema) {
  if (!schema.path('hospitalId')) {
    schema.add({ hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', index: true } });
  }

  schema.pre('save', function (this: any, next: (err?: Error) => void) {
    const hospitalId = getCurrentHospitalId();
    if (!this.get('hospitalId') && hospitalId) {
      this.set('hospitalId', hospitalId);
    }
    next();
  });

  const queryMiddleware = function (this: any, next: any) {
    const hospitalId = getCurrentHospitalId();
    if (hospitalId) {
      this.where({ hospitalId });
    }
    next();
  };

  ['find', 'findOne', 'findOneAndUpdate', 'findOneAndDelete', 'countDocuments', 'updateMany', 'deleteMany']
    .forEach((method) => schema.pre(method as any, queryMiddleware));
}