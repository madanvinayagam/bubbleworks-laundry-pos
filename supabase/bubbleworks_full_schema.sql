-- Bubbleworks Laundry Management & Billing System
-- Supabase PostgreSQL setup matching prisma/schema.prisma.
-- Safe to rerun: creates missing enums/tables/indexes/triggers and upserts seed data.

create extension if not exists pgcrypto;

do $$
begin
  create type public."UserRole" as enum ('ADMIN', 'CASHIER');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public."UserStatus" as enum ('ACTIVE', 'DISABLED');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public."BranchStatus" as enum ('ACTIVE', 'INACTIVE');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public."ServiceStatus" as enum ('ACTIVE', 'INACTIVE');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public."PricingType" as enum ('PER_PIECE', 'PER_KG');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public."OrderStatus" as enum ('RECEIVED', 'WASHING', 'DRYING', 'IRONING', 'READY', 'DELIVERED');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public."PaymentMethod" as enum ('CASH', 'UPI', 'CARD', 'CREDIT');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public."PaymentStatus" as enum ('PAID', 'PARTIAL', 'UNPAID');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public."PrinterSize" as enum ('MM_58', 'MM_80');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public."PrintType" as enum ('ORIGINAL', 'REPRINT');
exception when duplicate_object then null;
end $$;

