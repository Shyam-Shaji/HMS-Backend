# HMS Backend

REST API for a multi-tenant Hospital Management System. Built with **NestJS 11**, **MongoDB** (Mongoose), and **Socket.io** for live appointment queues.

Staff accounts belong to a hospital tenant. Super Admin and Patient accounts are platform-level. Tenant-scoped collections are filtered automatically via a Mongoose plugin and `AsyncLocalStorage`.

---

## Stack

| Layer | Choice |
| --- | --- |
| Runtime | Node.js 20 |
| Framework | NestJS 11 |
| Database | MongoDB 7 (Mongoose 9) |
| Auth | JWT access + refresh (Passport), bcrypt, OTP |
| Realtime | Socket.io (`/queue` namespace) |
| Docs | Swagger (`/docs`, non-production) |
| Health | NestJS Terminus |

---

## Modules

- **Auth** — patient register, staff password login, OTP request/verify, JWT refresh with rotation and revocation, logout
- **Hospitals** — Super Admin onboards and manages tenants
- **Users** — create staff, profile, deactivate (`/user` routes)
- **Patients** — per-hospital UHID (atomic counter), search, portal `/patients/me` (one user can link to records in multiple hospitals)
- **Doctors** — weekly availability, leave, computed open slots
- **Appointments** — booking, per-doctor-per-day tokens, status lifecycle, live queue (REST + Socket.io)
- **EMR** — one medical record per visit; nurse vitals; doctor clinical fields; finalize locks the record
- **Prescriptions** — separate from EMR so pharmacy can dispense without seeing diagnosis/notes
- **Wards & beds** — ward master data, bed board, protected status transitions
- **Admissions (IPD)** — admit / transfer / discharge, vitals charting, rounds, MAR
- **Pharmacy** — catalog, batch stock, FEFO dispense, suppliers, purchase orders, low-stock / near-expiry
- **Lab** — test catalogue, OPD/IPD orders, priority queue, structured results or report upload, verify lock
- **Billing** — invoices (manual or generated from visit/stay), payments, refunds, insurance claims, mock gateway
- **Notifications** — in-app inbox, channel preferences, stub SMS/email/push providers
- **Audit log** — write-action trail
- **Health** — MongoDB ping

### Roles

`super_admin`, `hospital_admin`, `doctor`, `nurse`, `receptionist`, `pharmacist`, `lab_technician`, `billing_staff`, `patient`

Enforced with `@Roles()` and `RolesGuard`. Tenant-scoped roles must have `hospitalId` on the token (`TenantGuard`).

---

## Getting started

### Prerequisites

- Node.js 20+
- MongoDB 7 (local, Atlas, or Docker)
- npm

### Local run

```bash
cp .env.example .env
# set MONGO_URI and JWT secrets (min 16 characters)

npm install
npm run start:dev
```

### Docker

```bash
cp .env.example .env
# JWT secrets still required; compose overrides MONGO_URI to mongodb://mongo:27017/hms

docker compose up --build
```

Compose starts the API, MongoDB, and Redis. Redis is **not used by the application yet**; it is reserved for future caching/queues.

### URLs (defaults)

| | |
| --- | --- |
| API | `http://localhost:4000/api/v1` |
| Swagger | `http://localhost:4000/docs` (not served in production) |
| Health | `GET http://localhost:4000/health` (no API prefix) |

### First Super Admin

There is no `package.json` script yet. From `hms-backend/`:

```bash
npx ts-node scripts/seed-super-admin.ts
```

Uses `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` from `.env`. Then:

1. `POST /api/v1/auth/login`
2. `POST /api/v1/hospitals` (Super Admin)
3. `POST /api/v1/user` as that hospital’s admin to create doctors, nurses, reception, etc.

---

## Environment

