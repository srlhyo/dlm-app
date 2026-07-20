// Testa as migrações 020 + 021 num Postgres real (PGlite/WASM), sem
// tocar em nenhuma BD verdadeira: esquema-réplica, execução das
// migrações, fluxos completos e verificação do RLS com o papel anon.
//
// Correr:
//   npm install --no-save @electric-sql/pglite
//   node scripts/testar-migracoes.mjs
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const base = fileURLToPath(new URL("../docs/migracoes/", import.meta.url));
const db = new PGlite();

let falhas = 0;
const ok = (cond, nome, extra = "") => {
  console.log(`${cond ? "✓" : "✗"} ${nome}${extra ? ` — ${extra}` : ""}`);
  if (!cond) falhas++;
};

// ---------- 1. Esquema-réplica (tipos confirmados por sondagem) ----------
await db.exec(`
create role anon nologin;
create role authenticated nologin;

create table clientes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text, contacto text, email text, nif text, morada text, notas text
);
create table event_types (
  id uuid primary key default gen_random_uuid(),
  nome text, steps jsonb, icone text, predefinido boolean
);
create table submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome_noivo text, nome_noiva text, contacto_principal text, email text,
  morada text, data_evento date, local_evento text, numero_convidados integer,
  hora_inicio time, hora_termino time, hora_montagem time,
  hora_limite_montagem time, hora_recolha time, recolha_dia_seguinte text,
  nome_responsavel text, contacto_responsavel text, relacao_responsavel text,
  estilo_evento text[], estilo_outro text, paleta_cores text[],
  paleta_observacoes text, mesa_noivos text[], cartoes_pratos text,
  observacoes_cartoes text, descricao_mesa_noivos text, cenario_palco text[],
  descricao_cenario text, medidas_espaco text, centros_mesa text[],
  tipo_flores text[], numero_mesas integer, formato_mesas text,
  lugares_por_mesa integer, observacoes_mesas text,
  texto_principal_placa text, texto_secundario_placa text,
  estilo_placa text[], notas_placa text, morada_exacta text,
  pessoa_abre_espaco text, contacto_pessoa_abre text, acesso_local text[],
  notas_acesso text, observacoes_gerais text,
  status text, event_type_id uuid, respostas jsonb,
  fase text, cliente_id uuid references clientes(id),
  valor_acordado numeric, pagamento_final boolean
);
create table reservas (
  id uuid primary key default gen_random_uuid(),
  estado text, submission_id uuid
);
create table invites (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  code text, status text, data_evento date, event_type_id uuid,
  respostas jsonb, reserva_id uuid, submission_alvo_id uuid,
  submission_id uuid
);
-- réplica do que o Supabase dá ao anon (grants; o RLS decide depois)
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
`);

// form_errors (migração própria)
await db.exec(readFileSync(base + "form_errors.sql", "utf8"));
ok(true, "form_errors.sql executou");

// ---------- 2. Migração 020 ----------
await db.exec(readFileSync(base + "020_rpcs_formularios_publicos.sql", "utf8"));
ok(true, "020 (RPCs) executou");

// ---------- 3. Seed ----------
const seed = await db.query(`
with et as (
  insert into event_types (nome, steps, icone)
  values ('Casamento', '[{"title":"Passo 1"}]'::jsonb, 'couple')
  returning id
), cli as (
  insert into clientes (nome, contacto) values ('Naduxa', '912222333')
  returning id
), alvo as (
  insert into submissions (cliente_id, fase, event_type_id, data_evento,
    numero_convidados, local_evento, respostas)
  select cli.id, 'sinal', et.id, '2026-09-23', 60, 'Estoril (coluna antiga)',
    '{"localEvento":"Estoril","mensagemInicial":"olá","imagensReferencia":["u1"]}'::jsonb
  from cli, et returning id
), res as (
  insert into reservas (estado) values ('Provisória') returning id
), inv as (
  insert into invites (code, status, event_type_id, submission_alvo_id, reserva_id, respostas)
  select 'DLM-TEST-0001', 'Pendente', et.id, alvo.id, res.id, '{}'::jsonb
  from et, alvo, res returning id
)
select (select id from et) as et, (select id from alvo) as alvo,
       (select id from res) as res, (select id from inv) as inv;
`);
const ids = seed.rows[0];