create table if not exists public."Branch" (
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "code" text not null unique,
  "address" text not null,
  "mobile" text not null,
  "status" public."BranchStatus" not null default 'ACTIVE',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."User" (
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null,
  "mobile" text not null,
  "username" text not null unique,
  "passwordHash" text not null,
  "role" public."UserRole" not null,
  "status" public."UserStatus" not null default 'ACTIVE',
  "branchId" uuid references public."Branch"("id") on delete set null,
  "lastLoginAt" timestamptz,
  "createdById" uuid references public."User"("id") on delete set null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."Customer" (
  "id" uuid primary key default gen_random_uuid(),
  "branchId" uuid not null references public."Branch"("id") on delete restrict,
  "name" text not null,
  "mobile" text not null,
  "address" text not null default '',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "Customer_branchId_mobile_key" unique ("branchId", "mobile")
);

create table if not exists public."Service" (
  "id" uuid primary key default gen_random_uuid(),
  "name" text not null unique,
  "description" text not null default '',
  "pricingType" public."PricingType" not null,
  "defaultRate" numeric(10,2) not null,
  "gstRate" numeric(5,2) not null default 18.00,
  "status" public."ServiceStatus" not null default 'ACTIVE',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public."Order" (
  "id" uuid primary key default gen_random_uuid(),
  "branchId" uuid not null references public."Branch"("id") on delete restrict,
  "customerId" uuid not null references public."Customer"("id") on delete restrict,
  "createdById" uuid not null references public."User"("id") on delete restrict,
  "billNumber" text not null,
  "tokenNumber" text not null,
  "status" public."OrderStatus" not null default 'RECEIVED',
  "orderDate" timestamptz not null default now(),
  "expectedDeliveryDate" timestamptz not null,
  "deliveredDate" timestamptz,
  "subtotal" numeric(10,2) not null,
  "discountAmount" numeric(10,2) not null default 0.00,
  "gstRate" numeric(5,2) not null default 18.00,
  "gstAmount" numeric(10,2) not null,
  "grandTotal" numeric(10,2) not null,
  "paidAmount" numeric(10,2) not null default 0.00,
  "balanceAmount" numeric(10,2) not null default 0.00,
  "paymentStatus" public."PaymentStatus" not null default 'UNPAID',
  "notes" text not null default '',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "Order_branchId_billNumber_key" unique ("branchId", "billNumber"),
  constraint "Order_branchId_tokenNumber_key" unique ("branchId", "tokenNumber")
);

create table if not exists public."OrderItem" (
  "id" uuid primary key default gen_random_uuid(),
  "orderId" uuid not null references public."Order"("id") on delete cascade,
  "serviceId" uuid references public."Service"("id") on delete set null,
  "serviceNameSnapshot" text not null,
  "pricingType" public."PricingType" not null,
  "quantity" integer,
  "weightKg" numeric(10,3),
  "rate" numeric(10,2) not null,
  "amount" numeric(10,2) not null,
  "createdAt" timestamptz not null default now()
);

create table if not exists public."Payment" (
  "id" uuid primary key default gen_random_uuid(),
  "orderId" uuid not null references public."Order"("id") on delete cascade,
  "branchId" uuid not null references public."Branch"("id") on delete restrict,
  "method" public."PaymentMethod" not null,
  "amount" numeric(10,2) not null,
  "referenceNumber" text,
  "receivedById" uuid not null references public."User"("id") on delete restrict,
  "paidAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now()
);

create table if not exists public."NumberSequence" (
  "id" uuid primary key default gen_random_uuid(),
  "branchId" uuid not null references public."Branch"("id") on delete restrict,
  "sequenceDate" date not null,
  "billLastNumber" integer not null default 0,
  "tokenLastNumber" integer not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "NumberSequence_branchId_sequenceDate_key" unique ("branchId", "sequenceDate")
);

create table if not exists public."PrintLog" (
  "id" uuid primary key default gen_random_uuid(),
  "orderId" uuid not null references public."Order"("id") on delete cascade,
  "userId" uuid not null references public."User"("id") on delete restrict,
  "printType" public."PrintType" not null,
  "printCount" integer not null,
  "printedAt" timestamptz not null default now(),
  "createdAt" timestamptz not null default now()
);

create table if not exists public."Setting" (
  "id" text primary key default 'global',
  "businessName" text not null default 'Bubbleworks',
  "logoUrl" text,
  "address" text not null default '',
  "mobile" text not null default '',
  "gstNumber" text not null default '',
  "defaultGstRate" numeric(5,2) not null default 18.00,
  "printerSize" public."PrinterSize" not null default 'MM_80',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists "User_branchId_idx" on public."User"("branchId");
create index if not exists "User_role_idx" on public."User"("role");
create index if not exists "Branch_status_idx" on public."Branch"("status");
create index if not exists "Customer_name_idx" on public."Customer"("name");
create index if not exists "Customer_mobile_idx" on public."Customer"("mobile");
create index if not exists "Service_pricingType_idx" on public."Service"("pricingType");
create index if not exists "Service_status_idx" on public."Service"("status");
create index if not exists "Order_customerId_idx" on public."Order"("customerId");
create index if not exists "Order_status_idx" on public."Order"("status");
create index if not exists "Order_orderDate_idx" on public."Order"("orderDate");
create index if not exists "Order_expectedDeliveryDate_idx" on public."Order"("expectedDeliveryDate");
create index if not exists "Order_paymentStatus_idx" on public."Order"("paymentStatus");
create index if not exists "OrderItem_orderId_idx" on public."OrderItem"("orderId");
create index if not exists "OrderItem_serviceId_idx" on public."OrderItem"("serviceId");
create index if not exists "Payment_orderId_idx" on public."Payment"("orderId");
create index if not exists "Payment_branchId_idx" on public."Payment"("branchId");
create index if not exists "Payment_method_idx" on public."Payment"("method");
create index if not exists "Payment_paidAt_idx" on public."Payment"("paidAt");
create index if not exists "PrintLog_orderId_idx" on public."PrintLog"("orderId");
create index if not exists "PrintLog_userId_idx" on public."PrintLog"("userId");

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

drop trigger if exists set_branch_updated_at on public."Branch";
create trigger set_branch_updated_at
before update on public."Branch"
for each row execute function public.set_updated_at();

drop trigger if exists set_user_updated_at on public."User";
create trigger set_user_updated_at
before update on public."User"
for each row execute function public.set_updated_at();

drop trigger if exists set_customer_updated_at on public."Customer";
create trigger set_customer_updated_at
before update on public."Customer"
for each row execute function public.set_updated_at();

drop trigger if exists set_service_updated_at on public."Service";
create trigger set_service_updated_at
before update on public."Service"
for each row execute function public.set_updated_at();

drop trigger if exists set_order_updated_at on public."Order";
create trigger set_order_updated_at
before update on public."Order"
for each row execute function public.set_updated_at();

drop trigger if exists set_number_sequence_updated_at on public."NumberSequence";
create trigger set_number_sequence_updated_at
before update on public."NumberSequence"
for each row execute function public.set_updated_at();

drop trigger if exists set_setting_updated_at on public."Setting";
create trigger set_setting_updated_at
before update on public."Setting"
for each row execute function public.set_updated_at();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'Branch',
    'User',
    'Customer',
    'Service',
    'Order',
    'OrderItem',
    'Payment',
    'NumberSequence',
    'PrintLog',
    'Setting'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

-- Secure default:
-- No anon/authenticated Supabase policies are created here.
-- The Bubbleworks Express API should connect using DATABASE_URL and enforce JWT/RBAC/branch scoping.

with branch_upsert as (
  insert into public."Branch" ("name", "code", "address", "mobile", "status")
  values ('Main Branch', 'MAIN', 'Bubbleworks Main Branch', '0000000000', 'ACTIVE')
  on conflict ("code") do update set
    "name" = excluded."name",
    "address" = excluded."address",
    "mobile" = excluded."mobile",
    "status" = excluded."status"
  returning "id"
),
admin_upsert as (
  insert into public."User" (
    "name",
    "mobile",
    "username",
    "passwordHash",
    "role",
    "status"
  )
  values (
    'Admin',
    '0000000000',
    'admin',
    '$2b$12$o7U0Qql8HprplLZYGJeYk.rripUXuZYlPxpOtlJTd/8mLr6g.4eZS',
    'ADMIN',
    'ACTIVE'
  )
  on conflict ("username") do update set
    "name" = excluded."name",
    "mobile" = excluded."mobile",
    "passwordHash" = excluded."passwordHash",
    "role" = excluded."role",
    "status" = excluded."status"
  returning "id"
)
insert into public."Setting" (
  "id",
  "businessName",
  "address",
  "mobile",
  "gstNumber",
  "defaultGstRate",
  "printerSize"
)
values (
  'global',
  'Bubbleworks Laundry',
  'Configure business address',
  '0000000000',
  '',
  18.00,
  'MM_80'
)
on conflict ("id") do update set
  "businessName" = excluded."businessName",
  "address" = excluded."address",
  "mobile" = excluded."mobile",
  "gstNumber" = excluded."gstNumber",
  "defaultGstRate" = excluded."defaultGstRate",
  "printerSize" = excluded."printerSize";

insert into public."Service" ("name", "description", "pricingType", "defaultRate", "gstRate", "status")
values
  ('Wash & Fold', 'Bulk laundry priced per kilogram', 'PER_KG', 80.00, 18.00, 'ACTIVE'),
  ('Ironing', 'Pressing priced per item', 'PER_PIECE', 15.00, 18.00, 'ACTIVE'),
  ('Dry Cleaning', 'Dry cleaning priced per item', 'PER_PIECE', 120.00, 18.00, 'ACTIVE'),
  ('Blanket Cleaning', 'Blanket cleaning priced per item', 'PER_PIECE', 250.00, 18.00, 'ACTIVE'),
  ('Curtain Cleaning', 'Curtain cleaning priced per kilogram', 'PER_KG', 100.00, 18.00, 'ACTIVE'),
  ('Shoe Cleaning', 'Shoe cleaning priced per pair/item', 'PER_PIECE', 180.00, 18.00, 'ACTIVE'),
  ('Carpet Cleaning', 'Carpet cleaning priced per kilogram', 'PER_KG', 140.00, 18.00, 'ACTIVE')
on conflict ("name") do update set
  "description" = excluded."description",
  "pricingType" = excluded."pricingType",
  "defaultRate" = excluded."defaultRate",
  "gstRate" = excluded."gstRate",
  "status" = excluded."status";