Copy `.env.example`. Boot fails if required secrets are missing.

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | | `development` | `development` \| `test` \| `production` |
| `PORT` | | `4000` | |
| `API_PREFIX` | | `api/v1` | |
| `CORS_ORIGIN` | | `*` | Set to real frontend origin(s) in production |
| `MONGO_URI` | yes | | |
| `JWT_ACCESS_SECRET` | yes | | min 16 chars |
| `JWT_ACCESS_EXPIRES_IN` | | `15m` | |
| `JWT_REFRESH_SECRET` | yes | | min 16 chars |
| `JWT_REFRESH_EXPIRES_IN` | | `7d` | |
| `OTP_EXPIRY_MINUTES` | | `5` | |
| `OTP_LENGTH` | | `6` | |
| `THROTTLE_TTL` | | `60` | seconds |
| `THROTTLE_LIMIT` | | `100` | |
| `SUPER_ADMIN_EMAIL` | seed only | | |
| `SUPER_ADMIN_PASSWORD` | seed only | | |

---

## Scripts

```bash
npm run start:dev    # watch mode
npm run start:debug
npm run start:prod   # node dist/main (after build)
npm run build
npm run lint
npm run test
npm run test:cov
npm run test:e2e
```

---

## Multi-tenancy

1. Staff JWT includes `hospitalId`.
2. `TenantContextInterceptor` stores it in `AsyncLocalStorage` for the request.
3. Schemas that call `applyTenantPlugin(schema)` auto-filter `find` / `update` / `delete` and set `hospitalId` on `save()`.
4. `TenantGuard` rejects tenant-scoped roles whose token has no `hospitalId`.
5. Super Admin has `hospitalId: null` — the tenant filter is skipped.

**Aggregations are not tenant-scoped.** Mongoose query middleware does not wrap `.aggregate()`. Any pipeline on a tenant collection must add `hospitalId` in `$match` (see pharmacy low-stock and lab queue).

---

## Auth

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/otp/request
POST /api/v1/auth/otp/verify
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

Login and OTP routes are extra-throttled (brute-force / spam limits).

Most other routes require `Authorization: Bearer <access token>`.

### Users

```
POST   /api/v1/user
GET    /api/v1/user/me
PATCH  /api/v1/user/me
GET    /api/v1/user/:id
PATCH  /api/v1/user/:id/deactivate
```

### Hospitals

```
POST   /api/v1/hospitals
GET    /api/v1/hospitals
GET    /api/v1/hospitals/:id
PATCH  /api/v1/hospitals/:id
```

### Patients

```
POST   /api/v1/patients
GET    /api/v1/patients?q=&page=&limit=
GET    /api/v1/patients/:id
PATCH  /api/v1/patients/:id
PATCH  /api/v1/patients/:id/link-user
PATCH  /api/v1/patients/:id/deactivate

GET    /api/v1/patients/me
GET    /api/v1/patients/me/:id
PATCH  /api/v1/patients/me/:id
```

### Doctors

```
POST /api/v1/doctors/:doctorId/availability
GET  /api/v1/doctors/:doctorId/availability
POST /api/v1/doctors/:doctorId/leave
GET  /api/v1/doctors/:doctorId/leave
GET  /api/v1/doctors/:doctorId/slots?date=
```

### Appointments

```
POST   /api/v1/appointments
GET    /api/v1/appointments?doctorId=&date=&status=&page=&limit=
GET    /api/v1/appointments/:id
PATCH  /api/v1/appointments/:id/reschedule
PATCH  /api/v1/appointments/:id/cancel
PATCH  /api/v1/appointments/:id/check-in
PATCH  /api/v1/appointments/:id/start
PATCH  /api/v1/appointments/:id/complete
PATCH  /api/v1/appointments/:id/no-show
GET    /api/v1/appointments/queue/:doctorId?date=

POST   /api/v1/appointments/me
GET    /api/v1/appointments/me
PATCH  /api/v1/appointments/me/:id/cancel
PATCH  /api/v1/appointments/me/:id/reschedule
```

**Live queue:** connect to Socket.io namespace `/queue`, emit `join-queue` with `{ hospitalId, doctorId, date }`, listen for `queue-update`. Handshake JWT is not verified yet — treat as a known gap for production.

### EMR

