-- ============================================================
-- Venus Energy PMS — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Profiles ──────────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid references auth.users on delete cascade primary key,
  email         text unique not null,
  full_name     text,
  phone         text,
  designation   text,
  department    text,
  region        text,
  role          text not null default 'viewer'
                  check (role in ('super_admin','region_manager','project_manager','site_engineer','viewer')),
  is_active     boolean not null default true,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Policies: users can read their own profile; admins can read all
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Super admins can view all profiles"
  on public.profiles for select
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'));

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Super admins can update all profiles"
  on public.profiles for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'));

create policy "Service role can do anything"
  on public.profiles for all using (auth.role() = 'service_role');

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  )
  on conflict (id) do update set
    email      = excluded.email,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Role Permissions ──────────────────────────────────────
create table if not exists public.role_permissions (
  id          uuid default gen_random_uuid() primary key,
  role        text not null check (role in ('super_admin','region_manager','project_manager','site_engineer','viewer')),
  module      text not null,
  can_create  boolean not null default false,
  can_read    boolean not null default true,
  can_edit    boolean not null default false,
  can_delete  boolean not null default false,
  updated_at  timestamptz not null default now(),
  unique(role, module)
);

alter table public.role_permissions enable row level security;

create policy "Authenticated users can read permissions"
  on public.role_permissions for select using (auth.uid() is not null);

create policy "Super admins can manage permissions"
  on public.role_permissions for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin'));

create policy "Service role full access on permissions"
  on public.role_permissions for all using (auth.role() = 'service_role');

-- ── Vendors ───────────────────────────────────────────────
create table if not exists public.vendors (
  id              uuid default gen_random_uuid() primary key,
  name            text not null,
  contact_person  text,
  contact_no      text,
  email           text,
  gst_no          text,
  address         text,
  is_active       boolean not null default true,
  on_time_delivery integer not null default 0 check (on_time_delivery between 0 and 100),
  quality_score    integer not null default 0 check (quality_score between 0 and 100),
  safety_score     integer not null default 0 check (safety_score between 0 and 100),
  billing_score    integer not null default 0 check (billing_score between 0 and 100),
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

alter table public.vendors enable row level security;
create policy "Authenticated users can read vendors" on public.vendors for select using (auth.uid() is not null);
create policy "Authorized users can manage vendors" on public.vendors for all using (auth.uid() is not null);

-- ── Projects ──────────────────────────────────────────────
create table if not exists public.projects (
  id            uuid default gen_random_uuid() primary key,
  project_no    text unique not null,
  site_name     text not null,
  client        text,
  project_type  text,
  vendor_id     uuid references public.vendors(id),
  po_value      numeric(15,2) not null default 0,
  aging_days    integer not null default 0,
  status        text not null default 'pending'
                  check (status in ('pending','in_progress','completed','delayed')),
  progress      integer not null default 0 check (progress between 0 and 100),
  region        text,
  remarks       text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.projects enable row level security;
create policy "Authenticated users can read projects" on public.projects for select using (auth.uid() is not null);
create policy "Authorized users can manage projects" on public.projects for all using (auth.uid() is not null);

-- ── Invoices ──────────────────────────────────────────────
create table if not exists public.invoices (
  id              uuid default gen_random_uuid() primary key,
  invoice_no      text unique not null,
  project_id      uuid references public.projects(id),
  vendor_id       uuid references public.vendors(id),
  invoice_date    date not null default current_date,
  amount          numeric(15,2) not null default 0,
  gst_amount      numeric(15,2) not null default 0,
  total_amount    numeric(15,2) generated always as (amount + gst_amount) stored,
  status          text not null default 'draft'
                    check (status in ('draft','submitted','under_review','approved','rejected')),
  payment_status  text not null default 'pending'
                    check (payment_status in ('pending','partial','paid')),
  due_date        date,
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz not null default now()
);

alter table public.invoices enable row level security;
create policy "Authenticated users can read invoices" on public.invoices for select using (auth.uid() is not null);
create policy "Authorized users can manage invoices" on public.invoices for all using (auth.uid() is not null);

-- ============================================================
-- SEED DATA — Default Role Permissions
-- ============================================================
insert into public.role_permissions (role, module, can_create, can_read, can_edit, can_delete) values
-- region_manager
('region_manager','dashboard',         false, true, false, false),
('region_manager','projects',          true,  true, true,  false),
('region_manager','vendors',           true,  true, true,  false),
('region_manager','billing',           true,  true, true,  false),
('region_manager','attendance',        true,  true, true,  false),
('region_manager','safety_compliance', true,  true, true,  false),
('region_manager','srn_return',        true,  true, true,  false),
('region_manager','site_expenses',     true,  true, true,  false),
('region_manager','reports',           false, true, false, false),
-- project_manager
('project_manager','dashboard',         false, true, false, false),
('project_manager','projects',          true,  true, true,  false),
('project_manager','vendors',           false, true, false, false),
('project_manager','billing',           true,  true, false, false),
('project_manager','attendance',        true,  true, true,  false),
('project_manager','safety_compliance', true,  true, true,  false),
('project_manager','srn_return',        true,  true, false, false),
('project_manager','site_expenses',     true,  true, true,  false),
('project_manager','reports',           false, true, false, false),
-- site_engineer
('site_engineer','dashboard',         false, true, false, false),
('site_engineer','projects',          false, true, true,  false),
('site_engineer','vendors',           false, true, false, false),
('site_engineer','billing',           false, true, false, false),
('site_engineer','attendance',        true,  true, true,  false),
('site_engineer','safety_compliance', true,  true, true,  false),
('site_engineer','srn_return',        true,  true, false, false),
('site_engineer','site_expenses',     true,  true, false, false),
('site_engineer','reports',           false, true, false, false),
-- viewer
('viewer','dashboard',         false, true, false, false),
('viewer','projects',          false, true, false, false),
('viewer','vendors',           false, true, false, false),
('viewer','billing',           false, true, false, false),
('viewer','attendance',        false, true, false, false),
('viewer','safety_compliance', false, true, false, false),
('viewer','srn_return',        false, true, false, false),
('viewer','site_expenses',     false, true, false, false),
('viewer','reports',           false, true, false, false)
on conflict (role, module) do nothing;

-- Seed vendors
insert into public.vendors (name, contact_person, contact_no, email, is_active, on_time_delivery, quality_score, safety_score, billing_score)
values
('ABC Telecom Services',      'Rajesh Kumar',   '9876543210', 'rajesh@abctelecom.com',   true,  92, 90, 95, 98),
('XYZ Infra Solutions',       'Priya Sharma',   '9876543211', 'priya@xyzinfra.com',      true,  80, 85, 88, 90),
('TowerTech Pvt Ltd',         'Arun Singh',     '9876543212', 'arun@towertech.com',      true,  75, 82, 85, 88),
('NetConnect Services',       'Deepa Nair',     '9876543213', 'deepa@netconnect.com',    true,  65, 75, 78, 80),
('BuildRight Constructions',  'Vikram Patel',   '9876543214', 'vikram@buildright.com',   true,  50, 68, 72, 65),
('PowerSys India',            'Sunita Reddy',   '9876543215', 'sunita@powersys.com',     true,  85, 80, 90, 85)
on conflict do nothing;

-- ============================================================
-- HOW TO CREATE YOUR FIRST SUPER ADMIN
-- ============================================================
-- 1. Sign up via Supabase Auth (Dashboard → Authentication → Users → Invite)
-- 2. Then run this query (replace the email):
--
-- update public.profiles
-- set role = 'super_admin'
-- where email = 'your-admin@venusenergyindia.com';
--
-- ============================================================
