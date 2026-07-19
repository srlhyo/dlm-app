// ============================================================
// verificar-rls.mjs — verifica o estado do endurecimento RLS numa BD.
//
//   node scripts/verificar-rls.mjs            → usa o .env do projeto
//   node scripts/verificar-rls.mjs <url> <anon_key>  → outra BD (ex: produção)
//
// Faz APENAS leituras e chamadas RPC inofensivas (código de convite
// falso, uuid aleatório). Não escreve nada.
//
// Interpretação:
//   • Depois da migração 020: os 4 RPCs devem existir.
//   • Depois da migração 021: o acesso directo anon às tabelas deve
//     estar fechado (clientes/submissions/invites vazios ou negados),
//     event_types deve continuar legível.
// ============================================================

import { readFileSync } from "node:fs";

let url = process.argv[2];
let key = process.argv[3];

if (!url || !key) {
  const env = readFileSync(new URL("../.env", import.meta.url), "utf8");
  url = /VITE_SUPABASE_URL=(.+)/.exec(env)?.[1]?.trim();
  key = /VITE_SUPABASE_ANON_KEY=(.+)/.exec(env)?.[1]?.trim();
}
if (!url || !key) {
  console.error("Não encontrei VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
};

const chamar = async (caminho, opcoes = {}) => {
  const r = await fetch(`${url}${caminho}`, { headers, ...opcoes });
  let corpo = null;
  try {
    corpo = await r.json();
  } catch {
    /* respostas vazias */
  }
  return { status: r.status, corpo };
};

let falhas = 0;
const resultado = (ok, nome, extra = "") => {
  console.log(`${ok ? "✓" : "✗"} ${nome}${extra ? ` — ${extra}` : ""}`);
  if (!ok) falhas++;
};

console.log(`A verificar: ${url}\n`);

// ---------- 1. RPCs da migração 020 ----------
console.log("— RPCs (migração 020) —");
const rpcExiste = async (nome, body) => {
  const { status, corpo } = await chamar(`/rest/v1/rpc/${nome}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  // 404/PGRST202 = função em falta; qualquer outra resposta = existe
  const emFalta = status === 404 && corpo?.code === "PGRST202";
  return !emFalta;
};

resultado(
  await rpcExiste("formulario_validar_convite", { p_codigo: "DLM-XXXX-XXXX" }),
  "formulario_validar_convite existe",
);
resultado(
  await rpcExiste("formulario_briefing", {
    p_id: "00000000-0000-0000-0000-000000000000",
  }),
  "formulario_briefing existe",
);
// Para não escrever nada, testa-se com um código inválido: a função
// existe se responder com o erro de negócio CONVITE_INVALIDO.
{
  const { status, corpo } = await chamar("/rest/v1/rpc/formulario_submeter", {
    method: "POST",
    body: JSON.stringify({ p_codigo: "DLM-XXXX-XXXX", p_payload: {} }),
  });
  const emFalta = status === 404 && corpo?.code === "PGRST202";
  const negocioOk = (corpo?.message || "").includes("CONVITE_INVALIDO");
  resultado(
    !emFalta && negocioOk,
    "formulario_submeter existe e valida o convite",
    emFalta ? "função em falta" : negocioOk ? "" : `resposta: ${corpo?.message}`,
  );
}
// captacao_submeter sem nome deve responder NOME_OBRIGATORIO (não grava)
{
  const { status, corpo } = await chamar("/rest/v1/rpc/captacao_submeter", {
    method: "POST",
    body: JSON.stringify({ p_payload: {} }),
  });
  const emFalta = status === 404 && corpo?.code === "PGRST202";
  const negocioOk = (corpo?.message || "").includes("NOME_OBRIGATORIO");
  resultado(
    !emFalta && negocioOk,
    "captacao_submeter existe e valida o nome",
    emFalta ? "função em falta" : negocioOk ? "" : `resposta: ${corpo?.message}`,
  );
}

// ---------- 2. Acesso directo anon (deve fechar com a 021) ----------
console.log("\n— Acesso directo com a chave anon —");
const tabelaFechada = async (tabela) => {
  const { status, corpo } = await chamar(
    `/rest/v1/${tabela}?select=id&limit=1`,
  );
  // Fechada = 401/403, ou 200 com lista vazia (RLS filtra tudo)
  if (status !== 200) return true;
  return Array.isArray(corpo) && corpo.length === 0;
};

for (const t of ["clientes", "submissions", "invites", "reservas", "documentos"]) {
  const fechada = await tabelaFechada(t);
  resultado(
    fechada,
    `anon NÃO lê ${t}`,
    fechada ? "" : "ainda aberto (esperado antes da migração 021)",
  );
}

{
  const { status, corpo } = await chamar(
    "/rest/v1/event_types?select=id&limit=1",
  );
  resultado(
    status === 200 && Array.isArray(corpo) && corpo.length > 0,
    "anon lê event_types (o /interesse precisa)",
  );
}

console.log(
  falhas === 0
    ? "\nTudo verde. Esta BD está no estado final (020 + 021 + código novo)."
    : `\n${falhas} verificações falhadas — vê acima em que fase esta BD está.`,
);
process.exit(falhas === 0 ? 0 : 1);
