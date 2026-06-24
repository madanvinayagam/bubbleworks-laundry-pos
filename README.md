# Bubbleworks Billing System

Monorepo for a laundry and dry-cleaning billing system.

The repo contains:

- `apps/web`: the production frontend built with Next.js
- `apps/api`: the Express + Prisma backend API
- `packages/shared`: shared Zod schemas and billing helpers
- `apps/legacy-pos`: an older Vite-based POS app kept for reference

## Tech Stack

- Next.js 15
- React 18
- Express 5
- Prisma
- PostgreSQL
- TypeScript
- Tailwind CSS

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env` and fill in your values.

3. Generate Prisma client:

```bash
npm run prisma:generate
```

4. Run the web app:

```bash
npm run dev
```

5. Run the API separately when needed:

```bash
npm run dev:api
```

## Environment Variables

Root `.env` and production envs should include:

```env
# Database / API
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:3000
BACKUP_STORAGE_PATH=./backups

# Web app
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional local defaults
NODE_ENV=development
PORT=4000
SEED_ADMIN_PASSWORD=Admin1234
```

Do not commit real secrets to git.

## Deployment

### Can the frontend and backend both be deployed on Vercel?

Yes, and this repo now supports that layout with **two Vercel projects**:

- Frontend project from `apps/web`
- Backend project from `apps/api`

The frontend points to the backend with `NEXT_PUBLIC_API_URL`.
The backend is exposed through the catch-all function in `apps/api/api/[...all].ts`, and the health check now lives at `/api/health`.

If you want a **single Vercel project**, the backend would still need to be folded into the Next.js app as route handlers or API routes. That is a bigger restructure than this repo currently needs.

### Recommended Vercel setup

Frontend project:

- Root directory: `apps/web`
- Build command: `npm run vercel-build`
- Install command: `npm install`
- Environment variables:
  - `NEXT_PUBLIC_API_URL=https://your-api-domain`
  - `NEXT_PUBLIC_APP_URL=https://your-web-domain`

Backend project:

- Root directory: `apps/api`
- Build command: `npm run vercel-build`
- Environment variables:
  - `DATABASE_URL=...`
  - `JWT_SECRET=...`
  - `JWT_EXPIRES_IN=8h`
  - `CORS_ORIGIN=https://your-web-domain`
  - `NODE_ENV=production`
  - `NEXT_PUBLIC_API_URL` is not needed on the backend

### Helpful scripts

```bash
npm run dev        # Start the web app
npm run dev:web    # Start the web app explicitly
npm run dev:api    # Start the API locally
npm run build      # Build the deployable web app
npm run build:web  # Build the web app
npm run build:api  # Build the API
npm run build:vercel
```

`npm run build:vercel` builds the shared package and the web app, which is the command you want for the frontend deployment path.

## Notes

- The API uses Prisma against PostgreSQL.
- `packages/shared` must be built before the web app when deploying the frontend.
- The legacy Vite app remains in `apps/legacy-pos`, but it is not the primary deployment target.
