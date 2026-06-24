# Phase 0 Foundation Notes

## Completed In This Slice

- Added npm workspace structure for `apps/*` and `packages/*`.
- Preserved the current Vite/Supabase POS in place.
- Added `packages/shared` for Bubbleworks enums, validation schemas, billing calculations, and number formatting helpers.
- Added root Prisma schema for the normalized Bubbleworks PostgreSQL model.
- Added Prisma seed for the initial Super Admin, main branch, settings, services, and audit entry.
- Added `apps/api` Express foundation with:
  - environment validation,
  - Prisma client,
  - centralized error handling,
  - JWT login,
  - authenticated `/me`,
  - RBAC helper,
  - branch-scope helper,
  - health endpoint.
- Added `apps/web` Next.js foundation with:
  - login screen,
  - app shell,
  - dashboard route,
  - billing route,
  - master-data/report/admin route surfaces.

## Still Pending For Phase 1

- Add branch CRUD routes.
- Add cashier CRUD and password reset routes.
- Add customer CRUD and duplicate mobile checks.
- Add service CRUD routes.
- Add order creation transaction with bill/token number generation.
- Add API tests around auth, RBAC, and branch scoping.

## Migration Position

The legacy POS should remain the operational fallback until Bubbleworks can create bills, print receipts, and show order history from PostgreSQL.