// ---------- 4. formulario_validar_convite ----------
{
  const r = await db.query(
    `select formulario_validar_convite('dlm-test-0001 ') as v`,
  );
  const v = r.rows[0].v;
  ok(v?.code === "DLM-TEST-0001", "validar_convite devolve o convite");
  ok(v?.event_types?.nome === "Casamento", "…com event_types embutido");
  ok(
    v?.alvo_dados?.respostas?.localEvento === "Estoril" &&
      v?.alvo_dados?.numero_convidados === 60,
    "…com alvo_dados para o pré-preenchimento",
  );
  const r2 = await db.query(
    `select formulario_validar_convite('DLM-NADA-0000') as v`,
  );
  ok(r2.rows[0].v === null, "código inexistente devolve null");
}

// ---------- 5. formulario_submeter (com alvo) ----------
{
  const payload = {
    event_type_id: ids.et,
    data_evento: "2026-09-24",
    numero_convidados: 80,
    respostas: {
      nomeNoivo: "João",
      nomeNoiva: "Maria",
      contactoPrincipal: "+447911123456",
      numeroConvidados: "80",
      horaInicio: "16:00",
      horaTermino: "",
      estiloEvento: ["Elegante", "Romântico"],
      numeroMesas: "12",
      lugaresporMesa: "abc",
      observacoesGerais: "Atenção aos dourados",
      localEvento: "Guia Lounge",
    },
  };
  const r = await db.query(
    `select formulario_submeter('DLM-TEST-0001', $1::jsonb) as v`,
    [JSON.stringify(payload)],
  );
  ok(r.rows[0].v?.id === ids.alvo, "submeter (alvo) devolve o id do evento");

  const s = (
    await db.query(`select * from submissions where id = $1`, [ids.alvo])
  ).rows[0];
  ok(
    s.respostas.mensagemInicial === "olá" &&
      s.respostas.imagensReferencia?.length === 1,
    "merge preserva o que já vivia nas respostas",
  );
  ok(s.respostas.nomeNoivo === "João", "respostas novas entraram");
  ok(s.nome_noivo === "João" && s.local_evento === "Guia Lounge",
    "colunas antigas (texto) escritas");
  ok(s.hora_inicio === "16:00:00", "hora válida gravada como time");
  ok(s.hora_termino === null, 'hora vazia ("") gravou null sem rebentar');
  ok(s.numero_mesas === 12, "número válido gravado como integer");
  ok(s.lugares_por_mesa === null, "número inválido ('abc') gravou null");
  ok(
    Array.isArray(s.estilo_evento) && s.estilo_evento.length === 2,
    "checkbox gravado como text[]",
  );
  ok(s.numero_convidados === 80, "numero_convidados actualizado");
  ok(s.fase === "sinal", "fase NÃO foi tocada");
  const dataIso =
    s.data_evento instanceof Date
      ? s.data_evento.toISOString()
      : String(s.data_evento);
  ok(dataIso.startsWith("2026-09-24"), "data_evento actualizada", dataIso);

  const inv = (
    await db.query(`select * from invites where id = $1`, [ids.inv])
  ).rows[0];
  ok(
    inv.status === "Preenchido" && inv.submission_id === ids.alvo,
    "convite marcado Preenchido na mesma transação",
  );
  const res = (
    await db.query(`select * from reservas where id = $1`, [ids.res])
  ).rows[0];
  ok(
    res.estado === "Convertida" && res.submission_id === ids.alvo,
    "reserva convertida na mesma transação",
  );

  // repetir → CONVITE_JA_USADO
  let msg = "";
  try {
    await db.query(`select formulario_submeter('DLM-TEST-0001', '{}'::jsonb)`);
  } catch (e) {
    msg = e.message;
  }
  ok(msg.includes("CONVITE_JA_USADO"), "resubmissão bloqueada (JA_USADO)");
  let msg2 = "";
  try {
    await db.query(`select formulario_submeter('DLM-NADA-0000', '{}'::jsonb)`);
  } catch (e) {
    msg2 = e.message;
  }
  ok(msg2.includes("CONVITE_INVALIDO"), "código inexistente (INVALIDO)");
}

