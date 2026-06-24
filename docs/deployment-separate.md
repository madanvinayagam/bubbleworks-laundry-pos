# Separate Deployment Plan

This repository is now set up for a split deployment:

- Frontend: `apps/web`
- Backend API: `apps/api`
- Database: Supabase Postgres
- Shared code: `packages/shared`

## Recommended Architecture

Use two deployments:

1. Frontend on Vercel
2. Backend on a separate Node host such as Render, Railway, Fly.io, or a VM

This keeps the browser app fast and lets the API run as a normal long-lived Node service with Prisma.

## What Changed In The Repo

- The old root `vercel.json` routing file was removed.
- The API now starts a real HTTP server in production everywhere except Vercel serverless.
- The API CORS config can accept one origin or a comma-separated list of origins.
- Root workspace scripts were added for backend build and start commands.

## Environment Variables

### Backend

Set these on the backend host:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=your_supabase_postgres_connection_string
JWT_SECRET=use-a-long-random-secret-at-least-24-characters
JWT_EXPIRES_IN=8h
CORS_ORIGIN=https://your-frontend-domain.vercel.app
BACKUP_STORAGE_PATH=/tmp/backups
```

If you need multiple allowed origins, separate them with commas:

```env
CORS_ORIGIN=https://your-frontend-domain.vercel.app,https://your-preview-domain.vercel.app
```

### Frontend

Set these in Vercel for `apps/web`:

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
NEXT_PUBLIC_APP_URL=https://your-frontend-domain.vercel.app
```

## Backend Deployment Steps

1. Push the repo to GitHub.
2. Create a new backend service on your host of choice.
3. Point the service to the repository root, not `apps/api`, so the workspace scripts can build `packages/shared` first.
4. Use this build command:

```bash
npm ci && npm run build:backend
```

5. Use this start command:

```bash
npm run start:backend
```

6. Set the backend environment variables listed above.
7. Deploy the service.
8. Open the backend URL and verify:

```text
/health
/api/v1/auth/login
```

## Frontend Deployment Steps

1. In Vercel, create a new project from the same GitHub repo.
2. Set the Root Directory to `apps/web`.
3. Keep the build command as the default Next.js build, or use:

```bash
npm run build
```

4. Set the output settings to the Next.js default.
5. Add the frontend environment variables listed above.
6. Deploy the project.
7. Confirm the app can log in and can reach the backend through `NEXT_PUBLIC_API_URL`.

## Local Development

Run everything from the repo root:

```bash
npm install
npm run build:shared
npm run dev:api
npm run dev:web
```

If you want the legacy app:

```bash
npm run dev
```

## Production Checklist

- Supabase schema created and seeded
- Backend deployed and responding on `/health`
- Frontend deployed with the correct `NEXT_PUBLIC_API_URL`
- Backend `CORS_ORIGIN` set to the frontend domain
- Login works in production
- Orders, customers, services, and reports load correctly

## Notes

- The API uses Prisma and expects `DATABASE_URL` to point at Supabase.
- `BACKUP_STORAGE_PATH` is useful on a persistent server, but serverless hosts may ignore local file writes.
- If you deploy previews, add the preview domain to `CORS_ORIGIN` too.
