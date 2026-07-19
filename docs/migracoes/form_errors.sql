-- ============================================================
-- form_errors — registo de erros dos formulários públicos.
-- Correr uma vez no SQL Editor do Supabase (Dashboard → SQL Editor).
--
-- Quando uma submissão falha no browser de um cliente, o formulário
-- grava aqui o erro real + o que o cliente tinha preenchido. O painel
-- de Início do admin mostra estes erros; também podem ser consultados
-- no Table Editor do Supabase.
-- ============================================================

create table if not exists public.form_errors (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  origem text,        -- "onboarding" | "captacao" | ...
  mensagem text,      -- mensagem curta do erro
  detalhe jsonb,      -- erro completo (code, details, hint do PostgREST)
  contexto jsonb,     -- convite, event_type, passo, url, user agent
  respostas jsonb     -- o formData no momento da falha (recuperação!)
);

alter table public.form_errors enable row level security;

-- O site público (papel anon) precisa de INSERIR erros; o admin usa a
-- mesma chave anon, por isso leitura e limpeza também ficam abertas —
-- alinhado com as restantes tabelas do projeto.
drop policy if exists "inserir erros" on public.form_errors;
create policy "inserir erros" on public.form_errors
  for insert to anon, authenticated with check (true);

drop policy if exists "ler erros" on public.form_errors;
create policy "ler erros" on public.form_errors
  for select to anon, authenticated using (true);

drop policy if exists "apagar erros" on public.form_errors;
create policy "apagar erros" on public.form_errors
  for delete to anon, authenticated using (true);

-- Grants explícitos (o Supabase costuma dá-los por default privileges,
-- mas explícito é garantido). O RLS acima é quem manda na prática.
grant select, insert, delete on public.form_errors to anon, authenticated;
