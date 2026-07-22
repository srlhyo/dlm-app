-- ============================================================
-- 023 — Junta "submissions" e "invites" à publicação de Realtime.
--
-- O AdminPage já subscreve postgres_changes (INSERT em submissions,
-- UPDATE em invites) desde sempre, mas essas mudanças só chegavam
-- via WAL se a tabela estiver na publicação "supabase_realtime" — e
-- só "notificacoes" (migração 022) lá tinha sido adicionada. Sem
-- isto, um interessado novo (via /interesse) só aparecia depois de
-- um refresh manual à página, porque o evento nunca era emitido.
--
-- Idempotente, como a 022: só corre a ALTER PUBLICATION se a
-- publicação existir e a tabela ainda não lá estiver.
-- ============================================================

do $$
declare
  t text;
  tabelas constant text[] := array['submissions', 'invites'];
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise notice 'publicação supabase_realtime não existe nesta BD — nada a fazer';
    return;
  end if;

  foreach t in array tabelas loop
    if to_regclass('public.' || t) is null then
      raise notice 'tabela % não existe nesta BD — ignorada', t;
      continue;
    end if;

    if not exists (
      select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = t)
    then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
