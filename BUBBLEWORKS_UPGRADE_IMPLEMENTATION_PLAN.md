# Bubbleworks Laundry Management & Billing System - Upgrade Implementation Plan

## 1. Purpose

This document converts the Bubbleworks Client V1 product requirements into an implementation roadmap for upgrading the current Laundry & Dry Wash POS project into a scalable multi-branch laundry management and billing system.

The current project is a Vite React single-page app with Supabase order storage, local browser login, manual order numbers, simple dashboard, thermal print preview, and Excel/PDF export. Bubbleworks V1 requires a deeper rebuild: role-based authentication, multi-branch data ownership, PostgreSQL with Prisma, a backend API, report generation, audit trails, credit tracking, branch-aware numbering, and deployment across Vercel and Railway.

## 2. Target Product

Bubbleworks V1 should support:

- Multi-branch management.
- Super Admin and Cashier roles.
- Customer management with duplicate mobile prevention.
- Service management with per-piece and per-kg pricing.
- Branch-wise bill and token number generation.
- GST, discount, grand total, and payment calculations.
- Cash, UPI, card, and credit payment tracking.
- Order status workflow from received to delivered.
- Thermal printing for 58 mm and 80 mm printers.
- Reprint tracking.
- PDF export.
- Dashboard KPIs and charts.
- Revenue and operational reports.
- Audit logs.
- Backup and restore.
- Danger-zone data cleanup.
- Future SaaS-ready architecture.

## 3. Target Tech Stack

### Frontend

- Next.js 15 with App Router.
- TypeScript.
- Tailwind CSS.
- shadcn/ui.
- Recharts for analytics charts.
- Client-side print views for 58 mm and 80 mm receipts.
- PDF download support using server-rendered or API-generated PDFs.

### Backend

- Node.js.
- Express.js.
- JWT authentication.
- Role-based access control.
- Prisma ORM.
- PostgreSQL.

### Deployment

- Vercel for the Next.js frontend.
- Railway for the Express API and PostgreSQL database.
- Environment-based configuration for development, staging, and production.

## 4. Recommended Repository Strategy

The current repo should evolve into a monorepo-style layout so frontend and backend can be developed together while deploying independently.

```text
apps/
  web/
    Next.js 15 frontend
  api/
    Express.js backend
packages/
  shared/
    shared TypeScript types, constants, validation schemas
prisma/
  schema.prisma
  migrations/
docs/
  product/
  architecture/
  implementation/
```

Recommended package manager approach:

- Keep npm initially to reduce migration risk.
- Add workspaces once the new app and API are scaffolded.
- Migrate UI code from `src/` into `apps/web/`.
- Keep the existing Vite app untouched until the new app reaches feature parity.

## 5. Migration Strategy From Current App

### Keep Temporarily

- Existing receipt design ideas.
- Existing item/customer suggestion UX concepts.
- Existing dashboard export behavior as a reference.
- Existing screenshots for comparison.
- Existing Supabase order records for migration testing.

### Replace

- Browser-only login with JWT auth.
- Direct frontend-to-Supabase data access with backend API access.
- Manual order numbers with branch-aware generated bill numbers.
- Location-state-only print preview with database-backed order pages.
- Single `orders` table with normalized PostgreSQL tables.
- Public anon database permissions with authenticated API permissions.

### Remove After Migration

- Duplicate root-level React files once the Next.js app is live.
- Supabase client code.
- Supabase migrations.
- Unused dependencies such as MongoDB, Mongoose, Realm, Express-in-frontend package references, and stale type packages if not used.
- Generated timestamp files and stale Vite artifacts.

## 6. Core Architecture

### Request Flow

```text
Browser
  -> Next.js web app
  -> Express API
  -> Prisma
  -> PostgreSQL
```

### Auth Flow

```text
Login
  -> API validates username/password
  -> API returns JWT + user profile
  -> Web stores session securely
  -> Protected routes validate role and branch access
```

### Branch Isolation

