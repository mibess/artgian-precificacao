-- =========================================================
-- ESQUEMA DO BANCO DE DADOS SUPABASE: ARTGIAN STUDIO PRECIFICAÇÃO 3D
-- =========================================================

-- 1. TABELA DE PRODUTOS
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
  accessories_cost numeric default 0,
  variable_cost_percent numeric default 10,
  notes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. TABELA DE FILAMENTOS
create table if not exists public.filaments (
  id text primary key,
  name text not null,
  brand text default 'Padrão',
  material text default 'PLA',
  price_per_kg numeric not null default 105.00,
  color_name text default '',
  color_hex text default '#ffffff',
  created_at timestamptz default now()
);

-- 3. TABELA DE IMPRESSORAS
create table if not exists public.printers (
  id text primary key,
  name text not null,
  power_watts numeric not null default 110,
  notes text default '',
  created_at timestamptz default now()
);

-- 4. TABELA DE CONFIGURAÇÕES GLOBAIS
create table if not exists public.settings (
  id text primary key default 'default',
  energy_kwh_price numeric not null default 1.02,
  default_filament_price_per_kg numeric not null default 105.00,
  default_printer_watts numeric not null default 110,
  default_variable_cost_percent numeric not null default 10,
  marketplaces jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- 5. TABELA DE EMBALAGENS
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

-- 6. TABELA DE PERSONALIZADOS GRAVADOS
create table if not exists public.packaging_addons (
  id text primary key,
  name text not null,
  price numeric not null default 0,
  description text default '',
  enabled_by_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- HABILITAR ROW LEVEL SECURITY (RLS)
alter table public.products enable row level security;
alter table public.filaments enable row level security;
alter table public.printers enable row level security;
alter table public.settings enable row level security;
alter table public.packagings enable row level security;
alter table public.packaging_addons enable row level security;

-- POLÍTICAS DE ACESSO (Leitura e Gravação para chave anon / aplicação)
create policy "Acesso público leitura produtos" on public.products for select using (true);
create policy "Acesso público inserção produtos" on public.products for insert with check (true);
create policy "Acesso público atualização produtos" on public.products for update using (true);
create policy "Acesso público exclusão produtos" on public.products for delete using (true);

create policy "Acesso público leitura filamentos" on public.filaments for select using (true);
create policy "Acesso público inserção filamentos" on public.filaments for insert with check (true);
create policy "Acesso público atualização filamentos" on public.filaments for update using (true);
create policy "Acesso público exclusão filamentos" on public.filaments for delete using (true);

create policy "Acesso público leitura impressoras" on public.printers for select using (true);
create policy "Acesso público inserção impressoras" on public.printers for insert with check (true);
create policy "Acesso público atualização impressoras" on public.printers for update using (true);
create policy "Acesso público exclusão impressoras" on public.printers for delete using (true);

create policy "Acesso público leitura configurações" on public.settings for select using (true);
create policy "Acesso público inserção configurações" on public.settings for insert with check (true);
create policy "Acesso público atualização configurações" on public.settings for update using (true);
create policy "Acesso público exclusão configurações" on public.settings for delete using (true);

create policy "Acesso público leitura embalagens" on public.packagings for select using (true);
create policy "Acesso público inserção embalagens" on public.packagings for insert with check (true);
create policy "Acesso público atualização embalagens" on public.packagings for update using (true);
create policy "Acesso público exclusão embalagens" on public.packagings for delete using (true);

create policy "Acesso público leitura packaging_addons" on public.packaging_addons for select using (true);
create policy "Acesso público inserção packaging_addons" on public.packaging_addons for insert with check (true);
create policy "Acesso público atualização packaging_addons" on public.packaging_addons for update using (true);
create policy "Acesso público exclusão packaging_addons" on public.packaging_addons for delete using (true);

-- POVOAMENTO COM OS DADOS INICIAIS DA OFICINA
insert into public.filaments (id, name, brand, material, price_per_kg, color_hex) values
  ('fil-1', 'PLA Branco', 'Padrão', 'PLA', 105.00, '#ffffff'),
  ('fil-2', 'PLA Preto', 'Padrão', 'PLA', 105.00, '#111827'),
  ('fil-3', 'PLA Vermelho', 'Padrão', 'PLA', 105.00, '#ef4444'),
  ('fil-4', 'PLA Silk Ouro', 'Premium', 'Silk', 135.00, '#eab308'),
  ('fil-5', 'PETG Preto', 'Padrão', 'PETG', 115.00, '#374151')
on conflict (id) do nothing;

insert into public.printers (id, name, power_watts, notes) values
  ('prn-a1', 'Bambu Lab A1 (Padrão)', 110, 'Mesa 256x256mm - Média de operação ~110W'),
  ('prn-a1-mini', 'Bambu Lab A1 Mini', 85, 'Mesa 180x180mm - Média ~85W'),
  ('prn-p1s', 'Bambu Lab P1S / X1C', 100, 'Câmara fechada - Média ~100W'),
  ('prn-default-95', 'Impressora Genérica (95W)', 95, 'Potência da planilha de referência'),
  ('prn-ender3', 'Creality Ender 3 V3', 120, 'Média nominal ~120W'),
  ('prn-k1', 'Creality K1 / K1C', 150, 'Alta velocidade ~150W')
on conflict (id) do nothing;

insert into public.settings (id, energy_kwh_price, default_filament_price_per_kg, default_printer_watts, default_variable_cost_percent, marketplaces) values
  ('default', 1.02, 105.00, 110, 10, '[
    {"id": "shopee", "name": "Shopee", "commissionPercent": 20, "fixedFee": 4.00, "enabled": true, "colorBadge": "bg-orange-50 text-orange-700 border-orange-200"},
    {"id": "ml_classico", "name": "Mercado Livre (Clássico)", "commissionPercent": 14.0, "fixedFee": 6.00, "enabled": false, "colorBadge": "bg-yellow-50 text-yellow-800 border-yellow-200"},
    {"id": "ml_premium", "name": "Mercado Livre (Premium)", "commissionPercent": 19.0, "fixedFee": 6.00, "enabled": false, "colorBadge": "bg-amber-50 text-amber-800 border-amber-200"}
  ]'::jsonb)
on conflict (id) do nothing;

insert into public.products (id, name, category, quantity_in_batch, is_multi_part, parts, packaging_cost, accessories_cost, variable_cost_percent, notes) values
  ('prod-rena-branca', 'Rena Branca de Natal', 'Natal', 1, false, '[{"id": "part-rena", "name": "Rena Branca de Natal", "filamentGrams": 76, "printTimeString": "5h40min", "printTimeHours": 5.66667, "printerWattsOverride": 95}]'::jsonb, 3.50, 0, 10, 'Peça decorativa natalina em PLA Branco'),
  ('prod-chaveiros-labas', '16 Chaveiros Labas', 'Chaveiros', 16, false, '[{"id": "part-chaveiro", "name": "16 unidades chaveiro", "filamentGrams": 108, "printTimeString": "7h15min", "printTimeHours": 7.25, "printerWattsOverride": 95}]'::jsonb, 3.00, 9.60, 10, 'Lote com 16 chaveiros. Acessórios: 16 argolas a R$ 0,60/un'),
  ('prod-urso-natal', 'Urso Natal Tricô (Multi-Partes)', 'Natal', 1, true, '[{"id": "part-urso-corpo", "name": "Corpo Urso", "filamentGrams": 12, "printTimeString": "2h15min", "printTimeHours": 2.25, "printerWattsOverride": 95}, {"id": "part-urso-cabeca", "name": "Cabeça e Gorro", "filamentGrams": 5, "printTimeString": "22min", "printTimeHours": 0.36667, "printerWattsOverride": 95}, {"id": "part-urso-acessorios", "name": "Cachecol e Detalhes", "filamentGrams": 1, "printTimeString": "1min", "printTimeHours": 0.01667, "printerWattsOverride": 95}]'::jsonb, 3.00, 0, 10, 'Enfeite de árvore de natal montável em 3 partes')
on conflict (id) do nothing;

insert into public.packaging_addons (id, name, price, description, enabled_by_default) values
  ('addon-cartao-agradecimento', 'Cartão de Agradecimento', 0.50, 'Enviado junto com cada pedido agradecendo a compra', true),
  ('addon-fita-cetim', 'Fita de Cetim', 0.35, 'Laço decorativo elegante para embalagens de presente', false),
  ('addon-tag-personalizada', 'Tag / Cartão De/Para', 0.25, 'Tag kraft ou adesiva com dedicatória', false)
on conflict (id) do nothing;

insert into public.packagings (id, name, width, height, length, box_price, bubble_wrap_price, sticker_price, tissue_paper_price, thank_you_card_price, other_price, other_description) values
  ('pkg-caixa-20x15x10', 'CAIXA PAPELAO 20X15X10', 15, 10, 20, 1.45, 0.70, 0.18, 0.11, 0.50, 0.00, ''),
  ('pkg-caixa-14x10x4', 'CAIXA PAPELAO 14X10X4', 10, 4, 14, 0.68, 0.70, 0.18, 0.11, 0.50, 0.00, ''),
  ('pkg-caixa-24x15x10', 'CAIXA PAPELAO 24X15X10', 15, 10, 24, 1.42, 0.70, 0.18, 0.11, 0.50, 0.00, ''),
  ('pkg-caixa-12x12x11', 'CAIXA DE PAPELAO 12X12X11', 12, 11, 12, 0.88, 0.70, 0.18, 0.11, 0.50, 0.00, ''),
  ('pkg-sacola-21x8x17', 'SACOLINHA AZUL KRAFT 21X8X17', 8, 17, 21, 2.50, 0.70, 0.18, 0.11, 0.50, 0.00, '')
on conflict (id) do nothing;
