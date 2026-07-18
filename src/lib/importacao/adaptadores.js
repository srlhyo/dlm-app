// ============================================================
// importacao/adaptadores.js — fonte → estrutura bruta.
// v1: só JSON (colado ou de ficheiro). Fontes futuras (CSV, Excel,
// integrações) acrescentam-se AQUI, devolvendo a mesma estrutura
// bruta { versao, clientes: [...] } — o resto do pipeline
// (normalizar → validar → executar) não muda.
// ============================================================

import { VERSOES_SUPORTADAS } from "./schema";

// Devolve { bruto } em caso de sucesso, ou { erro } com mensagem
// legível para o ecrã.
export function adaptadorJSON(texto) {
  const t = (texto || "").trim();
  if (!t) return { erro: "Cola o JSON ou carrega um ficheiro primeiro." };

  let bruto;
  try {
    bruto = JSON.parse(t);
  } catch (e) {
    return {
      erro: `O texto não é JSON válido — ${e.message}. Confirma que o chat de IA devolveu SÓ o JSON, sem texto à volta nem \`\`\`.`,
    };
  }

  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) {
    return { erro: "O JSON tem de ser um objeto { versao, clientes: [...] }." };
  }
  if (!VERSOES_SUPORTADAS.includes(bruto.versao)) {
    return {
      erro: `Versão do schema ${
        bruto.versao === undefined ? "em falta" : `"${bruto.versao}"`
      } — este importador suporta a versão ${VERSOES_SUPORTADAS.join(", ")}.`,
    };
  }
  if (!Array.isArray(bruto.clientes) || bruto.clientes.length === 0) {
    return { erro: "O ficheiro não tem nenhum cliente em `clientes`." };
  }

  return { bruto };
}