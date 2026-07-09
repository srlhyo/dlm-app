import { supabase } from "./supabase";
import { getValorAtual, getResumoSubmissao } from "./submissionFields";

// ============================================================
// Clientes — a pessoa (separada do evento desde a migração 010).
// Um cliente tem vários eventos (submissions com cliente_id).
// ============================================================

// Lista os clientes com um resumo dos seus eventos (contagem + primeiro ano).
// Uma query só: clientes + eventos ligados, agregados no cliente.
export const getClientes = async () => {
  const { data, error } = await supabase
    .from("clientes")
    .select(
      "id, nome, contacto, email, nif, morada, notas, created_at, submissions(id, data_evento, fase, event_type_id)",
    )
    .order("nome");
  if (error) throw error;

  return (data || []).map((c) => {
    const eventos = c.submissions || [];
    const anos = eventos
      .map((e) => (e.data_evento ? Number(e.data_evento.slice(0, 4)) : null))
      .filter(Boolean);
    return {
      ...c,
      totalEventos: eventos.length,
      desdeAno: anos.length ? Math.min(...anos) : null,
    };
  });
};

// Obtém um cliente com os seus eventos completos, ordenados por data.
export const getClienteComEventos = async (clienteId) => {
  const { data, error } = await supabase
    .from("clientes")
    .select("*, submissions(*)")
    .eq("id", clienteId)
    .single();
  if (error) throw error;
  const eventos = (data.submissions || []).sort((a, b) =>
    (a.data_evento || "9999").localeCompare(b.data_evento || "9999"),
  );
  return { ...data, eventos };
};

