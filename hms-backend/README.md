# HMS Backend — Foundation Phase

Multi-tenant Hospital Management System backend. **NestJS + MongoDB (Mongoose)**.

This is Phase 0 from the project plan: authentication, multi-tenancy, RBAC,
and the core infrastructure every future module (patients, appointments,
EMR, pharmacy, lab, billing...) will plug into. No clinical modules yet —
this is the foundation they get built on top of.

---

## What's included

- **Auth**: register (patient), password login (staff), OTP login
  (request/verify), JWT access + refresh tokens with rotation & revocation,
  logout.
- **Multi-tenancy**: every hospital is a tenant (`Hospital` model). Staff
  users carry a `hospitalId`; Super Admin and Patient accounts are
  platform-level (`hospitalId: null`). A Mongoose plugin
  (`common/plugins/tenant.plugin.ts`) auto-scopes queries to the current
  hospital using `AsyncLocalStorage` — no need to manually filter by
  `hospitalId` in every service method once a schema uses it.
- **RBAC**: 9 roles matching the project plan (`common/enums/role.enum.ts`),
  enforced via `@Roles()` decorator + `RolesGuard`.
- **Hospitals module**: Super Admin can onboard/manage hospital tenants.
- **Users module**: create staff accounts (Hospital Admin scoped to their
  own hospital), manage own profile.
- **Patients module**: register walk-in/OPD patients (reception/nurse/
  doctor/admin), auto-generated per-hospital UHID (atomic counter, no
  collisions under concurrent registrations), search/list for staff,
  self-service `patients/me` routes for the patient portal (a single
  patient User can be linked to multiple hospitals' Patient records —
  each hospital keeps its own file, exactly like real hospital
  record-keeping), allergy/chronic-condition fields for the EMR allergy
  banner, insurance info, document attachments.
- **Doctors module**: weekly recurring availability schedules per doctor
  (day/time blocks + slot duration), leave/time-off blocking (full day or
  a time range), and slot computation (`GET /doctors/:id/slots?date=`)
  that combines availability minus leave minus already-booked appointments
  into a ready-to-render list for the booking screen.
- **Appointments module**: booking with slot validation, sequential
  per-doctor-per-day token numbers (atomic counter — no duplicate tokens
  under concurrent booking), a DB-level partial unique index that blocks
  true double-booking race conditions even if two requests hit the same
  slot simultaneously, full status lifecycle (booked → checked-in →
  in-consultation → completed, plus cancel/no-show), reschedule, and a
  **live queue** endpoint + Socket.io gateway that pushes real-time queue
  updates to the waiting-room board and the patient's "you are #4, ~20 min
  wait" screen whenever anyone checks in, starts, completes, or cancels.
- **EMR module**: one `MedicalRecord` per visit (1:1 with an Appointment),
  identity fields (patient/doctor/hospital) always derived server-side
  from the Appointment — never trusted from the request body. Nurse-only
  vitals endpoint (matches the Nurse Vitals Entry screen), doctor-only
  clinical fields (chief complaint, diagnosis with ICD-10 tagging, notes,
  follow-up, referrals), a **finalize** step that locks the record
  (immutable after finalization — corrections need a new addendum, not a
  silent rewrite), full chronological patient history, and a
  **consultation summary** endpoint that bundles allergies + last visit
  into one call — the data behind the doctor's single-pane consultation
  view.
- **Prescriptions module**: deliberately a separate schema from
  MedicalRecord — a pharmacist dispensing medicine can read the
  prescription without ever seeing the diagnosis or doctor's notes behind
  it. Medicine list with dosage/frequency/duration/instructions, cancel
  with reason, patient-portal access to their own prescriptions across
  hospitals.
- **Wards & Beds module**: ward master data (type, floor, per-day
  charges) and individual beds within each ward, with a full **ward
  board** endpoint (every bed across every ward, bed-by-bed, in one call)
  — the data behind the Nurse Ward Board screen. Bed status transitions
  (vacant → occupied → cleaning → vacant) are protected: you can't
  manually flip an occupied bed's status without discharging/transferring
  the patient first.
