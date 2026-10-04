-- =========================================================
-- MIGRATION: CAMPOS DE CUSTO OPERACIONAL (máquina, mão de obra, embalagem por unidade)
-- Data: 2026-10-05
--
-- Execute no SQL Editor do Supabase (produção e desenvolvimento). É idempotente:
-- pode ser executada mais de uma vez sem efeito colateral.
--
-- Antes desta migration, os campos abaixo existiam na interface mas não eram gravados
-- no banco (eram perdidos ao recarregar a página). O app continua funcionando sem ela,
-- apenas sem persistir esses valores.
-- =========================================================

-- Configurações globais
alter table public.settings add column if not exists machine_cost_per_hour numeric not null default 0;
alter table public.settings add column if not exists labor_cost_per_hour numeric not null default 0;
alter table public.settings add column if not exists variable_cost_applies_to_packaging boolean not null default true;

-- Produtos
alter table public.products add column if not exists labor_hours numeric not null default 0;
alter table public.products add column if not exists packaging_mode text not null default 'perBatch';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_packaging_mode_check') then
    alter table public.products
      add constraint products_packaging_mode_check check (packaging_mode in ('perBatch', 'perUnit'));
  end if;
end $$;

-- Recarrega o cache de schema do PostgREST para as novas colunas ficarem visíveis à API
notify pgrst, 'reload schema';
