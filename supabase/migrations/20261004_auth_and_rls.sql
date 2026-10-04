-- =========================================================
-- MIGRATION: SEGURANÇA E SUPABASE AUTH MULTIUSUÁRIO (RLS)
-- Data: 2026-10-04
-- =========================================================

-- 1. ADICIONAR COLUNA owner_id EM TODAS AS TABELAS
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

-- Índices para performance nas consultas filtradas por owner_id
create index if not exists idx_products_owner_id on public.products(owner_id);
create index if not exists idx_filaments_owner_id on public.filaments(owner_id);
create index if not exists idx_printers_owner_id on public.printers(owner_id);
create index if not exists idx_settings_owner_id on public.settings(owner_id);
create index if not exists idx_packagings_owner_id on public.packagings(owner_id);
create index if not exists idx_packaging_addons_owner_id on public.packaging_addons(owner_id);

-- 2. REMOVER POLÍTICAS ANTIGAS INSEGURAS (USING TRUE)
drop policy if exists "Acesso público leitura produtos" on public.products;
drop policy if exists "Acesso público inserção produtos" on public.products;
drop policy if exists "Acesso público atualização produtos" on public.products;
drop policy if exists "Acesso público exclusão produtos" on public.products;

drop policy if exists "Acesso público leitura filamentos" on public.filaments;
drop policy if exists "Acesso público inserção filamentos" on public.filaments;
drop policy if exists "Acesso público atualização filamentos" on public.filaments;
drop policy if exists "Acesso público exclusão filamentos" on public.filaments;

drop policy if exists "Acesso público leitura impressoras" on public.printers;
drop policy if exists "Acesso público inserção impressoras" on public.printers;
drop policy if exists "Acesso público atualização impressoras" on public.printers;
drop policy if exists "Acesso público exclusão impressoras" on public.printers;

drop policy if exists "Acesso público leitura configurações" on public.settings;
drop policy if exists "Acesso público inserção configurações" on public.settings;
drop policy if exists "Acesso público atualização configurações" on public.settings;
drop policy if exists "Acesso público exclusão configurações" on public.settings;

drop policy if exists "Acesso público leitura embalagens" on public.packagings;
drop policy if exists "Acesso público inserção embalagens" on public.packagings;
drop policy if exists "Acesso público atualização embalagens" on public.packagings;
drop policy if exists "Acesso público exclusão embalagens" on public.packagings;

drop policy if exists "Acesso público leitura packaging_addons" on public.packaging_addons;
drop policy if exists "Acesso público inserção packaging_addons" on public.packaging_addons;
drop policy if exists "Acesso público atualização packaging_addons" on public.packaging_addons;
drop policy if exists "Acesso público exclusão packaging_addons" on public.packaging_addons;

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
alter table public.products enable row level security;
alter table public.filaments enable row level security;
alter table public.printers enable row level security;
alter table public.settings enable row level security;
alter table public.packagings enable row level security;
alter table public.packaging_addons enable row level security;

-- 4. CRIAR NOVAS POLÍTICAS RESTRITAS POR USUÁRIO AUTENTICADO (owner_id = auth.uid())

-- PRODUTOS
create policy "Usuário gerencia seus próprios produtos"
  on public.products
  for all
  to authenticated
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());

-- FILAMENTOS
create policy "Usuário gerencia seus próprios filamentos"
  on public.filaments
  for all
  to authenticated
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());

-- IMPRESSORAS
create policy "Usuário gerencia suas próprias impressoras"
  on public.printers
  for all
  to authenticated
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());

-- CONFIGURAÇÕES GLOBAIS
create policy "Usuário gerencia suas próprias configurações"
  on public.settings
  for all
  to authenticated
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());

-- EMBALAGENS
create policy "Usuário gerencia suas próprias embalagens"
  on public.packagings
  for all
  to authenticated
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());

-- PERSONALIZADOS
create policy "Usuário gerencia seus próprios personalizados"
  on public.packaging_addons
  for all
  to authenticated
  using (owner_id = auth.uid() or owner_id is null)
  with check (owner_id = auth.uid());

-- =========================================================
-- NOTA DE MIGRAÇÃO DE DADOS EXISTENTES:
-- Após criar seu usuário no Supabase Auth, você pode vincular
-- todos os dados existentes ao seu ID executando no SQL Editor:
--
-- DO $$
-- DECLARE
--   v_user_id uuid := 'SEU_USER_UUID_AQUI'; -- ex: '00000000-0000-0000-0000-000000000000'
-- BEGIN
--   UPDATE public.products SET owner_id = v_user_id WHERE owner_id IS NULL;
--   UPDATE public.filaments SET owner_id = v_user_id WHERE owner_id IS NULL;
--   UPDATE public.printers SET owner_id = v_user_id WHERE owner_id IS NULL;
--   UPDATE public.settings SET owner_id = v_user_id WHERE owner_id IS NULL;
--   UPDATE public.packagings SET owner_id = v_user_id WHERE owner_id IS NULL;
--   UPDATE public.packaging_addons SET owner_id = v_user_id WHERE owner_id IS NULL;
-- END $$;
-- =========================================================
