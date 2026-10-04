-- ==============================================================================
-- SETUP COMPLETO DE PRODUÇÃO (Artgian Studio - Precificação 3D)
-- Data: 2026-10-04
--
-- Execução: Painel Supabase > SQL Editor > Novo Script > Colar e clicar em RUN.
-- Link direto: https://supabase.com/dashboard/project/ynnhaduowfgjzsjgqoyk/sql/new
--
-- O QUE ESTE SCRIPT FAZ:
-- 1. Cria as tabelas de embalagens (packagings e packaging_addons) se não existirem.
-- 2. Adiciona as colunas de embalagem na tabela products (packaging_id, is_custom_packaging_cost).
-- 3. Adiciona a coluna owner_id em TODAS as 6 tabelas com chave estrangeira auth.users.
-- 4. Cria índices otimizados para consultas por owner_id.
-- 5. Detecta automaticamente o seu usuário autenticado em auth.users e vincula
--    100% dos seus dados existentes (33 produtos, configurações, impressoras, filamentos).
-- 6. Insere as 5 embalagens e os personalizados padrão caso a tabela esteja vazia.
-- 7. Habilita Row Level Security (RLS) e cria políticas seguras por usuário (owner_all).
-- ==============================================================================

-- 1. CRIAR TABELA DE EMBALAGENS (se não existir)
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

