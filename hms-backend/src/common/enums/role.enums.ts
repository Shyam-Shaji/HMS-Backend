// Every role from the project plan. SUPER_ADMIN operates above the tenant
// boundary (manages hospitals). All other roles are scoped to a hospitalId.
export enum Role {
  SUPER_ADMIN = 'super_admin',
  HOSPITAL_ADMIN = 'hospital_admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  RECEPTIONIST = 'receptionist',
  PHARMACIST = 'pharmacist',
  LAB_TECHNICIAN = 'lab_technician',
  BILLING_STAFF = 'billing_staff',
  PATIENT = 'patient',
}

// Roles that belong to a hospital tenant (as opposed to platform-level).
export const TENANT_SCOPED_ROLES: Role[] = [
  Role.HOSPITAL_ADMIN,
  Role.DOCTOR,
  Role.NURSE,
  Role.RECEPTIONIST,
  Role.PHARMACIST,
  Role.LAB_TECHNICIAN,
  Role.BILLING_STAFF,
];