// ---------- 6. formulario_submeter (sem alvo → cliente novo) ----------
{
  await db.query(
    `insert into invites (code, status, event_type_id, respostas)
     values ('DLM-TEST-0002', 'Pendente', $1, '{}'::jsonb)`,
    [ids.et],
  );
  const payload = {
    event_type_id: ids.et,
    data_evento: "2026-12-15",
    numero_convidados: 120,
    respostas: {
      nomeNoivo: "Rui",
      nomeNoiva: "Ana",
      contactoPrincipal: "913000111",
      email: "rui.ana@mail.com",
      morada: "Rua X",
    },
  };
  const r = await db.query(
    `select formulario_submeter('DLM-TEST-0002', $1::jsonb) as v`,
    [JSON.stringify(payload)],
  );
  const novoId = r.rows[0].v?.id;
  const s = (
    await db.query(
      `select s.*, c.nome as cliente_nome, c.email as cliente_email
         from submissions s join clientes c on c.id = s.cliente_id
        where s.id = $1`,
      [novoId],
    )
  ).rows[0];
  ok(s.cliente_nome === "Rui & Ana", "cliente criado com nome 'A & B'");
  ok(s.cliente_email === "rui.ana@mail.com", "…e email extraído");
  ok(s.fase === "cliente", "evento novo nasce na fase 'cliente'");
  ok(s.numero_convidados === 120, "colunas fixas do payload gravadas");
}

// ---------- 7. captacao_submeter ----------
{
  // sem captacao_dedupe na BD → o bloco de excepção deixa passar
  const r = await db.query(`select captacao_submeter($1::jsonb) as v`, [
    JSON.stringify({
      nome: "Interessada Teste",
      contacto: "914444555",
      whatsapp: "+447900111222",
      dataEvento: "2026-10-10",
      numeroConvidados: "25",
      eventTypeId: ids.et,
      respostas: { nomeDoCliente: "Interessada Teste", servicos: ["Buffet"] },
    }),
  ]);
  const v = r.rows[0].v;
  ok(!!v?.id && v?.fase === "interessado", "captação cria evento interessado");
  ok(v?.clienteReutilizado === undefined, "sem dedupe → cliente novo");

  let msg = "";
  try {
    await db.query(`select captacao_submeter('{}'::jsonb)`);
  } catch (e) {
    msg = e.message;
  }
  ok(msg.includes("NOME_OBRIGATORIO"), "sem nome → NOME_OBRIGATORIO");

  // com captacao_dedupe a devolver um cliente existente
  await db.exec(`
    create function captacao_dedupe(p_digitos text, p_data date)
    returns table(cliente_id uuid, evento_id uuid) language sql as
    $$ select id, null::uuid from clientes where contacto = p_digitos $$;
  `);
  const r2 = await db.query(`select captacao_submeter($1::jsonb) as v`, [
    JSON.stringify({
      nome: "Interessada Teste",
      contacto: "914444555",
      dataEvento: "2027-01-01",
      respostas: { nomeDoCliente: "Interessada Teste" },
    }),
  ]);
  ok(
    r2.rows[0].v?.clienteReutilizado === true,
    "dedupe reutiliza o cliente existente",
  );
}