```
PATCH  /api/v1/emr/visits/:appointmentId/vitals
PATCH  /api/v1/emr/visits/:appointmentId
PATCH  /api/v1/emr/visits/:appointmentId/finalize
GET    /api/v1/emr/visits/:appointmentId
GET    /api/v1/emr/patients/:patientId/history?page=&limit=
GET    /api/v1/emr/patients/:patientId/summary
GET    /api/v1/emr/me/history
GET    /api/v1/emr/me/visits/:appointmentId
```

### Prescriptions

```
POST   /api/v1/emr/visits/:appointmentId/prescriptions
GET    /api/v1/emr/visits/:appointmentId/prescriptions
GET    /api/v1/prescriptions/:id
GET    /api/v1/patients/:patientId/prescriptions
PATCH  /api/v1/prescriptions/:id/cancel
GET    /api/v1/prescriptions/me
GET    /api/v1/prescriptions/me/:id
```

### Wards & beds

```
POST   /api/v1/wards
GET    /api/v1/wards
GET    /api/v1/wards/:id
PATCH  /api/v1/wards/:id
POST   /api/v1/wards/:wardId/beds
GET    /api/v1/wards/:wardId/beds
GET    /api/v1/beds/board
PATCH  /api/v1/beds/:id/status
```

### Admissions

```
POST   /api/v1/admissions
GET    /api/v1/admissions?status=&wardId=&patientId=&page=&limit=
GET    /api/v1/admissions/:id
PATCH  /api/v1/admissions/:id/transfer
PATCH  /api/v1/admissions/:id/discharge
PATCH  /api/v1/admissions/:id/discharge/nurse-checklist
POST   /api/v1/admissions/:id/vitals
GET    /api/v1/admissions/:id/vitals
POST   /api/v1/admissions/:id/rounds
GET    /api/v1/admissions/:id/rounds
POST   /api/v1/admissions/:id/medications
GET    /api/v1/admissions/:id/medications
PATCH  /api/v1/admissions/:id/medications/:orderId/administer
GET    /api/v1/admissions/me
```

### Pharmacy

```
POST   /api/v1/pharmacy/medicines
GET    /api/v1/pharmacy/medicines?q=
GET    /api/v1/pharmacy/medicines/low-stock
GET    /api/v1/pharmacy/medicines/expiring?days=30
GET    /api/v1/pharmacy/medicines/:id
PATCH  /api/v1/pharmacy/medicines/:id
POST   /api/v1/pharmacy/medicines/:id/batches
GET    /api/v1/pharmacy/medicines/:id/batches
POST   /api/v1/pharmacy/suppliers
GET    /api/v1/pharmacy/suppliers
POST   /api/v1/pharmacy/purchase-orders
GET    /api/v1/pharmacy/purchase-orders
GET    /api/v1/pharmacy/purchase-orders/:id
PATCH  /api/v1/pharmacy/purchase-orders/:id/receive
PATCH  /api/v1/pharmacy/purchase-orders/:id/cancel
GET    /api/v1/pharmacy/dispense-queue
POST   /api/v1/pharmacy/prescriptions/:prescriptionId/dispense
GET    /api/v1/pharmacy/prescriptions/:prescriptionId/dispense-history
GET    /api/v1/pharmacy/patients/:patientId/dispense-history
```

### Lab

```
POST   /api/v1/lab/tests
GET    /api/v1/lab/tests?q=
GET    /api/v1/lab/tests/:id
PATCH  /api/v1/lab/tests/:id
POST   /api/v1/emr/visits/:appointmentId/lab-orders
POST   /api/v1/admissions/:admissionId/lab-orders
GET    /api/v1/lab/orders?status=&priority=&patientId=&page=&limit=
GET    /api/v1/lab/orders/:id
PATCH  /api/v1/lab/orders/:id/collect-sample
PATCH  /api/v1/lab/orders/:id/start-processing
PATCH  /api/v1/lab/orders/:id/result
PATCH  /api/v1/lab/orders/:id/upload-report
PATCH  /api/v1/lab/orders/:id/verify
PATCH  /api/v1/lab/orders/:id/cancel
GET    /api/v1/lab/patients/:patientId/history
GET    /api/v1/lab/me
GET    /api/v1/lab/me/:id
```

### Billing

