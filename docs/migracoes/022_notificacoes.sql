-- ============================================================
-- 022 — Notificações da captação (a Caixa de Entrada da Nádia).
--
-- Quando o formulário de interesse PÚBLICO (/interesse) é submetido,
-- nasce uma notificação com o retrato completo do pedido (snapshot
-- das respostas) — a Nádia vê-a na app ao segundo, via realtime.
--
-- Como funciona:
--   • trigger AFTER INSERT em submissions: fase "interessado" → cria
--     a notificação. Corre como SECURITY DEFINER, por isso funciona
--     quer o insert venha do RPC captacao_submeter (020) quer do
--     caminho antigo (BD ainda aberta, pré-021).
--   • a ORIGEM decide se notifica: o pedido público chega com o papel
--     "anon" no JWT → notifica. Quando é a própria Nádia a transcrever
--     uma conversa ("+ Novo interessado", papel "authenticated"), NÃO
--     se auto-notifica. Sem JWT (SQL directo, testes) → notifica.
--   • o snapshot (dados jsonb) preserva o pedido tal como chegou,
--     mesmo que a ficha seja editada depois.
--   • uma notificação NUNCA pode falhar a captação: qualquer erro no
--     trigger é engolido (exception → continua).
--
-- Segurança: RLS ligado; só authenticated lê/escreve. O anon nem
-- SELECT tem — as notificações são o correio privado da casa.
--
-- Esta migração é ADITIVA e idempotente: pode correr em qualquer
-- altura, antes ou depois da 021, sem partir nada.
-- ============================================================

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tipo text not null default 'captacao',
  titulo text,
  submission_id uuid references public.submissions(id) on delete cascade,
  cliente_id uuid,
  event_type_id uuid,
  dados jsonb not null default '{}'::jsonb,
  lida_em timestamptz
);

comment on table public.notificacoes is
  'Caixa de Entrada do admin: uma linha por acontecimento (hoje, captações públicas), com snapshot do pedido em dados.';

-- Índice para o badge (contagem de não lidas) e para a lista ordenada.
create index if not exists notificacoes_nao_lidas_idx
  on public.notificacoes (created_at desc)
  where lida_em is null;

-- ---------- O trigger que faz nascer a notificação ----------
create or replace function public.dlm_notificar_captacao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  papel text;
begin
  begin
    if coalesce(new.fase, '') <> 'interessado' then
      return new;
    end if;

    -- Papel do pedido: "anon" (site público) notifica; "authenticated"
    -- (a Nádia a transcrever) não. Sem JWT → trata como público.
    papel := coalesce(
      nullif(current_setting('request.jwt.claim.role', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
      'anon');
    if papel = 'authenticated' then
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
    -- Nunca deixar uma notificação falhar a captação de um cliente.
    null;
  end;
  return new;
end
$$;

drop trigger if exists trg_notificar_captacao on public.submissions;
create trigger trg_notificar_captacao
  after insert on public.submissions
  for each row execute function public.dlm_notificar_captacao();

-- ---------- Segurança ----------
alter table public.notificacoes enable row level security;

drop policy if exists "admin acesso total" on public.notificacoes;
create policy "admin acesso total" on public.notificacoes
  for all to authenticated using (true) with check (true);

-- Grants explícitos (no Supabase os defaults já cobrem; em ambientes
-- de teste a tabela nasce depois do "grant all on all tables").
grant select, insert, update, delete on public.notificacoes to authenticated;

-- ---------- Realtime ----------
-- Junta a tabela à publicação do Supabase (se existir) para o badge
-- e o toast dispararem ao segundo, sem refresh.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'notificacoes')
  then
    alter publication supabase_realtime add table public.notificacoes;
  end if;
end $$;