- Every cashier belongs to exactly one branch.
- Every cashier-created customer, order, payment, and print log is branch-scoped.
- Super Admin can query across all branches.
- Cashier API requests must always be constrained to `assignedBranchId`.

## 7. Roles And Permissions

### Super Admin

Allowed modules:

- Dashboard.
- Branch management.
- Cashier management.
- Customer management.
- Service management.
- Billing.
- Order management.
- Bill history.
- Reports.
- Settings.
- Audit logs.
- Backup and restore.
- Data cleanup.

### Cashier

Allowed modules:

- Create bills.
- Create customers.
- Search customers.
- Update order status for assigned branch.
- Print bills.
- Reprint bills.
- View assigned branch bill history.

Restrictions:

- Cannot access other branches.
- Cannot manage branches.
- Cannot manage cashiers.
- Cannot change global settings.
- Cannot clear system data.
- Cannot view full-company audit logs unless explicitly allowed later.

## 8. Database Design

Use Prisma migrations as the source of truth. Reports should be computed from transactional tables first. Persist report snapshots later only if required for audit or accounting locks.

### Enums

```text
UserRole: SUPER_ADMIN, CASHIER
UserStatus: ACTIVE, DISABLED
BranchStatus: ACTIVE, INACTIVE
ServiceStatus: ACTIVE, INACTIVE
PricingType: PER_PIECE, PER_KG
OrderStatus: RECEIVED, WASHING, DRYING, IRONING, READY, DELIVERED
PaymentMethod: CASH, UPI, CARD, CREDIT
PaymentStatus: PAID, PARTIAL, UNPAID
PrinterSize: MM_58, MM_80
AuditAction: LOGIN, BILL_CREATED, BILL_EDITED, BILL_REPRINTED, CUSTOMER_ADDED, CUSTOMER_UPDATED, BRANCH_ADDED, CASHIER_CREATED, SETTINGS_UPDATED, DATA_CLEARED
```

### `users`

- `id`
- `name`
- `mobile`
- `username`
- `passwordHash`
- `role`
- `status`
- `branchId`
- `lastLoginAt`
- `createdById`
- `createdAt`
- `updatedAt`

Indexes:

- Unique `username`.
- Index `branchId`.
- Index `role`.

### `branches`

- `id`
- `name`
- `code`
- `address`
- `mobile`
- `status`
- `createdAt`
- `updatedAt`

Indexes:

- Unique `code`.
- Index `status`.

### `customers`

- `id`
- `branchId`
- `name`
- `mobile`
- `address`
- `createdAt`
- `updatedAt`

Indexes:

- Unique `branchId + mobile`.
- Index `name`.
- Index `mobile`.

Decision:

- For V1, customer mobile uniqueness should be branch-scoped. If Bubbleworks wants a single customer profile shared across branches later, add a global customer identity layer in V2.

### `services`

- `id`
- `name`
- `description`
- `pricingType`
- `defaultRate`
- `gstRate`
- `status`
- `createdAt`
- `updatedAt`

Indexes:

- Unique `name`.
- Index `pricingType`.
- Index `status`.

### `orders`

- `id`
- `branchId`
- `customerId`
- `createdById`
- `billNumber`
- `tokenNumber`
- `status`
- `orderDate`
- `expectedDeliveryDate`
- `deliveredDate`
- `subtotal`
- `discountAmount`
- `gstRate`
- `gstAmount`
- `grandTotal`
- `paidAmount`
- `balanceAmount`
- `paymentStatus`
- `notes`
- `createdAt`
- `updatedAt`

Indexes:

- Unique `branchId + billNumber`.
- Unique `branchId + tokenNumber`.
- Index `customerId`.
- Index `status`.
- Index `orderDate`.
- Index `expectedDeliveryDate`.
- Index `paymentStatus`.

### `order_items`

- `id`
- `orderId`
- `serviceId`
- `serviceNameSnapshot`
- `pricingType`
- `quantity`
- `weightKg`
- `rate`
- `amount`
- `createdAt`

Notes:

- Store service name and pricing snapshot so old bills stay historically accurate after service price changes.
- For per-piece services, use `quantity` and `rate`.
- For per-kg services, use `weightKg`, optional `quantity`, and `rate`.

