-- ============================================================
-- 021 — Fechar o acesso anónimo às tabelas (FASE 2 do endurecimento).
--
-- ⚠️ SÓ CORRER DEPOIS DE:
--   1. a migração 020 (RPCs) ter corrido NESTA base de dados; e
--   2. o código novo (que usa os RPCs) estar publicado no site que
--      aponta a esta base de dados; e
--   3. os fluxos públicos terem sido verificados (scripts/verificar-rls.mjs).
--
-- O que faz:
--   • activa RLS em todas as tabelas da app;
--   • apaga TODAS as políticas existentes (o estado actual permite
--     tudo a toda a gente) e recria o mínimo:
--       - authenticated (a Nádia com login): acesso total;
--       - anon (o site público): SELECT em event_types (o formulário
--         de captação lista os tipos) e INSERT em form_errors (registo
--         de erros). Tudo o resto passa pelas funções SECURITY DEFINER
--         da migração 020.
--
-- O que NÃO faz (de propósito, para não partir nada):
--   • storage: o bucket "referencias" mantém upload público — o
--     formulário /interesse precisa dele. Rever à parte se quiseres.
--   • grants/roles: o RLS por si já nega; não mexemos em grants.
--
-- Reverter (emergência): para voltar ao estado aberto numa tabela,
--   create policy "aberto" on public.NOME for all to anon, authenticated
--     using (true) with check (true);
-- ============================================================

do $$
declare
  t text;
  tabelas constant text[] := array[
    'clientes',
    'submissions',
    'invites',
    'reservas',
    'event_types',
    'materiais',
    'evento_materiais',
    'mensagens_tipo',
    'documentos',
    'form_errors',
    'app_config'
  ];
  pol record;
begin
  foreach t in array tabelas loop
    if to_regclass('public.' || t) is null then
      raise notice 'tabela % não existe nesta BD — ignorada', t;
      continue;
    end if;

    execute format('alter table public.%I enable row level security', t);

    for pol in
      select policyname
        from pg_policies
       where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on public.%I', pol.policyname, t);
    end loop;

    execute format(
      'create policy "admin acesso total" on public.%I
         for all to authenticated using (true) with check (true)', t);
  end loop;

  -- Excepções mínimas para o público:
  if to_regclass('public.event_types') is not null then
    create policy "publico le tipos de evento" on public.event_types
      for select to anon using (true);
  end if;

  if to_regclass('public.form_errors') is not null then
    create policy "publico regista erros" on public.form_errors
      for insert to anon with check (true);
  end if;
end $$;
