-- =========================================================
-- MIGRATION: ADICIONAR TABELAS DE EMBALAGENS E PERSONALIZADOS
-- E SUPORTE NO ARTGIAN STUDIO
-- =========================================================

-- 1. CRIAR TABELA DE EMBALAGENS (PACKAGINGS)
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
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Se a tabela já existia sem as novas colunas:
alter table public.packagings add column if not exists thank_you_card_price numeric not null default 0.50;
alter table public.packagings add column if not exists custom_addon_ids text[] default '{}';

-- 2. HABILITAR ROW LEVEL SECURITY (RLS) PARA PACKAGINGS
alter table public.packagings enable row level security;

-- 3. POLÍTICAS DE ACESSO PARA PACKAGINGS
create policy "Acesso público leitura embalagens" on public.packagings for select using (true);
create policy "Acesso público inserção embalagens" on public.packagings for insert with check (true);
create policy "Acesso público atualização embalagens" on public.packagings for update using (true);
create policy "Acesso público exclusão embalagens" on public.packagings for delete using (true);

-- 4. CRIAR TABELA DE PERSONALIZADOS GRAVADOS (PACKAGING_ADDONS)
create table if not exists public.packaging_addons (
  id text primary key,
  name text not null,
  price numeric not null default 0,
  description text default '',
  enabled_by_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS PARA PACKAGING_ADDONS
alter table public.packaging_addons enable row level security;

create policy "Acesso público leitura packaging_addons" on public.packaging_addons for select using (true);
create policy "Acesso público inserção packaging_addons" on public.packaging_addons for insert with check (true);
create policy "Acesso público atualização packaging_addons" on public.packaging_addons for update using (true);
create policy "Acesso público exclusão packaging_addons" on public.packaging_addons for delete using (true);

-- 5. ADICIONAR COLUNAS DE EMBALAGEM NA TABELA DE PRODUTOS
alter table public.products add column if not exists packaging_id text;
alter table public.products add column if not exists is_custom_packaging_cost boolean default false;

-- 6. POVOAMENTO INICIAL DE PERSONALIZADOS GRAVADOS
insert into public.packaging_addons (id, name, price, description, enabled_by_default) values
  ('addon-cartao-agradecimento', 'Cartão de Agradecimento', 0.50, 'Enviado junto com cada pedido agradecendo a compra', true),
  ('addon-fita-cetim', 'Fita de Cetim', 0.35, 'Laço decorativo elegante para embalagens de presente', false),
  ('addon-tag-personalizada', 'Tag / Cartão De/Para', 0.25, 'Tag kraft ou adesiva com dedicatória', false)
on conflict (id) do nothing;

-- 7. POVOAMENTO INICIAL COM AS 5 EMBALAGENS PADRÃO
insert into public.packagings (id, name, width, height, length, box_price, bubble_wrap_price, sticker_price, tissue_paper_price, thank_you_card_price, other_price, other_description) values
  ('pkg-caixa-20x15x10', 'CAIXA PAPELAO 20X15X10', 15, 10, 20, 1.45, 0.70, 0.18, 0.11, 0.50, 0.00, ''),
  ('pkg-caixa-14x10x4', 'CAIXA PAPELAO 14X10X4', 10, 4, 14, 0.68, 0.70, 0.18, 0.11, 0.50, 0.00, ''),
  ('pkg-caixa-24x15x10', 'CAIXA PAPELAO 24X15X10', 15, 10, 24, 1.42, 0.70, 0.18, 0.11, 0.50, 0.00, ''),
  ('pkg-caixa-12x12x11', 'CAIXA DE PAPELAO 12X12X11', 12, 11, 12, 0.88, 0.70, 0.18, 0.11, 0.50, 0.00, ''),
  ('pkg-sacola-21x8x17', 'SACOLINHA AZUL KRAFT 21X8X17', 8, 17, 21, 2.50, 0.70, 0.18, 0.11, 0.50, 0.00, '')
on conflict (id) do nothing;