// Atualiza os dados da pessoa (nome, contacto, email, nif, morada, notas).
export const updateCliente = async (id, dados) => {
  const permitidos = ["nome", "contacto", "email", "nif", "morada", "notas"];
  const limpos = {};
  for (const k of permitidos) {
    if (k in dados) limpos[k] = dados[k];
  }
  const { data, error } = await supabase
    .from("clientes")
    .update(limpos)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Cria um evento novo (submission) JÁ LIGADO a um cliente existente —
// o caminho da recorrência (Opção 3): nunca cria cliente, só evento.
// O evento nasce na fase inicial do funil.
export const createEventoParaCliente = async (clienteId, dados = {}) => {
  const { data, error } = await supabase
    .from("submissions")
    .insert({
      cliente_id: clienteId,
      fase: "interessado",
      ...dados,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ============================================================
// Submissão do questionário público (Cenário A: cliente novo).
// Cria o CLIENTE (extraindo os dados de pessoa das respostas) e a
// SUBMISSÃO (o evento) já ligada — nasce tudo junto, como decidido.
//
// A extração do nome segue a prioridade da migração 011:
//   1. nomeNoivo & nomeNoiva   (casamentos)
//   2. nomeDoCliente           (outros eventos)
//   3. nomeResponsavel         (fallback; nomeDoBebe fica de fora — o
//      bebé é o homenageado, não quem contrata)
// ============================================================

const limpar = (v) => {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
};

// Extrai os dados de pessoa das respostas do formulário (JSONB).
export const extrairDadosCliente = (respostas = {}) => {
  const noivo = limpar(respostas.nomeNoivo);
  const noiva = limpar(respostas.nomeNoiva);
  const casal = [noivo, noiva].filter(Boolean).join(" & ") || null;

  const nome =
    casal ||
    limpar(respostas.nomeDoCliente) ||
    limpar(respostas.nomeResponsavel) ||
    "Cliente sem nome";

  return {
    nome,
    contacto: limpar(respostas.contactoPrincipal),
    email: limpar(respostas.email),
    morada: limpar(respostas.morada),
  };
};

// Submete o questionário: cria cliente + submissão ligados.
// payload = o objeto que o FormPage montava (event_type_id, data_evento,
// numero_convidados, respostas). Devolve a submissão criada.
export const submeterQuestionario = async (payload) => {
  // 1. Criar o cliente com os dados de pessoa extraídos das respostas
  const dadosCliente = extrairDadosCliente(payload.respostas);
  const { data: cliente, error: erroCliente } = await supabase
    .from("clientes")
    .insert(dadosCliente)
    .select()
    .single();
  if (erroCliente) throw erroCliente;

  // 2. Criar a submissão (o evento) já ligada ao cliente.
  //    O questionário só se preenche DEPOIS de a venda fechar (é
  //    onboarding, não captação) — por isso o evento nasce na fase
  //    "cliente" (funil comercial concluído; o operacional começa no
  //    status "Recebido" que o sistema já atribui).
  const { data: submission, error: erroSub } = await supabase
    .from("submissions")
    .insert([{ ...payload, cliente_id: cliente.id, fase: "cliente" }])
    .select()
    .single();
  if (erroSub) {
    // Não deixar um cliente órfão se a submissão falhar
    await supabase.from("clientes").delete().eq("id", cliente.id);
    throw erroSub;
  }

  return submission;
};

// ============================================================
// Funil comercial — leitura e avanço de fases.
// ============================================================

// Todos os eventos com o nome do cliente ligado — a matéria-prima do
// funil. Traz a linha completa da submission para o card poder abrir
// o SubmissionDrawer diretamente.
export const getEventosFunil = async () => {
  const { data, error } = await supabase
    .from("submissions")
    .select("*, clientes(nome)")
    .order("data_evento", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data || [];
};

// Muda a fase de um evento — com whitelist (lição 3): só as fases da
// CHECK constraint passam; qualquer outra rebenta aqui e não na BD.
const FASES_VALIDAS = [
  "interessado",
  "orcamento",
  "contrato",
  "cliente",
  "perdido",
];

export const updateFase = async (submissionId, fase) => {
  if (!FASES_VALIDAS.includes(fase)) {
    throw new Error(`Fase inválida: ${fase}`);
  }
  const { data, error } = await supabase
    .from("submissions")
    .update({ fase })
    .eq("id", submissionId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ============================================================
// Documentos pré-preenchidos — junta os dados do CLIENTE (pessoa) e
// do EVENTO (submission) num objeto pronto a alimentar os formulários
// de Orçamento e Contrato.
//
// Regras respeitadas:
//   • Leitura SEMPRE das duas fontes (colunas antigas OU respostas
//     JSONB), via getValorAtual.
//   • O NIF vive em clientes.nif (a submissions não tem coluna nif).
//   • Contraentes: só há 2 quando existem nomeNoivo E nomeNoiva
//     (casamentos). Batizados, aniversários, dia da mãe/pai, etc.
//     têm 1 contraente — o cliente. Nos casais, o NIF do cliente
//     pré-preenche o 1.º contraente; o 2.º fica para a Nádia.
// ============================================================
export const getDadosParaDocumento = async (submission, eventTypes) => {
  // 1. Buscar a pessoa (pode não existir em eventos antigos sem cliente_id)
  let cliente = null;
  if (submission.cliente_id) {
    const { data, error } = await supabase
      .from("clientes")
      .select("id, nome, contacto, email, nif, morada")
      .eq("id", submission.cliente_id)
      .single();
    if (!error) cliente = data;
  }

  // Leitura dupla fonte, já limpa (null quando vazio)
  const ler = (campoId) => limpar(getValorAtual(submission, campoId));

  const tipo = eventTypes?.find((et) => et.id === submission.event_type_id);
  const resumo = getResumoSubmissao(submission, eventTypes);

  // Contraentes do contrato
  const noivo = ler("nomeNoivo");
  const noiva = ler("nomeNoiva");
  let contraentes;
  if (noivo && noiva) {
    contraentes = [
      { nome: noivo, nif: cliente?.nif || "" },
      { nome: noiva, nif: "" },
    ];
  } else {
    contraentes = [
      {
        nome:
          cliente?.nome || ler("nomeDoCliente") || ler("nomeResponsavel") || "",
        nif: cliente?.nif || "",
      },
    ];
  }

  return {
    submissionId: submission.id,
    titulo: resumo.titulo,
    cliente,

    // ---- Orçamento ----
    nomeCliente: cliente?.nome || resumo.titulo || "",
    tipoEvento: tipo?.nome || "",
    dataEvento: submission.data_evento || ler("dataEvento") || "",
    local: ler("localEvento") || "",

    // ---- Contrato ----
    contraentes,
    morada: cliente?.morada || ler("morada") || "",
    contacto: cliente?.contacto || ler("contactoPrincipal") || "",
    horaInicio: ler("horaInicio") || "",
    horaFim: ler("horaTermino") || "",
    // O contrato quer a morada completa do espaço — a moradaExacta é a
    // melhor candidata; senão, o local do evento.
    localCompleto: ler("moradaExacta") || ler("localEvento") || "",
    lugares: ler("numeroConvidados") || "",
    valor: submission.valor_acordado ?? "",
  };
};
