// Mapa entre as colunas antigas (snake_case, escritas à medida do
// Casamento) e os IDs dos campos do formulário (camelCase, é como ficam
// guardados dentro de "respostas" a partir do Bloco 3).
//
// Isto é uma "ponte" temporária: enquanto só existir o tipo de evento
// Casamento, permite que o Admin e o Briefing continuem a ler
// s.estilo_evento, s.mesa_noivos, etc., sem importar se os dados vieram
// de uma submissão antiga (colunas fixas) ou de uma nova (JSONB).
// Quando criarmos outros tipos de evento, esta parte do Admin/Briefing
// vai precisar de passar a ler de forma genérica a partir dos "steps"
// de cada tipo — fica para um bloco futuro.
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
  acesso_local: "acessoLocal",
  notas_acesso: "notasAcesso",
  observacoes_gerais: "observacoesGerais",
};

// Mapa inverso (campo camelCase → coluna antiga), construído a partir
// do mapa acima — para ires da direcção contrária
const FIELD_MAP_INVERSO = Object.fromEntries(
  Object.entries(FIELD_MAP).map(([coluna, campo]) => [campo, coluna]),
);

// Dado o id de um campo (camelCase — o mesmo usado em "respostas" e nas
// definições dos tipos de evento), devolve o valor mais actual dessa
// submissão. Dá prioridade à coluna antiga quando ela foi editada à mão
// (ex: pelo botão "Editar" na tab Clientes) — só cai para "respostas"
// quando essa coluna não existe ou está vazia (tipos de evento novos,
// ou nunca editados).
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

// Recebe uma submissão tal como vem do Supabase e devolve uma versão
// "achatada": preenche as colunas antigas a partir de "respostas"
// sempre que a coluna estiver vazia. Submissões antigas (sem
// "respostas") saem inalteradas.
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
