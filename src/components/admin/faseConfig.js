// ============================================================
// faseConfig — as fases do funil comercial num sítio só, partilhadas
// entre a lista de clientes (pastilhas) e o funil (colunas + avanço).
//
// As fases espelham a CHECK constraint da coluna `fase` (migração 009):
//   interessado → orcamento → contrato → cliente   (+ perdido = saída)
// O sinal de 50% é o gatilho real de contrato → cliente.
// ============================================================

export const FASE_LABEL = {
  interessado: "Interessado",
  orcamento: "Orçamento",
  contrato: "Contrato",
  cliente: "Cliente",
  perdido: "Perdido",
};

export const FASE_COR = {
  interessado: { bg: "#FEF3E2", cor: "#B45309" },
  orcamento: { bg: "#FEF9C3", cor: "#854D0E" },
  contrato: { bg: "#E0E7FF", cor: "#3730A3" },
  cliente: { bg: "#DCFCE7", cor: "#166534" },
  perdido: { bg: "#F3F4F6", cor: "#6B7280" },
};

// As colunas do funil, pela ordem do negócio (perdido é saída, não coluna
// — só aparece quando a Nádia liga "Ver perdidos").
export const FASES_BOARD = ["interessado", "orcamento", "contrato", "cliente"];

// Para onde avança cada fase (cliente é o fim; perdido recupera-se
// para interessado via ação própria).
export const PROXIMA_FASE = {
  interessado: "orcamento",
  orcamento: "contrato",
  contrato: "cliente",
};