-- 2. CRIAR TABELA DE PERSONALIZADOS (se não existir)
create table if not exists public.packaging_addons (
  id text primary key,
  name text not null,
  price numeric not null default 0,
  description text default '',
  enabled_by_default boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. ADICIONAR COLUNAS DE EMBALAGEM EM PRODUCTS
alter table public.products add column if not exists packaging_id text;
alter table public.products add column if not exists is_custom_packaging_cost boolean default false;

-- 4. ADICIONAR COLUNA owner_id EM TODAS AS TABELAS
alter table public.products 
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.filaments 
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.printers 
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.settings 
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.packagings 
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

alter table public.packaging_addons 
  add column if not exists owner_id uuid references auth.users(id) on delete cascade;

-- Índices de performance
create index if not exists idx_products_owner_id on public.products(owner_id);
create index if not exists idx_filaments_owner_id on public.filaments(owner_id);
create index if not exists idx_printers_owner_id on public.printers(owner_id);
create index if not exists idx_settings_owner_id on public.settings(owner_id);
create index if not exists idx_packagings_owner_id on public.packagings(owner_id);
create index if not exists idx_packaging_addons_owner_id on public.packaging_addons(owner_id);

-- 5. VINCULAÇÃO AUTOMÁTICA DOS DADOS EXISTENTES AO PRIMEIRO USUÁRIO CRIADO
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Busca o primeiro usuário cadastrado no Supabase Auth
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'Vinculando dados legados ao usuário %', v_user_id;
    UPDATE public.products SET owner_id = v_user_id WHERE owner_id IS NULL;
    UPDATE public.filaments SET owner_id = v_user_id WHERE owner_id IS NULL;
    UPDATE public.printers SET owner_id = v_user_id WHERE owner_id IS NULL;
    UPDATE public.settings SET owner_id = v_user_id WHERE owner_id IS NULL;
    UPDATE public.packagings SET owner_id = v_user_id WHERE owner_id IS NULL;
    UPDATE public.packaging_addons SET owner_id = v_user_id WHERE owner_id IS NULL;
  ELSE
    RAISE NOTICE 'Nenhum usuário encontrado em auth.users. Os dados serão vinculados no primeiro login/cadastro.';
  END IF;
END $$;

-- 6. POVOAMENTO INICIAL DE EMBALAGENS (apenas se a tabela estiver vazia)
DO $$
DECLARE
  v_user_id uuid;
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM public.packagings;
  IF v_count = 0 THEN
    SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    INSERT INTO public.packagings (id, name, width, height, length, box_price, bubble_wrap_price, sticker_price, tissue_paper_price, thank_you_card_price, other_price, other_description, owner_id) VALUES
      ('pkg-caixa-20x15x10', 'CAIXA PAPELAO 20X15X10', 15, 10, 20, 1.45, 0.70, 0.18, 0.11, 0.50, 0.00, '', v_user_id),
      ('pkg-caixa-14x10x4', 'CAIXA PAPELAO 14X10X4', 10, 4, 14, 0.68, 0.70, 0.18, 0.11, 0.50, 0.00, '', v_user_id),
      ('pkg-caixa-24x15x10', 'CAIXA PAPELAO 24X15X10', 15, 10, 24, 1.42, 0.70, 0.18, 0.11, 0.50, 0.00, '', v_user_id),
      ('pkg-caixa-12x12x11', 'CAIXA DE PAPELAO 12X12X11', 12, 11, 12, 0.88, 0.70, 0.18, 0.11, 0.50, 0.00, '', v_user_id),
      ('pkg-sacola-21x8x17', 'SACOLINHA AZUL KRAFT 21X8X17', 8, 17, 21, 2.50, 0.70, 0.18, 0.11, 0.50, 0.00, '', v_user_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT count(*) INTO v_count FROM public.packaging_addons;
  IF v_count = 0 THEN
    SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    INSERT INTO public.packaging_addons (id, name, price, description, enabled_by_default, owner_id) VALUES
      ('addon-cartao-agradecimento', 'Cartão de Agradecimento', 0.50, 'Enviado junto com cada pedido agradecendo a compra', true, v_user_id),
      ('addon-fita-cetim', 'Fita de Cetim', 0.35, 'Laço decorativo elegante para embalagens de presente', false, v_user_id),
      ('addon-tag-personalizada', 'Tag / Cartão De/Para', 0.25, 'Tag kraft ou adesiva com dedicatória', false, v_user_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 7. REMOVER POLÍTICAS ANTIGAS INSEGURAS
drop policy if exists "Acesso público leitura produtos" on public.products;
drop policy if exists "Acesso público inserção produtos" on public.products;
drop policy if exists "Acesso público atualização produtos" on public.products;
drop policy if exists "Acesso público exclusão produtos" on public.products;
drop policy if exists "Usuário gerencia seus próprios produtos" on public.products;
drop policy if exists "owner_all" on public.products;

drop policy if exists "Acesso público leitura filamentos" on public.filaments;
drop policy if exists "Acesso público inserção filamentos" on public.filaments;
drop policy if exists "Acesso público atualização filamentos" on public.filaments;
drop policy if exists "Acesso público exclusão filamentos" on public.filaments;
drop policy if exists "Usuário gerencia seus próprios filamentos" on public.filaments;
drop policy if exists "owner_all" on public.filaments;

drop policy if exists "Acesso público leitura impressoras" on public.printers;
drop policy if exists "Acesso público inserção impressoras" on public.printers;
drop policy if exists "Acesso público atualização impressoras" on public.printers;
drop policy if exists "Acesso público exclusão impressoras" on public.printers;
drop policy if exists "Usuário gerencia suas próprias impressoras" on public.printers;
drop policy if exists "owner_all" on public.printers;

drop policy if exists "Acesso público leitura configurações" on public.settings;
drop policy if exists "Acesso público inserção configurações" on public.settings;
drop policy if exists "Acesso público atualização configurações" on public.settings;
drop policy if exists "Acesso público exclusão configurações" on public.settings;
drop policy if exists "Usuário gerencia suas próprias configurações" on public.settings;
drop policy if exists "owner_all" on public.settings;

drop policy if exists "Acesso público leitura embalagens" on public.packagings;
drop policy if exists "Acesso público inserção embalagens" on public.packagings;
drop policy if exists "Acesso público atualização embalagens" on public.packagings;
drop policy if exists "Acesso público exclusão embalagens" on public.packagings;
drop policy if exists "Usuário gerencia suas próprias embalagens" on public.packagings;
drop policy if exists "owner_all" on public.packagings;

drop policy if exists "Acesso público leitura packaging_addons" on public.packaging_addons;
drop policy if exists "Acesso público inserção packaging_addons" on public.packaging_addons;
drop policy if exists "Acesso público atualização packaging_addons" on public.packaging_addons;
drop policy if exists "Acesso público exclusão packaging_addons" on public.packaging_addons;
drop policy if exists "Usuário gerencia seus próprios personalizados" on public.packaging_addons;
drop policy if exists "owner_all" on public.packaging_addons;

-- 8. ATIVAR ROW LEVEL SECURITY (RLS)
alter table public.products enable row level security;
alter table public.filaments enable row level security;
alter table public.printers enable row level security;
alter table public.settings enable row level security;
alter table public.packagings enable row level security;
alter table public.packaging_addons enable row level security;

-- 9. CRIAR POLÍTICAS SEGURAS MULTIUSUÁRIO
create policy "owner_all" on public.products for all to authenticated
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());

create policy "owner_all" on public.filaments for all to authenticated
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());

create policy "owner_all" on public.printers for all to authenticated
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());

create policy "owner_all" on public.settings for all to authenticated
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());

create policy "owner_all" on public.packagings for all to authenticated
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());

create policy "owner_all" on public.packaging_addons for all to authenticated
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());