- **Admissions module (IPD)**: admit → transfer → discharge lifecycle with
  the same atomic check-and-set bed assignment pattern as appointment slot
  booking (a bed can't be double-assigned even under concurrent requests —
  enforced both in the service and with a DB-level partial unique index).
  Full transfer history is preserved on the admission record (useful for
  billing's per-ward day counts later). Nurse vitals charting (time-series,
  not one-per-visit like OPD), doctor rounds notes, a Medication
  Administration Record (MAR) with standing orders plus a running log of
  every dose given/missed/held, and a discharge flow with both the
  doctor's summary and a separate nurse discharge-checklist completion
  flag.
- **Pharmacy module**: medicine catalog + batch-level stock (batch number,
  expiry, quantity) so **FEFO dispensing** (First-Expiry-First-Out) is
  possible — dispensing always draws from the earliest-expiring batch
  with stock first. Every batch decrement is an atomic, condition-checked
  update (`quantityAvailable >= amount`), so two pharmacists can't oversell
  the same batch; a dispense that can't be fully covered rolls back
  everything it provisionally took rather than partially filling it.
  Prescriptions track **per-line dispensed quantity** (not just
  all-or-nothing), so a multi-week course can be collected in
  installments, with the prescription's overall `dispenseStatus` rolling
  up automatically. Also: suppliers, purchase orders with a separate
  **receiving** step (batch/expiry are only known when goods physically
  arrive, not when the PO was placed), low-stock alerts (total stock vs.
  reorder level), near-expiry alerts, and a dispense queue for the
  pharmacist's incoming work.
- **Lab module**: a test catalogue with reference-range parameter
  definitions for structured tests (CBC, lipid panel, etc.) vs. a
  report/PDF flow for imaging and biopsies. Orders can originate from
  either an OPD visit or an IPD admission — identity is always derived
  server-side from whichever one, same pattern as EMR/Prescriptions/
  Pharmacy. Full status lifecycle (ordered → sample collected → in
  progress → completed/verified, or cancelled), with the queue sorted by
  actual clinical priority (STAT → urgent → routine, oldest-first within
  each tier) rather than plain chronological order. Once verified, a
  result is locked — same immutability contract as EMR's finalize.
