-- ============================================================
-- 024 — Corrige o trigger de notificações da captação, que deixou
-- de criar notificações em produção (confirmado: submissions a
-- entrar normalmente via realtime, mas public.notificacoes
-- continuava vazia mesmo depois de refresh).
--
-- Causa provável: a função 022 decidia "é a Nádia autenticada ou o
-- público anon?" lendo à mão os GUCs do PostgREST
--   current_setting('request.jwt.claim.role', true)
--   current_setting('request.jwt.claims', true)::jsonb ->> 'role'
-- — um mecanismo que o Supabase pode deixar de expor exactamente
-- assim consoante a versão do PostgREST por baixo, e que falhava em
-- SILÊNCIO: o trigger engole qualquer exceção de propósito, para
-- nunca partir uma captação por causa de uma notificação.
--
-- Correção:
--   1) usa auth.role() — a função ESTÁVEL do Supabase para isto,
--      mantida por eles, em vez de uma cópia à mão que pode
--      desincronizar da plataforma;
--   2) troca o "engolir em silêncio" por um `raise warning` — a
--      captação continua imune a falhar, mas agora fica um rasto em
--      Supabase → Logs → Postgres se voltar a acontecer, em vez de
--      desaparecer sem pista nenhuma.
--
-- Aditiva e idempotente: só substitui a função (create or replace);
-- o trigger em si (022) mantém-se.
-- ============================================================

create or replace function public.dlm_notificar_captacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    if coalesce(new.fase, '') <> 'interessado' then
      return new;
    end if;

    -- authenticated (a Nádia a transcrever uma conversa) não se
    -- auto-notifica; tudo o resto (anon = o site público, ou sem
    -- sessão nenhuma — SQL directo/testes) notifica.
    if auth.role() = 'authenticated' then
      return new;
    end if;

    insert into public.notificacoes
      (tipo, titulo, submission_id, cliente_id, event_type_id, dados)
    values (
      'captacao',
      coalesce(
        new.respostas ->> 'nomeDoCliente',
        new.respostas ->> 'nomeResponsavel',
        'Novo interessado'),
      new.id,
      new.cliente_id,
      new.event_type_id,
      jsonb_build_object(
        'respostas', coalesce(new.respostas, '{}'::jsonb),
        'data_evento', new.data_evento,
        'numero_convidados', new.numero_convidados));
  exception when others then
    raise warning 'dlm_notificar_captacao falhou para submission %: % (sqlstate %)',
      new.id, sqlerrm, sqlstate;
  end;
  return new;
end
$$;
