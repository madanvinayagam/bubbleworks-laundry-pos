# Laundry & Dry Wash POS

A lightweight web-based point-of-sale and receipt printing app for laundry and dry wash businesses. The app lets staff create laundry orders, calculate totals with round-off adjustments, store orders in Supabase, export transactions, and print 80mm thermal receipts.

## Links

Live deployment: https://invoice-generator-sage-five.vercel.app

Repository: https://github.com/dhineshbuilder/Invoice_generator

## Screenshots

### Login

![Login screen](public/screenshots/login.png)

### New Order

![New order screen](public/screenshots/order.png)

### Dashboard

![Dashboard screen](public/screenshots/dashboard.png)

## Features

- Admin login flow stored locally in the browser.
- Create laundry orders with customer name, remark, order number, order date, delivery date, and line items.
- Item and customer suggestions for faster entry.
- Quantity, price, subtotal, round-off, and final total calculation.
- Supabase-backed order storage.
- Recent transactions dashboard.
- Delete one order or clear all orders.
- Export orders to Excel.
- Export orders to PDF.
- 80mm thermal receipt print preview.
- Vercel-friendly single-page app routing.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui and Radix UI
- React Router
- Supabase
- jsPDF and jspdf-autotable
- SheetJS/xlsx
- Vercel

## Architecture Overview

```text
src/
  App.tsx                 Route definitions and app providers
  main.tsx                React app entry point
  lib/
    supabase.ts           Supabase client setup
  store/
    orders.ts             Order CRUD operations against Supabase
  pages/
    Login.tsx             Admin login screen
    Order.tsx             New order form and receipt creation flow
    Dashboard.tsx         Order history, delete, Excel export, PDF export
    PrintPreview.tsx      80mm receipt preview and print action
  components/ui/          Shared shadcn/ui components
  styles/
    print.css             Receipt print styling
  utils/
    format.ts             INR and date formatting helpers

supabase/
  migrations/             SQL migrations for the orders table

public/
  screenshots/            README screenshots
  logo.png                App logo assets
  logo1.png
```

The frontend talks directly to Supabase using the public anon key configured in Vite environment variables. Order data is saved in a single `orders` table. Items are stored as JSONB so each order can keep its line-item list together.

## Supabase Schema

The app expects this table:

```sql
create table if not exists public.orders (
  id text primary key,
  customer_name text not null,
  remark text default '',
  created_at timestamptz not null default now(),
  delivery_date timestamptz,
  items jsonb not null default '[]'::jsonb,
  round_off numeric(10,2) not null default 0.00,
  total numeric(10,2) not null default 0.00,
  updated_at timestamptz not null default now()
);
```

Run the full migration SQL from `supabase/migrations/` or paste the complete Supabase SQL setup into the Supabase SQL Editor before using the app.

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/dhineshbuilder/Invoice_generator.git
cd Invoice_generator
```

### 2. Install dependencies

```bash
npm install
```

On Windows PowerShell, use `npm.cmd` if script execution is blocked:

```powershell
npm.cmd install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Use `.env.example` as the template. Do not commit real Supabase keys.

### 4. Create the Supabase database table

Open your Supabase project, go to **SQL Editor**, and run the orders table SQL/migration. Make sure Row Level Security policies allow the anon client to select, insert, update, and delete orders if this POS is used without Supabase Auth.

### 5. Run the development server

```bash
npm run dev
```

Windows PowerShell:

```powershell
npm.cmd run dev
```

The app runs at:

```text
http://localhost:8080
```

### 6. Login

Default local login:

```text
Username: admin
Password: Admin1234
```

This is a simple frontend-only login for POS access, not a production authentication system.

## Available Scripts

```bash
npm run dev       # Start the Vite development server
npm run build     # Build for production
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint
```

## Deployment

This project is ready for Vercel deployment.

1. Push the repository to GitHub.
2. Import the repository in Vercel.
3. Add these environment variables in Vercel Project Settings:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Build command:

```bash
npm run build
```

5. Output directory:

```text
dist
```

The included `vercel.json` rewrites all routes to `index.html`, so direct links like `/order`, `/dashboard`, and `/print/:id` work correctly after deployment.

## Notes

- The app currently uses browser `localStorage` for admin login state.
- Supabase is used only for order persistence.
- Receipt printing depends on the browser print dialog and the styles in `src/styles/print.css`.
- Generated exports are created in the browser as `.xlsx` and `.pdf` files.
