// ============================================================
// morada.js — o campo "Morada / Endereço" (tipo de campo estruturado
// dos Modelos de Evento), partido nas partes que compõem uma morada
// portuguesa: Rua, Número, Andar/Fracção, Código Postal, Localidade.
// O valor guardado em respostas[campoId] é sempre um OBJECTO com estas
// chaves — nunca uma string solta.
//
// País fica sempre "Portugal", fixo, sem campo — o negócio só opera
// em PT (o mesmo critério já usado em orcamentoConfig.js/EMPRESA).
//
// Usado por: FormField.jsx (formulário público), SubmissionDrawer.jsx
// (edição e leitura no admin), validation.js (campo obrigatório) e
// submissionFields.js (getResumoSubmissao → alimenta o painel de
// deslocação do orçamento).
// ============================================================

export const PARTES_MORADA = ["rua", "numero", "andar", "codigoPostal", "localidade"];

// Só Rua e Localidade são obrigatórias — nem toda a morada tem número
// (ex: quintas), e o código postal ajuda a precisão mas não é essencial
// para a Google conseguir geocodificar Rua + Localidade.
export const moradaValida = (m) =>
  !!(m && String(m.rua || "").trim() && String(m.localidade || "").trim());

export const moradaVazia = (m) =>
  !m || PARTES_MORADA.every((p) => !String(m[p] || "").trim());

// Compõe a morada numa única linha, pronta para o cálculo de
// deslocação (obterDistancia) ou para mostrar em qualquer lado —
// ex: "R. dos Moinhos 31, 2640-000 São João das Lampas, Portugal".
// Partes vazias são omitidas sem deixar vírgulas a mais.
export const formatarMorada = (m) => {
  if (!m || typeof m !== "object") return "";
  const rua = String(m.rua || "").trim();
  const numero = String(m.numero || "").trim();
  const andar = String(m.andar || "").trim();
  const codigoPostal = String(m.codigoPostal || "").trim();
  const localidade = String(m.localidade || "").trim();

  const linha1 = [[rua, numero].filter(Boolean).join(" "), andar]
    .filter(Boolean)
    .join(", ");
  const linha2 = [codigoPostal, localidade].filter(Boolean).join(" ");

  if (!linha1 && !linha2) return "";
  return [linha1, linha2, "Portugal"].filter((p) => p && p.trim()).join(", ");
};