// ---------- 8. formulario_briefing ----------
{
  const r = await db.query(`select formulario_briefing($1) as v`, [ids.alvo]);
  const v = r.rows[0].v;
  ok(
    v?.submission?.id === ids.alvo && v?.event_type?.nome === "Casamento",
    "briefing devolve submission + event_type",
  );
  const r2 = await db.query(
    `select formulario_briefing('00000000-0000-0000-0000-000000000000') as v`,
  );
  ok(r2.rows[0].v === null, "briefing de id inexistente devolve null");
}

// ---------- 9. Migração 021 + RLS com o papel anon ----------
await db.exec(readFileSync(base + "021_rls_bloquear_anon.sql", "utf8"));
ok(true, "021 (RLS) executou");

{
  const pols = (
    await db.query(
      `select tablename, count(*)::int as n from pg_policies
        where schemaname='public' group by tablename order by tablename`,
    )
  ).rows;
  ok(pols.length >= 6, "políticas criadas", JSON.stringify(pols));
}

await db.exec(`set role anon`);
{
  const cli = await db.query(`select id from clientes limit 1`);
  ok(cli.rows.length === 0, "anon NÃO lê clientes (RLS)");
  const sub = await db.query(`select id from submissions limit 1`);
  ok(sub.rows.length === 0, "anon NÃO lê submissions (RLS)");
  const inv = await db.query(`select id from invites limit 1`);
  ok(inv.rows.length === 0, "anon NÃO lê invites (RLS)");
  const et = await db.query(`select id from event_types limit 1`);
  ok(et.rows.length === 1, "anon LÊ event_types (o /interesse precisa)");

  let updBlocked = false;
  const upd = await db.query(
    `update submissions set fase='perdido' where id=$1 returning id`,
    [ids.alvo],
  );
  updBlocked = upd.rows.length === 0;
  ok(updBlocked, "anon NÃO altera submissions directamente");

  let insBlocked = false;
  try {
    await db.query(`insert into clientes (nome) values ('hacker')`);
  } catch {
    insBlocked = true;
  }
  ok(insBlocked, "anon NÃO insere clientes directamente");

  await db.query(
    `insert into form_errors (origem, mensagem) values ('teste', 'x')`,
  );
  ok(true, "anon regista erros em form_errors");

  // O ESSENCIAL: os RPCs continuam a funcionar como anon (security definer)
  const r = await db.query(
    `select formulario_validar_convite('DLM-TEST-0002') as v`,
  );
  ok(
    r.rows[0].v?.status === "Preenchido",
    "RPC validar_convite funciona como anon pós-RLS",
  );
  await db.query(
    `insert into invites (code, status, respostas) values ('X','x','{}')`,
  ).catch(() => {});
  const cap = await db.query(`select captacao_submeter($1::jsonb) as v`, [
    JSON.stringify({ nome: "Pós RLS", respostas: {} }),
  ]);
  ok(!!cap.rows[0].v?.id, "RPC captacao_submeter funciona como anon pós-RLS");
  const bri = await db.query(`select formulario_briefing($1) as v`, [ids.alvo]);
  ok(bri.rows[0].v?.submission?.id === ids.alvo, "RPC briefing funciona como anon pós-RLS");
}
await db.exec(`reset role`);

// authenticated mantém acesso total
await db.exec(`set role authenticated`);
{
  const cli = await db.query(`select id from clientes limit 1`);
  ok(cli.rows.length === 1, "authenticated (admin) continua a ler tudo");
  const upd = await db.query(
    `update submissions set fase='contrato' where id=$1 returning fase`,
    [ids.alvo],
  );
  ok(upd.rows[0]?.fase === "contrato", "authenticated continua a escrever");
}
await db.exec(`reset role`);

// ---------- 10. Migração 022 (notificações da captação) ----------
await db.exec(readFileSync(base + "022_notificacoes.sql", "utf8"));
ok(true, "022 (notificações) executou");

