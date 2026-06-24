# Bubbleworks Local Environment

## Current State

The existing Vite POS remains available from the repository root. The Bubbleworks rebuild now lives beside it:

```text
apps/api       Express API
apps/web       Next.js app
packages/shared shared types, schemas, and billing helpers
prisma         PostgreSQL schema and seed
```

## Required Services

- Node.js 20 or newer.
- PostgreSQL 15 or newer.
- npm workspaces.

## Environment Files

Root `.env` can keep the legacy Supabase variables while development is in transition.

Create `apps/api/.env` from `apps/api/.env.example`:

```text
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/bubbleworks?schema=public
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:3000
BACKUP_STORAGE_PATH=./backups
```

Create `apps/web/.env.local`:

```text
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Setup

1. Create a local PostgreSQL database named `bubbleworks`.
2. Run `npm run prisma:generate`.
3. Run `npm run prisma:migrate -- --name initial_bubbleworks_schema`.
4. Run `npm run prisma:seed`.

The seed creates:

- Super Admin username `admin`.
- Super Admin password from `SEED_ADMIN_PASSWORD`, defaulting to `Admin1234`.
- `MAIN` branch.
- Default Bubbleworks settings.
- Common laundry services.

## Development Commands

```powershell
npm.cmd run dev:legacy
npm.cmd run dev:api
npm.cmd run dev:web
```

The legacy app uses port `8080`, the API uses port `4000`, and the Next.js app uses port `3000`.
