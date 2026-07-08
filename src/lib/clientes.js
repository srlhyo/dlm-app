import { supabase } from "./supabase";

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