{
  // Pedido PÚBLICO (papel anon no JWT, como chega do PostgREST)
  await db.query(
    `select set_config('request.jwt.claims', '{"role":"anon"}', false)`,
  );
  await db.exec(`set role anon`);
  const cap = await db.query(`select captacao_submeter($1::jsonb) as v`, [
    JSON.stringify({
      nome: "Vanessa Interessada",
      contacto: "916666777",
      dataEvento: "2027-05-05",
      numeroConvidados: "40",
      eventTypeId: ids.et,
      respostas: {
        nomeDoCliente: "Vanessa Interessada",
        servicos: ["Mesa posta", "Balcão"],
        servicosBalcao: ["Cocktail & bar"],
        mensagemInicial: "Adoro o vosso trabalho!",
      },
    }),
  ]);
  const eventoId = cap.rows[0].v?.id;
  ok(!!eventoId, "captação pública continua a funcionar com o trigger");

  // anon NÃO lê as notificações (correio privado da casa)
  let anonBloqueado = false;
  try {
    const r = await db.query(`select id from notificacoes limit 1`);
    anonBloqueado = r.rows.length === 0;
  } catch {
    anonBloqueado = true;
  }
  ok(anonBloqueado, "anon NÃO lê notificações");
  await db.exec(`reset role`);

  const notifs = (
    await db.query(
      `select * from notificacoes where submission_id = $1`,
      [eventoId],
    )
  ).rows;
  ok(notifs.length === 1, "captação pública criou UMA notificação");
  const n = notifs[0];
  ok(n?.titulo === "Vanessa Interessada", "…com o nome no título");
  ok(
    n?.dados?.respostas?.servicos?.length === 2 &&
      n?.dados?.respostas?.mensagemInicial === "Adoro o vosso trabalho!",
    "…com o snapshot completo do pedido",
  );
  ok(n?.lida_em === null, "…por ler (badge conta-a)");

  // A própria Nádia a transcrever (papel authenticated) → sem notificação
  await db.query(
    `select set_config('request.jwt.claims', '{"role":"authenticated"}', false)`,
  );
  await db.exec(`set role authenticated`);
  const capInterna = await db.query(
    `select captacao_submeter($1::jsonb) as v`,
    [
      JSON.stringify({
        nome: "Transcrita Pela Nadia",
        respostas: { nomeDoCliente: "Transcrita Pela Nadia" },
      }),
    ],
  );
  ok(!!capInterna.rows[0].v?.id, "captação interna continua a funcionar");

  // authenticated lê e marca como lida
  const lida = await db.query(
    `update notificacoes set lida_em = now() where id = $1 returning lida_em`,
    [n.id],
  );
  ok(!!lida.rows[0]?.lida_em, "authenticated marca notificações como lidas");
  await db.exec(`reset role`);
  await db.query(`select set_config('request.jwt.claims', '', false)`);

  const total = (
    await db.query(
      `select count(*)::int as n from notificacoes
        where titulo = 'Transcrita Pela Nadia'`,
    )
  ).rows[0].n;
  ok(total === 0, "transcrição interna NÃO se auto-notifica");

  // A rede de segurança: sem a tabela, a captação NÃO pode falhar
  await db.exec(`drop table notificacoes cascade`);
  const capSemTabela = await db.query(
    `select captacao_submeter($1::jsonb) as v`,
    [JSON.stringify({ nome: "Sem Tabela", respostas: {} })],
  );
  ok(
    !!capSemTabela.rows[0].v?.id,
    "trigger engole erros — captação sobrevive sem a tabela",
  );
}

console.log(
  falhas === 0
    ? "\nTUDO VERDE — migrações validadas de ponta a ponta."
    : `\n${falhas} FALHAS — rever antes de correr nas BDs reais.`,
);
process.exit(falhas === 0 ? 0 : 1);
