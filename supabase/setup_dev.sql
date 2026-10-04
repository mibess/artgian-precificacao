-- =========================================================
-- SETUP COMPLETO DO BANCO DE DESENVOLVIMENTO (Supabase)
-- Artgian Studio - Precificação 3D
--
-- Execute UMA vez no SQL Editor do projeto Supabase de DESENVOLVIMENTO.
-- Cria todas as tabelas já com multiusuário (owner_id) e RLS restrito.
-- Banco de desenvolvimento criado antes de 2026-10-05? Rode também
-- supabase/migrations/20261005_cost_fields.sql para adicionar as colunas novas.
-- Não insere dados de exemplo: o app usa padrões em memória e grava
-- no banco apenas quando você salvar.
-- =========================================================

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text default 'Geral',
  quantity_in_batch numeric default 1,
  is_multi_part boolean default false,
  parts jsonb not null default '[]'::jsonb,
  packaging_cost numeric default 0,
  packaging_id text,
  is_custom_packaging_cost boolean default false,
  packaging_mode text not null default 'perBatch' check (packaging_mode in ('perBatch', 'perUnit')),
  accessories_cost numeric default 0,
  labor_hours numeric not null default 0,
  variable_cost_percent numeric,
  notes text default '',
  owner_id uuid references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.filaments (
  id text primary key,
  name text not null,
  brand text default 'Padrão',
  material text default 'PLA',
  price_per_kg numeric not null default 105.00,
  color_name text default '',
  color_hex text default '#ffffff',
  owner_id uuid references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz default now()
);

create table if not exists public.printers (
  id text primary key,
  name text not null,
  power_watts numeric not null default 110,
  notes text default '',
  owner_id uuid references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz default now()
);

create table if not exists public.settings (
  id text primary key default 'default',
  energy_kwh_price numeric not null default 1.02,
  default_filament_price_per_kg numeric not null default 105.00,
  default_printer_watts numeric not null default 110,
  default_variable_cost_percent numeric not null default 10,
  machine_cost_per_hour numeric not null default 0,
  labor_cost_per_hour numeric not null default 0,
  variable_cost_applies_to_packaging boolean not null default true,
  marketplaces jsonb not null default '[]'::jsonb,
  owner_id uuid references auth.users(id) on delete cascade default auth.uid(),
  updated_at timestamptz default now()
);

create table if not exists public.packagings (
  id text primary key,
  name text not null,
  width numeric not null default 0,
  height numeric not null default 0,
  length numeric not null default 0,
  box_price numeric not null default 0,
  bubble_wrap_price numeric not null default 0,
  sticker_price numeric not null default 0,
  tissue_paper_price numeric not null default 0,
  thank_you_card_price numeric not null default 0.50,
  other_price numeric not null default 0,
  other_description text default '',
  custom_addon_ids text[] default '{}',
  custom_items jsonb default '[]'::jsonb,
  owner_id uuid references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.packaging_addons (
  id text primary key,
  name text not null,
  price numeric not null default 0,
  description text default '',
  enabled_by_default boolean default false,
  owner_id uuid references auth.users(id) on delete cascade default auth.uid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_products_owner_id on public.products(owner_id);
create index if not exists idx_filaments_owner_id on public.filaments(owner_id);
create index if not exists idx_printers_owner_id on public.printers(owner_id);
create index if not exists idx_settings_owner_id on public.settings(owner_id);
create index if not exists idx_packagings_owner_id on public.packagings(owner_id);
create index if not exists idx_packaging_addons_owner_id on public.packaging_addons(owner_id);

-- RLS: cada usuário autenticado enxerga e altera apenas os próprios dados
alter table public.products enable row level security;
alter table public.filaments enable row level security;
alter table public.printers enable row level security;
alter table public.settings enable row level security;
alter table public.packagings enable row level security;
alter table public.packaging_addons enable row level security;

create policy "owner_all" on public.products for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all" on public.filaments for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all" on public.printers for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all" on public.settings for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all" on public.packagings for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owner_all" on public.packaging_addons for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Dica: em Authentication > Providers > Email, desative "Confirm email"
-- no projeto de desenvolvimento para criar contas de teste sem confirmar e-mail.
