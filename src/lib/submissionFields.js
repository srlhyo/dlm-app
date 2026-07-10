// Mapa entre as colunas antigas (snake_case, escritas à medida do
// Casamento) e os IDs dos campos do formulário (camelCase).
const FIELD_MAP = {
  nome_noivo: "nomeNoivo",
  nome_noiva: "nomeNoiva",
  contacto_principal: "contactoPrincipal",
  email: "email",
  morada: "morada",
  local_evento: "localEvento",
  numero_convidados: "numeroConvidados",
  hora_inicio: "horaInicio",
  hora_termino: "horaTermino",
  hora_montagem: "horaMontagem",
  hora_limite_montagem: "horaLimiteMontagem",
  hora_recolha: "horaRecolha",
  recolha_dia_seguinte: "recolhaDiaSeguinte",
  nome_responsavel: "nomeResponsavel",
  contacto_responsavel: "contactoResponsavel",
  relacao_responsavel: "relacaoResponsavel",
  estilo_evento: "estiloEvento",
  estilo_outro: "estiloOutro",
  paleta_cores: "paletaCores",
  paleta_observacoes: "paletaObservacoes",
  mesa_noivos: "mesaNoivos",
  cartoes_pratos: "cartoesPratos",
  observacoes_cartoes: "observacoesCartoes",
  descricao_mesa_noivos: "descricaoMesaNoivos",
  cenario_palco: "cenarioPalco",
  descricao_cenario: "descricaoCenario",
  medidas_espaco: "medidasEspaco",
  centros_mesa: "centrosMesa",
  tipo_flores: "tipoFlores",
  numero_mesas: "numeroMesas",
  formato_mesas: "formatoMesas",
  lugares_por_mesa: "lugaresporMesa",
  observacoes_mesas: "observacoesMesas",
  texto_principal_placa: "textoPrincipalPlaca",
  texto_secundario_placa: "textoSecundarioPlaca",
  estilo_placa: "estiloPlaca",
  notas_placa: "notasPlaca",
  morada_exacta: "moradaExacta",
  pessoa_abre_espaco: "pessoaAbreEspaco",
  contacto_pessoa_abre: "contactoPessoaAbre",
  notas_acesso: "notasAcesso",
  observacoes_gerais: "observacoesGerais",
  acesso_local: "acessoLocal",
};

// Exportado para quem precisa de gravar nas duas fontes (respostas +
// colunas antigas): o SubmissionDrawer (edição) e o
// atualizarEventoComQuestionario (formulário apontado a um evento).
export const FIELD_MAP_INVERSO = Object.fromEntries(
  Object.entries(FIELD_MAP).map(([coluna, campo]) => [campo, coluna]),
);

export function getValorAtual(submissao, campoId) {
  if (!submissao) return undefined;
  const colunaAntiga = FIELD_MAP_INVERSO[campoId];
  if (
    colunaAntiga &&
    submissao[colunaAntiga] !== null &&
    submissao[colunaAntiga] !== undefined &&
    submissao[colunaAntiga] !== ""
  ) {
    return submissao[colunaAntiga];
  }
  return submissao.respostas?.[campoId];
}

export function normalizeSubmission(s) {
  if (!s || !s.respostas) return s;
  const normalized = { ...s };
  for (const [colKey, campoKey] of Object.entries(FIELD_MAP)) {
    if (
      (normalized[colKey] === null || normalized[colKey] === undefined) &&
      s.respostas[campoKey] !== undefined
    ) {
      normalized[colKey] = s.respostas[campoKey];
    }
  }
  return normalized;
}

// ============================================================
// getResumoSubmissao — título, data e LOCAL de QUALQUER submissão,
// independentemente do modelo de evento.
//
// Prioridade de leitura, em três camadas (da mais fiável para o
// último recurso):
//   1. Colunas fixas (Casamento / submissões editadas à mão)
//   2. PAPÉIS marcados no modelo (papel: "titulo" | "local" | "data")
//   3. Fallback por TYPE dos campos (comportamento antigo)
//
// A camada 2 é a novidade. A 3 garante RETROCOMPATIBILIDADE: modelos
// sem papéis marcados comportam-se exactamente como antes, por isso
// nada parte — os títulos só melhoram à medida que se marcam papéis.
// ============================================================

// Junta todos os campos de todos os passos de um modelo.
function camposDoModelo(tipo) {
  if (!tipo || !tipo.steps) return [];
  return tipo.steps.flatMap((step) => step.fields || []);
}

// Lê o valor de um campo do respostas, achatando arrays para string.
function valorTexto(respostas, campoId) {
  const v = respostas?.[campoId];
  const s = Array.isArray(v) ? v.join(", ") : v;
  return typeof s === "string" && s.trim() !== "" ? s.trim() : "";
}

export function getResumoSubmissao(submissao, eventTypes) {
  if (!submissao) return { titulo: "Evento", data: null, local: null };

  const tipo = eventTypes?.find((et) => et.id === submissao.event_type_id);
  const campos = camposDoModelo(tipo);
  const respostas = submissao.respostas || {};

  // ---------------------------------------------------------------
  // TÍTULO
  // ---------------------------------------------------------------
  // 1) colunas fixas (Casamento / editado à mão)
  const nomesFixos = [submissao.nome_noivo, submissao.nome_noiva]
    .map((n) => (typeof n === "string" ? n.trim() : ""))
    .filter((n) => n !== "");
  let titulo = nomesFixos.join(" & ");

  // 2) campos marcados com papel "titulo" (na ordem do modelo)
  if (!titulo && campos.length) {
    const marcados = campos
      .filter((f) => f.papel === "titulo")
      .map((f) => valorTexto(respostas, f.id))
      .filter((s) => s !== "");
    if (marcados.length > 0) titulo = marcados.join(" & ");
  }

  // 3) fallback antigo: primeiros 2 campos de texto preenchidos
  if (!titulo && campos.length) {
    const textos = campos
      .filter((f) => f.type === "text")
      .map((f) => valorTexto(respostas, f.id))
      .filter((s) => s !== "")
      .slice(0, 2);
    if (textos.length > 0) titulo = textos.join(" & ");
  }

  // 4) último recurso
  if (!titulo) titulo = tipo ? tipo.nome : "Evento";

  // ---------------------------------------------------------------
  // LOCAL
  // ---------------------------------------------------------------
  // 1) coluna fixa
  let local =
    typeof submissao.local_evento === "string" &&
    submissao.local_evento.trim() !== ""
      ? submissao.local_evento.trim()
      : null;
  // 2) campo marcado com papel "local"
  if (!local && campos.length) {
    const campoLocal = campos.find((f) => f.papel === "local");
    if (campoLocal) {
      const v = valorTexto(respostas, campoLocal.id);
      if (v) local = v;
    }
  }

  // ---------------------------------------------------------------
  // DATA
  // ---------------------------------------------------------------
  // 1) coluna fixa
  let data = submissao.data_evento || null;
  // 2) campo marcado com papel "data"
  if (!data && campos.length) {
    const campoDataMarcado = campos.find((f) => f.papel === "data");
    if (campoDataMarcado && respostas[campoDataMarcado.id]) {
      data = respostas[campoDataMarcado.id];
    }
  }
  // 3) fallback antigo: primeiro campo type "date" preenchido
  if (!data && campos.length) {
    const campoData = campos.find((f) => f.type === "date");
    if (campoData && respostas[campoData.id]) {
      data = respostas[campoData.id];
    }
  }

  return { titulo, data, local };
}