### `payments`

- `id`
- `orderId`
- `branchId`
- `method`
- `amount`
- `referenceNumber`
- `receivedById`
- `paidAt`
- `createdAt`

Indexes:

- Index `orderId`.
- Index `branchId`.
- Index `method`.
- Index `paidAt`.

### `number_sequences`

- `id`
- `branchId`
- `sequenceDate`
- `billLastNumber`
- `tokenLastNumber`
- `createdAt`
- `updatedAt`

Indexes:

- Unique `branchId + sequenceDate`.

Purpose:

- Generate `BRANCHCODE-YYYYMMDD-0001`.
- Generate `TKN-YYYYMMDD-0001`.
- Ensure branch-wise daily uniqueness inside a database transaction.

### `print_logs`

- `id`
- `orderId`
- `userId`
- `printType`
- `printCount`
- `printedAt`
- `createdAt`

Purpose:

- Track original print and reprints.
- Reprint label should be derived from count: original, reprint #1, reprint #2, and so on.

### `audit_logs`

- `id`
- `userId`
- `branchId`
- `action`
- `entityType`
- `entityId`
- `metadata`
- `ipAddress`
- `userAgent`
- `createdAt`

Indexes:

- Index `userId`.
- Index `branchId`.
- Index `action`.
- Index `createdAt`.

### `settings`

- `id`
- `businessName`
- `logoUrl`
- `address`
- `mobile`
- `gstNumber`
- `defaultGstRate`
- `printerSize`
- `createdAt`
- `updatedAt`

Decision:

- Start with a single global settings row for Client V1.
- Add tenant/company settings later for SaaS V2.

### `backup_jobs`

- `id`
- `type`
- `status`
- `fileUrl`
- `createdById`
- `createdAt`
- `completedAt`
- `metadata`

Purpose:

- Track manual exports and imports.
- Keep restore actions auditable.

## 9. API Design

Base path:

```text
/api/v1
```

### Auth

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`

### Branches

- `GET /branches`
- `POST /branches`
- `GET /branches/:id`
- `PATCH /branches/:id`
- `POST /branches/:id/activate`
- `POST /branches/:id/deactivate`
- `GET /branches/:id/orders`
- `GET /branches/:id/revenue`

### Users and Cashiers

- `GET /users`
- `POST /users/cashiers`
- `PATCH /users/:id`
- `POST /users/:id/reset-password`
- `POST /users/:id/enable`
- `POST /users/:id/disable`

### Customers

- `GET /customers`
- `POST /customers`
- `GET /customers/:id`
- `PATCH /customers/:id`
- `DELETE /customers/:id`
- `GET /customers/search`
- `GET /customers/:id/profile`

### Services

- `GET /services`
- `POST /services`
- `PATCH /services/:id`
- `DELETE /services/:id`
- `POST /services/:id/activate`
- `POST /services/:id/deactivate`

### Orders and Billing

- `POST /orders`
- `GET /orders`
- `GET /orders/:id`
- `PATCH /orders/:id/status`
- `PATCH /orders/:id`
- `GET /orders/:id/receipt`
- `POST /orders/:id/print`
- `POST /orders/:id/reprint`
- `GET /orders/:id/pdf`

### Reports

- `GET /reports/dashboard`
- `GET /reports/revenue/daily`
- `GET /reports/revenue/weekly`
- `GET /reports/revenue/monthly`
- `GET /reports/revenue/yearly`
- `GET /reports/revenue/custom`
- `GET /reports/revenue/customer`
- `GET /reports/revenue/branch`
- `GET /reports/payments`
- `GET /reports/gst`
- `GET /reports/orders`
- `GET /reports/export/pdf`

### Audit Logs

- `GET /audit-logs`

### Settings

- `GET /settings`
- `PATCH /settings/business`
- `PATCH /settings/tax`
- `PATCH /settings/printer`

### Backup and Restore

- `POST /backup/export`
- `GET /backup/jobs`
- `POST /backup/import`

### Danger Zone

- `POST /danger-zone/clear-all-data`

Rules:

- Require `CONFIRM DELETE` in the request body.
- Require Super Admin role.
- Create an audit log before and after the cleanup.
- Never expose this endpoint to Cashier users.

## 10. Frontend Route Plan

Use Next.js App Router route groups.

```text
app/
  (auth)/
    login/
  (app)/
    dashboard/
    billing/new/
    orders/
    orders/[id]/
    orders/[id]/print/
    customers/
    customers/[id]/
    services/
    branches/
    cashiers/
    reports/
    reports/revenue/
    reports/payments/
    settings/
    audit-logs/
    backup-restore/
    danger-zone/
