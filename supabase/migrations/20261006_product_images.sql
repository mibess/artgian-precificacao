-- =========================================================
-- MIGRATION: IMAGENS DE PRODUTO (até 3 por produto, hospedadas no S3)
-- Data: 2026-10-06
--
-- Execute no SQL Editor do Supabase (produção e desenvolvimento). É idempotente.
-- Guarda apenas as chaves dos objetos no S3: [{ "key": "products/<user>/<produto>/<arquivo>.webp" }]
-- O app continua funcionando sem ela, apenas sem persistir as imagens.
-- =========================================================

alter table public.products add column if not exists images jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_images_max_3') then
    alter table public.products
      add constraint products_images_max_3
      check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) <= 3);
  end if;
end $$;

notify pgrst, 'reload schema';
