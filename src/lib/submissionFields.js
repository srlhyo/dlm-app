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

const FIELD_MAP_INVERSO = Object.fromEntries(
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
// getResumoSubmissao — título e data de QUALQUER submissão,
// independentemente do modelo de evento.
//
// Lê primeiro as colunas fixas (nome_noivo/nome_noiva/data_evento,
// que existem para o Casamento e para submissões editadas à mão) e,
// quando estão vazias, deriva a partir de "respostas" GUIADA PELO
// TYPE dos campos do modelo:
//   • título = primeiros 1-2 campos de texto preenchidos
//   • data   = primeiro campo do tipo "date" preenchido
//
// Não depende de nomes de campos fixos — funciona para Aniversário,
// Batizado, ou qualquer modelo futuro.
// ============================================================

// Junta todos os campos de todos os passos de um modelo.
function camposDoModelo(tipo) {
  if (!tipo || !tipo.steps) return [];
  return tipo.steps.flatMap((step) => step.fields || []);
}

export function getResumoSubmissao(submissao, eventTypes) {
  if (!submissao) return { titulo: "Evento", data: null };

  // 1) TÍTULO — colunas fixas primeiro (Casamento / editado à mão)
  const nomesFixos = [submissao.nome_noivo, submissao.nome_noiva]
    .map((n) => (typeof n === "string" ? n.trim() : ""))
    .filter((n) => n !== "");
  let titulo = nomesFixos.join(" & ");

  const tipo = eventTypes?.find((et) => et.id === submissao.event_type_id);

  // 2) TÍTULO — se as colunas fixas não deram nada, deriva do respostas
  //    pelos campos de texto do modelo (primeiros 2 preenchidos)
  if (!titulo && tipo && submissao.respostas) {
    const campos = camposDoModelo(tipo);
    const textos = campos
      .filter((f) => f.type === "text")
      .map((f) => submissao.respostas[f.id])
      .map((v) => (Array.isArray(v) ? v.join(", ") : v))
      .filter((v) => typeof v === "string" && v.trim() !== "")
      .slice(0, 2);
    if (textos.length > 0) titulo = textos.join(" & ");
  }

  // 3) TÍTULO — último recurso: nome do tipo + código, ou genérico
  if (!titulo) {
    titulo = tipo ? tipo.nome : "Evento";
  }

  // 4) DATA — coluna fixa primeiro, depois campo "date" do modelo
  let data = submissao.data_evento || null;
  if (!data && tipo && submissao.respostas) {
    const campoData = camposDoModelo(tipo).find((f) => f.type === "date");
    if (campoData) {
      const v = submissao.respostas[campoData.id];
      if (v) data = v;
    }
  }

  return { titulo, data };
}
