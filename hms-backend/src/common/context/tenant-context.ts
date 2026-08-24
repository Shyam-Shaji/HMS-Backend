import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext{
    userId?: string;
    role?: string;
    hospitalId?: string | null; // null/undefined => platform-level (super admin/ unscoped patient)
}

// A single AsyncLocalStorage instance shared across the app. Every request
// runs inside `tenantContextStorage.run(ctx, () => ...)` (see
// TenantContextInterceptor). Mongoose plugins and services read from this
// instead of having hospitalId threaded through every function signature.
export const tenantContextStorage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return tenantContextStorage.getStore();
}

export function getCurrentHospitalId(): string | null | undefined {
  return tenantContextStorage.getStore()?.hospitalId;
}