```

### Layouts

- Auth layout for login.
- App shell with sidebar, top bar, branch context, user menu, and quick bill action.
- Print layout without navigation.

### Navigation By Role

Super Admin sidebar:

- Dashboard.
- Billing.
- Orders.
- Customers.
- Services.
- Branches.
- Cashiers.
- Reports.
- Audit Logs.
- Backup and Restore.
- Settings.
- Danger Zone.

Cashier sidebar:

- New Bill.
- Orders.
- Customers.
- Bill History.

## 11. Feature Implementation Phases

### Phase 0 - Project Preparation

Goal:

Prepare the existing repo for a clean rebuild while preserving the current app as a reference.

Tasks:

- Create `apps/web`, `apps/api`, `packages/shared`, `prisma`, and `docs`.
- Move current Vite app into `legacy/vite-pos` or keep it temporarily until feature parity.
- Add npm workspaces.
- Add shared lint, TypeScript, and formatting configuration.
- Document environment variable requirements.
- Add local PostgreSQL setup instructions.
- Confirm deployment targets and production domains.

Deliverables:

- Monorepo structure.
- Legacy app preserved.
- Empty Next.js app running.
- Empty Express API running.
- Prisma connected to PostgreSQL.

### Phase 1 - Backend Foundation

Goal:

Build the secure backend foundation.

Tasks:

- Create Express API.
- Add Prisma schema and first migration.
- Add JWT auth.
- Add password hashing with bcrypt or argon2.
- Add role-based middleware.
- Add branch-scope middleware.
- Add request validation with Zod.
- Add centralized error handling.
- Add audit logging helper.
- Seed Super Admin, default settings, sample branches, and default services.

Deliverables:

- Login API.
- Protected API routes.
- Database migrations.
- Seed script.
- API health check.

### Phase 2 - Frontend Foundation

Goal:

Build the production app shell.

Tasks:

- Scaffold Next.js 15 app with TypeScript and Tailwind CSS.
- Install and configure shadcn/ui.
- Build login page.
- Build protected app layout.
- Add session handling.
- Add route guards by role.
- Build navigation shell.
- Add API client utilities.
- Add shared UI states for loading, empty, error, and unauthorized access.

Deliverables:

- Working login.
- Super Admin shell.
- Cashier shell.
- Protected routes.

### Phase 3 - Branch, Cashier, Settings, And Service Management

Goal:

Give Super Admin the master data tools needed before billing.

Tasks:

- Branch CRUD with activate/deactivate.
- Cashier CRUD with assigned branch.
- Reset password flow.
- Enable/disable login flow.
- Business settings form.
- GST settings form.
- Printer settings form.
- Service CRUD.
- Service activate/deactivate.
- Pricing type support: per piece and per kg.

Deliverables:

- Branch management module.
- Cashier management module.
- Settings module.
- Service management module.
- Audit logs for all admin changes.

### Phase 4 - Customer Management

Goal:

Build customer search, creation, duplicate prevention, and profiles.

Tasks:

- Customer list.
- Customer create/edit/delete.
- Search by name and mobile number.
- Duplicate mobile check.
- "Use existing customer" decision flow.
- Customer profile page.
- Total orders.
- Total amount spent.
- Last visit.
- Outstanding balance.
- Previous bills.

Deliverables:

- Customer management module.
- Customer profile module.
- Customer search APIs.

### Phase 5 - Billing And Order Creation

Goal:

Build the cashier billing flow.

Tasks:

- New bill page.
- Branch-aware bill number generation.
- Branch-aware token number generation.
- Customer selection with smart suggestions.
- Customer quick-create inside billing.
- Checkbox-based service selection.
- Per-piece item entry.
- Wash & Fold per-kg module with number of clothes, weight, and rate.
- Discount input.
- GST calculation using settings default.
- Payment method selection.
- Credit payment handling with paid and balance amount.
- Expected delivery date.
- Create order transaction.
- Audit log for bill creation.

Deliverables:

- Complete billing workflow.
- Correct bill/token generation.
- Correct subtotal, discount, GST, grand total, paid amount, and balance amount.
- Credit orders visible in outstanding reports.

### Phase 6 - Printing, PDF, QR Code, And Reprint Tracking

Goal:

Make bills printable, downloadable, and traceable.

Tasks:

- Receipt template with business name, branch, bill number, token number, customer, mobile, services, GST, grand total, payment method, and expected delivery date.
- 58 mm thermal print CSS.
- 80 mm thermal print CSS.
- Printer setting integration.
- QR code generation containing order URL or token lookup URL.
- Order print page loads by database ID.
- PDF download endpoint or client export.
- Original print tracking.
- Reprint tracking with user, date, time, and reprint count.

Deliverables:

- Thermal bill printing.
- PDF download.
- QR code on bills.
- Reprint history.

### Phase 7 - Order Management And Bill History

Goal:

Make active orders searchable and trackable.

Tasks:

- Orders list.
- Bill history filters: bill number, token number, customer name, mobile, branch, date, payment method, and order status.
- Order detail page.
- Status workflow: Received, Washing, Drying, Ironing, Ready, Delivered.
- Delivered date capture.
- Dashboard tracking for due today, overdue, and ready orders.
- Reprint and download actions from history.

Deliverables:

- Order tracking module.
- Bill history module.
- Status update audit logs.

### Phase 8 - Dashboard And Analytics

Goal:

Build operational visibility for Super Admin and branch-level visibility for Cashiers.

Tasks:

- KPI API.
- Total orders.
- Today's orders.
- Pending orders.
- Ready orders.
- Delivered orders.
- Due today orders.
- Overdue orders.
- Total customers.
- Today's revenue.
- Weekly revenue.
- Monthly revenue.
- Yearly revenue.
- GST collection.
- Outstanding credit.
- Revenue trend chart.
- Order trend chart.
- Top services chart.
- Branch performance chart.

Deliverables:

- Super Admin dashboard.
- Cashier branch dashboard.
- Charts with daily, weekly, and monthly filters.

### Phase 9 - Reports

Goal:

Build printable and exportable reports.

Tasks:

- Daily revenue report.
- Weekly revenue report.
- Monthly revenue report.
- Yearly revenue report.
- Custom date revenue report.
- Customer-wise revenue report.
- Branch-wise revenue report.
- Daily operational report.
- Weekly operational report.
- Monthly operational report.
- Yearly operational report.
- Customer-wise report.
- Branch-wise report.
- Payment-wise report.
- GST report.
- Print action for every report.
- PDF export for every report.

Deliverables:

- Reports module.
- Report print layouts.
- Report PDF exports.

### Phase 10 - Audit Logs, Backup, Restore, And Danger Zone

Goal:

Complete administrative controls and safety mechanisms.

Tasks:

- Audit log viewer.
- Filters by user, branch, action, entity, and date.
- Backup export job.
- Backup download.
- Restore upload flow.
- Restore validation.
- Data cleanup warning dialog.
- Typed `CONFIRM DELETE` verification.
- Clear all data endpoint.
- Audit cleanup actions.

Deliverables:

- Audit logs module.
- Backup and restore module.
- Danger Zone module.

### Phase 11 - Testing, Hardening, And Deployment

Goal:

Prepare Bubbleworks V1 for production.

Tasks:

- Unit tests for calculations, numbering, role access, branch scoping, and report queries.
- Integration tests for billing, payments, order status, and reprint tracking.
- End-to-end tests for Super Admin and Cashier workflows.
- Print layout verification for 58 mm and 80 mm.
- Security review for JWT, password handling, role checks, and branch isolation.
- Database backup and restore dry run.
- Vercel deployment.
- Railway API deployment.
- Railway PostgreSQL setup.
- Production environment variables.
- Smoke test production deployment.

Deliverables:

- Production-ready V1.
- Test report.
- Deployment checklist.
- Rollback plan.

## 12. Implementation Order

Recommended build order:

1. Repo restructure.
2. PostgreSQL and Prisma schema.
3. Express API foundation.
4. JWT auth and RBAC.
5. Next.js app shell.
6. Branches.
7. Cashiers.
8. Settings.
9. Services.
10. Customers.
11. Billing and order creation.
12. Thermal print and PDF.
13. Order tracking and bill history.
14. Dashboard KPIs.
15. Reports.
16. Audit logs.
17. Backup and restore.
18. Danger Zone.
19. Production deployment.

## 13. Milestone Plan

### Milestone 1 - Foundation

Target outcome:

- New project structure.
- API, database, and web app running locally.
- Super Admin login working.

Estimated scope:

- 1 to 2 weeks.

### Milestone 2 - Admin Master Data

Target outcome:

- Branch, cashier, settings, and service modules complete.

Estimated scope:

- 1 to 2 weeks.

### Milestone 3 - Billing MVP

Target outcome:

- Cashier can create customers, create bills, calculate GST, collect payments, and print thermal receipts.

Estimated scope:

- 2 to 3 weeks.

### Milestone 4 - Operations

Target outcome:

- Order status tracking, bill history, reprint tracking, PDF export, and QR code support complete.

Estimated scope:

- 1 to 2 weeks.

### Milestone 5 - Reports And Analytics

Target outcome:

- Dashboard KPIs, charts, and reports complete.

Estimated scope:

- 2 to 3 weeks.

### Milestone 6 - Admin Safety And Production

Target outcome:

- Audit logs, backup/restore, danger zone, testing, and deployment complete.

Estimated scope:

- 1 to 2 weeks.

## 14. Number Generation Rules

### Bill Number

Format:

```text
BRANCHCODE-YYYYMMDD-0001
```

Examples:

```text
ERD-20260623-0001
CHN-20260623-0001
```

Rules:

- Unique per branch per day.
- Generated by backend only.
- Generated inside a database transaction.
- Never generated in the frontend.

### Token Number

Format:

```text
TKN-YYYYMMDD-0001
```

Rules:

- Unique per branch per day.
- Generated by backend only.
- Generated inside the same order creation transaction.

## 15. Billing Calculation Rules

Calculation:

```text
Subtotal = sum(order item amounts)
Discount = optional amount
Taxable Amount = Subtotal - Discount
GST Amount = Taxable Amount * GST Rate
Grand Total = Taxable Amount + GST Amount
Balance Amount = Grand Total - Paid Amount
```

Rules:

- GST defaults to 18 percent.
- Admin can modify default GST in settings.
- Each order stores the GST rate used at billing time.
- Service prices should be snapshotted into order items.
- Credit payment requires paid amount and balance amount.
- Non-credit payment should normally set paid amount equal to grand total.

## 16. QR Code Rules

Every bill should contain a QR code.

Recommended QR payload:

```text
https://app-domain.com/orders/{orderId}
```

Alternative payload for offline/token lookup:

```json
{
  "billNumber": "ERD-20260623-0001",
  "tokenNumber": "TKN-20260623-0001"
}
```

Recommended V1 decision:

- Use order URL as QR payload.
- Require authenticated access to view the order.
- Add public customer tracking page only in a future version.

## 17. Security Requirements

- Passwords must be hashed.
- JWT secret must never be committed.
- Cashier access must always be branch-scoped.
- Super Admin-only routes must be enforced in both UI and API.
- Audit important actions.
- Do not expose database credentials to the frontend.
- Validate every API payload.
- Use HTTPS in production.
- Rate-limit login endpoint.
- Add session expiry.
- Disable inactive users from logging in.

## 18. Data Migration Plan

Current Supabase data can be migrated into the new schema if needed.

Steps:

1. Export current Supabase `orders`.
2. Create a default branch, such as `MAIN`.
3. Create or map customers by customer name and optional mobile if available.
4. Convert each current order into `orders`.
5. Convert each JSON item into `order_items`.
6. Set existing order status to `DELIVERED` or `RECEIVED` based on business decision.
7. Set payment method to `CASH` unless historical data is available.
8. Set payment status to `PAID` unless credit data is available.
9. Keep old order number as imported bill number or store it in `notes`.
10. Verify totals against the source data.

Decision needed before migration:

- Whether old orders should keep their old order numbers or receive new Bubbleworks bill numbers.

## 19. Testing Plan

### Unit Tests

- Bill number generation.
- Token number generation.
- GST calculation.
- Discount calculation.
- Credit balance calculation.
- Role permission checks.
- Branch scoping rules.
- Report date range helpers.

### Integration Tests

- Login.
- Cashier creates customer.
- Cashier creates bill.
- Order creation transaction.
- Payment recording.
- Status update.
- Reprint tracking.
- Report APIs.
- Backup export.

### End-to-End Tests

- Super Admin creates branch and cashier.
- Cashier logs in and creates a bill.
- Cashier prints and reprints bill.
- Super Admin views dashboard and reports.
- Super Admin exports PDF report.
- Super Admin clears data only after confirmation.

### Manual QA

- 58 mm print preview.
- 80 mm print preview.
- PDF layout.
- Mobile billing flow.
- Slow network states.
- Duplicate customer flow.
- Wrong role access attempts.

## 20. Deployment Plan

### Railway

- Create PostgreSQL database.
- Deploy Express API.
- Set API environment variables.
- Run Prisma migrations.
- Run seed script.
- Configure production CORS to allow only the Vercel frontend domain.

### Vercel

- Deploy Next.js frontend.
- Set frontend environment variables.
- Point frontend to Railway API URL.
- Configure rewrites only if needed.

### Production Environment Variables

API:

```text
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=
CORS_ORIGIN=
NODE_ENV=production
BACKUP_STORAGE_PATH=
```

Web:

```text
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_URL=
```

## 21. Definition Of Done For V1

Bubbleworks V1 is complete when:

- Super Admin can manage branches, cashiers, services, customers, settings, reports, audit logs, backups, and data cleanup.
- Cashier can only access assigned branch data.
- Cashier can create bills with customer, services, GST, payment method, and expected delivery date.
- Bill and token numbers are generated automatically and uniquely per branch.
- Thermal receipts print correctly in 58 mm and 80 mm formats.
- Every bill includes QR code and token number.
- Reprints are tracked.
- Order statuses work from received to delivered.
- Dashboard KPIs and charts reflect correct data.
- Reports support view, print, and PDF export.
- Credit balances are tracked.
- Audit logs capture important events.
- Backup export and restore flows are available.
- Danger Zone clear-all-data requires explicit confirmation.
- Production deployments are live on Vercel and Railway.

## 22. Key Product Decisions To Confirm

These decisions should be confirmed before heavy implementation starts:

- Should customers be unique per branch or globally unique across all branches?
- Should old orders keep old order numbers after migration?
- Should bill edits be allowed after payment or delivery?
- Should GST be global only, or can each service override GST?
- Should Cashiers see revenue KPIs, or only order counts?
- Should QR codes open an authenticated internal page or a public customer tracking page?
- Should backup files be stored locally, in Railway volume storage, or cloud object storage?
- Should reports be computed live or saved as locked snapshots at day/month close?

## 23. Suggested Immediate Next Step

Start with Phase 0 and Phase 1:

1. Create the monorepo structure.
2. Scaffold `apps/web` with Next.js 15.
3. Scaffold `apps/api` with Express.
4. Add Prisma and PostgreSQL.
5. Implement auth, roles, branch scoping, and seed data.

This creates the foundation that every other Bubbleworks module depends on.
