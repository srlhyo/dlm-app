import { supabase } from "./supabase";

// ============================================================
// tipoEvento.js — classificação do tipo de evento "Outro".
//
// A captação guarda o texto livre em respostas.tipoEventoOutro
// (evento sem event_type_id). Este módulo dá:
//   • o FALLBACK de exibição (getNomeTipoEvento) — o nome do modelo,
//     senão o texto do cliente — para o calendário, funil, listas e
//     drawer nunca mostrarem um evento "sem tipo";
//   • a VINCULAÇÃO posterior a um Modelo de Evento: associar a um
//     existente, ou criar um novo com um clique (com dedup por
//     normalização — nunca cria duplicados de grafia).
//
// Regras: texto livre NUNCA cria modelo automaticamente; após o
// vínculo o evento é um evento normal (event_type_id preenchido);
// o tipoEventoOutro fica nas respostas como histórico.
// ============================================================

const limpar = (v) => {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
};

// Normalização para comparação: minúsculas, sem acentos, espaços
// colapsados — "Baptizado" ≡ "batizado " ≡ "BATIZADO".
export const normalizarNome = (s) =>
  (s || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// O texto que o cliente escreveu no "Outro" (ou null).
export const getTipoEventoLivre = (submission) =>
  limpar(submission?.respostas?.tipoEventoOutro);

// O nome do tipo para exibição: modelo → texto livre → null.
export const getNomeTipoEvento = (submission, eventTypes) => {
  const t = (eventTypes || []).find(
    (et) => et.id === submission?.event_type_id,
  );
  if (t?.nome) return t.nome;
  return getTipoEventoLivre(submission);
};

// Este evento precisa de classificação? (sem modelo mas com texto)
export const precisaClassificacao = (submission) =>
  !submission?.event_type_id && !!getTipoEventoLivre(submission);

// Procura um modelo existente com o mesmo nome normalizado (dedup).
export const encontrarModeloPorNome = (nome, eventTypes) => {
  const alvo = normalizarNome(nome);
  if (!alvo) return null;
  return (
    (eventTypes || []).find((et) => normalizarNome(et.nome) === alvo) || null
  );
};

// Liga um evento a um modelo — depois disto, o evento comporta-se
// exactamente como um nascido com esse modelo.
export const associarModeloAoEvento = async (submissionId, eventTypeId) => {
  if (!submissionId || !eventTypeId)
    throw new Error("Evento ou modelo em falta.");
  const { data, error } = await supabase
    .from("submissions")
    .update({ event_type_id: eventTypeId })
    .eq("id", submissionId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Cria um modelo com o nome indicado (0 passos — a Nádia completa em
// Modelos de Evento quando quiser) e liga o evento. Dedup defensivo:
// se já existir um modelo com esse nome (normalizado), associa a esse
// em vez de criar.
export const criarModeloEAssociar = async (
  nomeModelo,
  submissionId,
  eventTypes = [],
) => {
  const nome = limpar(nomeModelo);
  if (!nome) throw new Error("Nome do modelo em falta.");

  const existente = encontrarModeloPorNome(nome, eventTypes);
  if (existente) {
    const submission = await associarModeloAoEvento(
      submissionId,
      existente.id,
    );
    return { modelo: existente, submission, jaExistia: true };
  }

  const { data: modelo, error } = await supabase
    .from("event_types")
    .insert({ nome, steps: [] })
    .select()
    .single();
  if (error) throw error;

  const submission = await associarModeloAoEvento(submissionId, modelo.id);
  return { modelo, submission, jaExistia: false };
};