```
POST   /api/v1/billing/invoices
POST   /api/v1/billing/invoices/generate-from-appointment/:appointmentId
POST   /api/v1/billing/invoices/generate-from-admission/:admissionId
GET    /api/v1/billing/invoices?status=&patientId=&page=&limit=
GET    /api/v1/billing/invoices/:id
GET    /api/v1/billing/invoices/:id/payments
PATCH  /api/v1/billing/invoices/:id
PATCH  /api/v1/billing/invoices/:id/issue
PATCH  /api/v1/billing/invoices/:id/cancel
POST   /api/v1/billing/invoices/:id/payments
PATCH  /api/v1/billing/payments/:paymentId/refund
POST   /api/v1/billing/me/invoices/:id/pay/initiate
POST   /api/v1/billing/payments/:paymentId/confirm
PATCH  /api/v1/billing/invoices/:id/insurance-claim
PATCH  /api/v1/billing/invoices/:id/insurance-claim/status
GET    /api/v1/billing/me
GET    /api/v1/billing/me/:id
```

Invoice auto-generation does **not** include consultation fees (no per-doctor fee field yet) or IPD medication-order costs. Those are added as manual line items.

### Notifications

```
GET    /api/v1/notifications/me?unreadOnly=&page=&limit=
PATCH  /api/v1/notifications/me/:id/read
PATCH  /api/v1/notifications/me/read-all
GET    /api/v1/notifications/me/preferences
PATCH  /api/v1/notifications/me/preferences
POST   /api/v1/notifications/send
```

Triggered (best-effort, never fails the source action): OTP, appointment booked, lab result verified, medicines dispensed, invoice generated, discharge summary.

---

## Layout

```
src/
├── main.ts                 # helmet, CORS, validation, Swagger, prefix
├── app.module.ts           # global guards / interceptors / filter
├── config/                 # env + Joi schema
├── common/
│   ├── context/            # tenant AsyncLocalStorage
│   ├── counter/            # atomic UHID / token counters
│   ├── decorators/         # @Roles, @Public, @CurrentUser
│   ├── enums/              # Role
│   ├── filters/
│   ├── guards/             # JWT, roles, tenant
│   ├── interceptors/       # tenant context, logging, audit, response envelope
│   └── plugins/            # applyTenantPlugin
└── modules/
    ├── auth/
    ├── user/
    ├── hospitals/
    ├── patients/
    ├── doctors/
    ├── appointments/       # includes Socket.io gateway
    ├── emr/
    ├── prescriptions/
    ├── wards/
    ├── admissions/
    ├── pharmacy/
    ├── lab/
    ├── billing/
    ├── notifications/
    ├── otp/
    ├── audit-log/
    └── health/
scripts/
└── seed-super-admin.ts
```

### Adding a tenant-scoped module

1. Call `applyTenantPlugin(schema)` on the schema.
2. Validate bodies with `class-validator` DTOs.
3. Do not re-filter by `hospitalId` on ordinary queries; **do** filter in `.aggregate()`.
4. Protect staff routes with `@Roles(...)`. Patient self-service uses `/…/me` keyed by `req.user.userId`.
5. Import the module in `app.module.ts`.

---

## Cross-cutting behavior

- Global `ValidationPipe`: whitelist, forbid unknown fields, transform
- Consistent success/error envelopes (`TransformInterceptor`, `HttpExceptionFilter`)
- Helmet, CORS, compression
- Request logging and audit of writes
- Rate limiting (global + stricter on login/OTP)

---

## Not in this codebase yet

- Analytics / reporting endpoints
- Scheduler/cron (reminders, automated low-stock alerts)
- Real Razorpay/Stripe/PayU and real SMS/email/push (stubs are swap-in classes)
- Per-doctor consultation fees and IPD medication pricing on invoices
- Socket handshake JWT
- Field-level encryption for PII

---

## Production checklist

- Use long random JWT secrets, never `.env.example` values
- Terminate TLS in front of the API
- Set `CORS_ORIGIN` to real frontend origins
- Restrict MongoDB network access
- Authenticate Socket.io connections
- Encrypt sensitive clinical/PII fields if required by policy