- **Billing module**: invoices can be built manually or **auto-generated**
  from an OPD appointment or an IPD admission — pulling in pharmacy
  dispense totals and lab charges already linked to that visit/stay
  automatically. IPD ward charges are computed **per-segment across any
  ward transfers** (each ward can have a different daily rate, and the
  admission's transfer history is walked to bill each stretch at the
  right ward's rate). In-person payments (cash/card/UPI) post
  immediately; online gateway payments go through an initiate → confirm
  flow against a **mock payment gateway abstraction** (`PaymentGatewayService`)
  that's wired end-to-end but clearly documented as a stub — swapping in
  real Razorpay/Stripe/PayU means implementing that one class, not
  restructuring the billing flow. Confirmation is idempotent (a duplicate
  webhook delivery can't double-credit an invoice). Refunds, partial
  payments, and an insurance/TPA claim workflow (submit → approve/reject →
  settle) round it out.
- **Notifications module**: an in-app inbox that exists for every account
  regardless of channel preferences (an SMS/email/push event is always
  also visible in-app — structurally, not by convention), per-user
  channel preferences (SMS/email/push on/off), and mock SMS/Email/Push
  provider services with the exact same "clearly-labeled stub, real shape,
  one class to swap" pattern as the payment gateway. **This module is
  wired into six real trigger points**, not just built and left dangling:
  OTP delivery (auth), appointment confirmation (booking), lab report
  ready — to both the ordering doctor and the patient (lab result
  verification), medicines dispensed (pharmacy), bill generated
  (billing), and discharge summary ready (admissions). All are
  best-effort/fire-and-forget — a notification failure never fails the
  triggering action itself. A `broadcastToRole()` helper also exists for
  future automated alerts (e.g. low-stock) once a scheduler/cron module
  is added — not automatically wired anywhere yet, since nothing in this
  codebase runs on a timer.
- **Cross-cutting production concerns**: global validation, consistent
  success/error response envelopes, rate limiting (login/OTP routes),
  Helmet + CORS + compression, structured logging, audit log of every
  write request, health check endpoint, Swagger docs, env validation that
  fails fast on boot if secrets are missing.

## Status: every module from the original project plan is now represented

Auth, Users, Hospitals (tenants), Patients, Doctors (availability),
Appointments, EMR, Prescriptions, Wards/Beds, Admissions (IPD), Pharmacy,
Lab, Billing, and Notifications. What's genuinely NOT here yet, and would
be the natural next layer on top of this foundation:
- **Analytics/reporting dashboards** — the data to power them exists
  across these modules, but no aggregation/reporting endpoints have been
  built for occupancy rates, revenue reports, doctor-wise patient load, etc.
- **A scheduler/cron module** — for appointment reminders, low-stock
  alerts, and near-expiry alerts to fire automatically instead of only on
  request.
- **Real third-party integrations** — the payment gateway and all three
  notification providers (SMS/email/push) are intentionally mocked; each
  has a code comment on exactly what a real implementation needs to change.
- **Consultation fee storage** — no per-doctor fee field exists yet
  (billing supplies it manually at invoice-generation time).
- **IPD medication pricing** — `AdmissionMedicationOrder` has no cost
  data, so those charges aren't auto-included in generated invoices.

## A tenant-isolation gotcha worth knowing (fixed, but easy to reintroduce)

`applyTenantPlugin` auto-scopes queries by hooking Mongoose's query
middleware (`pre('find')`, `pre('findOne')`, etc.). **`.aggregate()` does
NOT go through that middleware** — so any aggregation pipeline on a
tenant-scoped collection needs its hospital filter added to the `$match`
stage by hand, or it'll silently query across every hospital on the
platform. This bit two spots in this codebase (Pharmacy's low-stock
rollup, Lab's priority-ranked queue) and both are fixed with an explicit
`getCurrentHospitalId()` match — but it's worth remembering as a pattern:
**any new `.aggregate()` call on a tenant-scoped model needs this.**

## A note on the Billing module's auto-generation

`generateFromAppointment`/`generateFromAdmission` are best-effort
convenience helpers, not a guaranteed-complete bill:
- Consultation fees aren't stored anywhere in the current data model (no
  per-doctor fee field exists yet), so they're supplied manually at
  generation time rather than looked up.
- IPD medication administration (`AdmissionMedicationOrder`) has no
  pricing at all in the current schema, so those charges are never
  auto-included - billing staff adds them as manual line items.

Both are flagged in code comments rather than silently producing an
incomplete-but-confident-looking invoice.

---

## Getting started

```bash
cp .env.example .env
# edit .env — set real JWT secrets (min 16 chars) and your Mongo URI

npm install

# option A: run Mongo/Redis yourself and just run the app
npm run start:dev

# option B: run everything via Docker
docker compose up --build
```

Once running:
- API base: `http://localhost:4000/api/v1`
- Swagger docs: `http://localhost:4000/docs` (non-production only)
- Health check: `GET /api/v1/health`

### Create your first Super Admin

```bash
npm run seed:super-admin
```

Reads `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from `.env`. Log in with
`POST /api/v1/auth/login`, then use that token to `POST /api/v1/hospitals`
to onboard your first hospital tenant, then `POST /api/v1/users` (as that
hospital's admin) to create doctors, nurses, reception staff, etc.

---

## How multi-tenancy actually works here

1. A staff user logs in → JWT payload includes `hospitalId`.
2. `TenantContextInterceptor` reads `req.user` and runs the rest of the
   request inside `AsyncLocalStorage` context carrying that `hospitalId`.
3. Any schema that calls `applyTenantPlugin(schema)` (future modules:
   Patient, Appointment, Invoice, etc.) automatically:
   - filters every `find`/`update`/`delete` query by the current
     `hospitalId`
   - auto-sets `hospitalId` on `save()` if not already set
4. `TenantGuard` is a defence-in-depth check: any tenant-scoped role
   (doctor, nurse, reception...) whose token somehow has no `hospitalId`
   is rejected before hitting a service.
5. Super Admin requests carry `hospitalId: null` → tenant filter is
   skipped, so Super Admin can see across all hospitals when needed.

This means **future feature modules don't need to reinvent tenant
isolation** — apply the plugin to the schema and it's handled.

---

## Folder structure

```
src/
├── main.ts                  # bootstrap: helmet, validation, swagger, prefix
├── app.module.ts             # wires guards/interceptors/filters globally
├── config/                   # env config + Joi validation schema
├── common/
│   ├── context/               # AsyncLocalStorage tenant context
│   ├── decorators/             # @Roles, @Public, @CurrentUser
│   ├── enums/                  # Role enum
│   ├── filters/                 # global exception filter
│   ├── guards/                   # JwtAuthGuard, RolesGuard, TenantGuard
│   ├── interceptors/              # tenant context, logging, audit, response transform
│   └── plugins/                    # applyTenantPlugin(schema) - Mongoose tenant scoping
└── modules/
    ├── auth/                # register, login, OTP, refresh, logout
    ├── users/                # staff/patient user CRUD
    ├── hospitals/             # tenant management (Super Admin)
    ├── patients/               # patient records (per-hospital UHID, tenant-scoped)
    ├── doctors/                 # weekly availability, leave, slot computation
    ├── appointments/              # booking, tokens, status lifecycle, live queue (Socket.io)
    ├── emr/                         # medical records - vitals, diagnosis, notes, finalize
    ├── prescriptions/                 # e-prescriptions, separate from EMR for narrower RBAC
    ├── wards/                          # ward + bed master data, ward board
    ├── admissions/                      # IPD: admit, transfer, discharge, MAR, rounds, vitals
    ├── pharmacy/                          # medicine catalog, batches/FEFO, dispensing, purchase orders
    ├── lab/                                # test catalogue, orders, results (OPD or IPD origin)
    ├── billing/                             # invoices, payments, refunds, insurance claims
    ├── notifications/                         # inbox, preferences, mock SMS/email/push providers
    ├── otp/                     # OTP schema (used by auth)
    ├── audit-log/                 # write-action audit trail
    └── health/                     # /health endpoint (Terminus)
```

### Patients module routes

```
POST   /api/v1/patients                 # register walk-in/OPD patient (staff)
GET    /api/v1/patients?q=&page=&limit= # search/list (staff)
GET    /api/v1/patients/:id             # view record (staff)
PATCH  /api/v1/patients/:id             # edit record (staff)
PATCH  /api/v1/patients/:id/link-user   # link record to a portal account
PATCH  /api/v1/patients/:id/deactivate  # soft-delete (Hospital Admin)

GET    /api/v1/patients/me              # my records across all hospitals (patient)
GET    /api/v1/patients/me/:id          # one of my records (patient)
PATCH  /api/v1/patients/me/:id          # update my own contact info (patient)
```

### Doctors module routes

```
POST  /api/v1/doctors/:doctorId/availability   # set weekly schedule (doctor/admin)
GET   /api/v1/doctors/:doctorId/availability
POST  /api/v1/doctors/:doctorId/leave          # block a date/time range
GET   /api/v1/doctors/:doctorId/leave
GET   /api/v1/doctors/:doctorId/slots?date=    # computed open slots for booking
```

### Appointments module routes

```
POST   /api/v1/appointments                    # staff books for a patient
GET    /api/v1/appointments?doctorId=&date=&status=&page=&limit=
GET    /api/v1/appointments/:id
PATCH  /api/v1/appointments/:id/reschedule
PATCH  /api/v1/appointments/:id/cancel
PATCH  /api/v1/appointments/:id/check-in        # reception
PATCH  /api/v1/appointments/:id/start           # doctor starts consultation
PATCH  /api/v1/appointments/:id/complete        # doctor finishes
PATCH  /api/v1/appointments/:id/no-show

GET    /api/v1/appointments/queue/:doctorId?date=   # live queue snapshot (REST)

POST   /api/v1/appointments/me                  # patient books for themself
GET    /api/v1/appointments/me                  # patient's own appointments, all hospitals
PATCH  /api/v1/appointments/me/:id/cancel
PATCH  /api/v1/appointments/me/:id/reschedule
```

**Live queue via Socket.io** — connect to the `/queue` namespace, emit
`join-queue` with `{ hospitalId, doctorId, date }`, then listen for
`queue-update` events. Broadcast automatically fires on every check-in,
consultation start/complete, cancellation, and new booking for that
doctor/date — this is what powers the waiting-room TV board and the
patient's live token-position screen without polling.

### EMR module routes

```
PATCH  /api/v1/emr/visits/:appointmentId/vitals     # nurse or doctor
PATCH  /api/v1/emr/visits/:appointmentId            # doctor: clinical fields
PATCH  /api/v1/emr/visits/:appointmentId/finalize   # doctor: lock the record
GET    /api/v1/emr/visits/:appointmentId            # doctor/nurse/admin

GET    /api/v1/emr/patients/:patientId/history?page=&limit=  # timeline
GET    /api/v1/emr/patients/:patientId/summary                # consultation-view bundle

GET    /api/v1/emr/me/history                        # patient's own timeline
GET    /api/v1/emr/me/visits/:appointmentId           # patient's own visit detail
```

### Prescriptions module routes

```
POST   /api/v1/emr/visits/:appointmentId/prescriptions   # doctor creates
GET    /api/v1/emr/visits/:appointmentId/prescriptions   # doctor/nurse/pharmacist/admin

GET    /api/v1/prescriptions/:id
GET    /api/v1/patients/:patientId/prescriptions          # e.g. pharmacy dispensing queue
PATCH  /api/v1/prescriptions/:id/cancel                    # doctor

GET    /api/v1/prescriptions/me                # patient's own, all hospitals
GET    /api/v1/prescriptions/me/:id
```

### Wards & Beds module routes

```
POST   /api/v1/wards                        # hospital admin
GET    /api/v1/wards
GET    /api/v1/wards/:id
PATCH  /api/v1/wards/:id

POST   /api/v1/wards/:wardId/beds
GET    /api/v1/wards/:wardId/beds
GET    /api/v1/beds/board                   # full cross-ward bed grid (Nurse Ward Board)
PATCH  /api/v1/beds/:id/status               # manual override outside admit/transfer/discharge
```

### Admissions module routes (IPD)

```
POST   /api/v1/admissions                        # admit a patient (atomic bed assignment)
GET    /api/v1/admissions?status=&wardId=&patientId=&page=&limit=
GET    /api/v1/admissions/:id

PATCH  /api/v1/admissions/:id/transfer            # ward-to-ward, atomic bed swap
PATCH  /api/v1/admissions/:id/discharge           # doctor's discharge summary
PATCH  /api/v1/admissions/:id/discharge/nurse-checklist

POST   /api/v1/admissions/:id/vitals              # nurse charting (time-series)
GET    /api/v1/admissions/:id/vitals

POST   /api/v1/admissions/:id/rounds              # doctor bedside notes
GET    /api/v1/admissions/:id/rounds

POST   /api/v1/admissions/:id/medications                    # doctor's standing order
GET    /api/v1/admissions/:id/medications                     # MAR list
PATCH  /api/v1/admissions/:id/medications/:orderId/administer  # nurse logs a dose

GET    /api/v1/admissions/me                      # patient's own admission history
```

### Pharmacy module routes

```
POST   /api/v1/pharmacy/medicines                     # add to catalog
GET    /api/v1/pharmacy/medicines?q=
GET    /api/v1/pharmacy/medicines/low-stock            # total stock <= reorder level
GET    /api/v1/pharmacy/medicines/expiring?days=30
GET    /api/v1/pharmacy/medicines/:id
PATCH  /api/v1/pharmacy/medicines/:id

POST   /api/v1/pharmacy/medicines/:id/batches          # manual stock receipt (no PO)
GET    /api/v1/pharmacy/medicines/:id/batches

POST   /api/v1/pharmacy/suppliers
GET    /api/v1/pharmacy/suppliers

POST   /api/v1/pharmacy/purchase-orders
GET    /api/v1/pharmacy/purchase-orders
GET    /api/v1/pharmacy/purchase-orders/:id
PATCH  /api/v1/pharmacy/purchase-orders/:id/receive    # creates batches with real batch/expiry
PATCH  /api/v1/pharmacy/purchase-orders/:id/cancel

GET    /api/v1/pharmacy/dispense-queue                 # pharmacist's incoming work
POST   /api/v1/pharmacy/prescriptions/:id/dispense     # FEFO stock consumption
GET    /api/v1/pharmacy/prescriptions/:id/dispense-history
GET    /api/v1/pharmacy/patients/:patientId/dispense-history
```

### Lab module routes

```
POST   /api/v1/lab/tests                       # add to catalogue (with parameter defs)
GET    /api/v1/lab/tests?q=
GET    /api/v1/lab/tests/:id
PATCH  /api/v1/lab/tests/:id

POST   /api/v1/emr/visits/:appointmentId/lab-orders   # doctor orders during OPD visit
POST   /api/v1/admissions/:admissionId/lab-orders     # doctor orders during IPD stay

GET    /api/v1/lab/orders?status=&priority=&patientId=&page=&limit=  # priority-ranked queue
GET    /api/v1/lab/orders/:id
PATCH  /api/v1/lab/orders/:id/collect-sample
PATCH  /api/v1/lab/orders/:id/start-processing
PATCH  /api/v1/lab/orders/:id/result             # structured parameters and/or notes
PATCH  /api/v1/lab/orders/:id/upload-report      # for imaging/report-type tests
PATCH  /api/v1/lab/orders/:id/verify             # finalizes and locks the result
PATCH  /api/v1/lab/orders/:id/cancel

GET    /api/v1/lab/patients/:patientId/history   # staff view, e.g. before a consultation
GET    /api/v1/lab/me                            # patient's own verified reports
GET    /api/v1/lab/me/:id
```

### Billing module routes

```
POST   /api/v1/billing/invoices                                    # manual invoice
POST   /api/v1/billing/invoices/generate-from-appointment/:id       # auto-pulls pharmacy+lab charges
POST   /api/v1/billing/invoices/generate-from-admission/:id         # + per-segment ward stay charges

GET    /api/v1/billing/invoices?status=&patientId=&page=&limit=
GET    /api/v1/billing/invoices/:id
GET    /api/v1/billing/invoices/:id/payments
PATCH  /api/v1/billing/invoices/:id              # edit line items - draft only
PATCH  /api/v1/billing/invoices/:id/issue        # locks editing
PATCH  /api/v1/billing/invoices/:id/cancel

POST   /api/v1/billing/invoices/:id/payments          # in-person: cash/card/UPI/bank transfer
PATCH  /api/v1/billing/payments/:paymentId/refund

POST   /api/v1/billing/me/invoices/:id/pay/initiate    # patient starts an online payment
POST   /api/v1/billing/payments/:paymentId/confirm     # gateway confirmation (idempotent)

PATCH  /api/v1/billing/invoices/:id/insurance-claim         # submit
PATCH  /api/v1/billing/invoices/:id/insurance-claim/status  # approve/reject/settle

GET    /api/v1/billing/me                        # patient's own invoices
GET    /api/v1/billing/me/:id
```

### Notifications module routes

```
GET    /api/v1/notifications/me?unreadOnly=&page=&limit=
PATCH  /api/v1/notifications/me/:id/read
PATCH  /api/v1/notifications/me/read-all

GET    /api/v1/notifications/me/preferences
PATCH  /api/v1/notifications/me/preferences        # {smsEnabled, emailEnabled, pushEnabled}

POST   /api/v1/notifications/send                  # hospital admin: custom notification to one user
```

## Adding the next module (e.g. Patients)

1. `src/modules/patients/schemas/patient.schema.ts` — call
   `applyTenantPlugin(schema)` before exporting.
2. DTOs with `class-validator` decorators.
3. Service — no manual `hospitalId` filtering needed for tenant-scoped
   reads/writes; the plugin handles it.
4. Controller — guard with `@Roles(...)` for whichever staff roles should
   access it; patients access their own data via a separate
   `/patients/me`-style route scoped by `req.user.userId`, not by role.
5. Register the module in `app.module.ts`.

## Security notes before going to real production

- Rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` to long random values
  (never the .env.example placeholders).
- Put this behind HTTPS (terminate TLS at a load balancer/Nginx).
- Set `CORS_ORIGIN` to your actual frontend domain(s), not `*`.
- Review MongoDB Atlas network access rules / VPC peering for production.
- Add field-level encryption for sensitive PII once the Patient/EMR
  modules exist (flagged in the main project plan's non-functional
  requirements).
