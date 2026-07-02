import { supabase } from "./supabase";
// Gera um código legível e único — ex: DLM-X7K9-2025
export const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part1 = Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  const part2 = Array.from(
    { length: 4 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
  return `DLM-${part1}-${part2}`;
};
// Cria um novo convite no Supabase
// "respostas" é um objecto genérico (ex: { nomeNoivo: "...", email: "..." })
// com os campos que a irmã escolheu preencher no Painel de Novo Convite —
// pode ter campos diferentes, dependendo do tipo de evento e do que ela
// decidiu mostrar nesse momento.
export const createInvite = async ({
  dataEvento,
  eventTypeId,
  respostas,
  reservaId,
}) => {
  let code, exists;
  do {
    code = generateCode();
    const { data } = await supabase
      .from("invites")
      .select("id")
      .eq("code", code)
      .single();
    exists = !!data;
  } while (exists);
  const { data, error } = await supabase
    .from("invites")
    .insert([
      {
        code,
        data_evento: dataEvento || null,
        event_type_id: eventTypeId,
        respostas: respostas || {},
        status: "Pendente",
        reserva_id: reservaId || null,
      },
    ])
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Vai buscar todos os tipos de evento disponíveis
// (para preencher o seletor ao criar um convite, e a lista no Admin)
export const getEventTypes = async () => {
  const { data, error } = await supabase
    .from("event_types")
    .select("id, nome, predefinido, steps")
    .order("nome");
  if (error) throw error;
  return data;
};
// Valida um código e devolve o convite se válido
// Inclui também o tipo de evento associado (nome + steps), para o
// formulário saber que perguntas mostrar
export const validateCode = async (code) => {
  const { data, error } = await supabase
    .from("invites")
    .select("*, event_types(nome, steps, icone)")
    .eq("code", code.toUpperCase().trim())
    .single();
  if (error || !data) {
    return {
      valid: false,
      reason:
        "Código inválido. Verifica o código que recebeste e tenta novamente.",
    };
  }
  if (!data.event_types) {
    return {
      valid: false,
      reason:
        "Este convite não tem um tipo de evento associado. Contacta Do Luxo à Mesa.",
    };
  }
  if (data.status === "Preenchido") {
    return {
      valid: false,
      reason:
        "Este questionário já foi submetido. Se precisares de alterar alguma resposta, contacta Do Luxo à Mesa.",
    };
  }
  return { valid: true, invite: data };
};
// Marca o convite como preenchido e liga à submissão.
// Se o convite nasceu de uma reserva (reserva_id), converte também
// essa reserva: liga-a à submissão e marca-a como "Convertida".
// Assim, quando o cliente submete o formulário, a reserva provisória
// deixa de aparecer na agenda e passa a evento real automaticamente.
export const markInviteUsed = async (inviteId, submissionId) => {
  // buscar o convite para saber se tem reserva associada
  const { data: invite } = await supabase
    .from("invites")
    .select("reserva_id")
    .eq("id", inviteId)
    .single();

  await supabase
    .from("invites")
    .update({ status: "Preenchido", submission_id: submissionId })
    .eq("id", inviteId);

  // converter a reserva de origem, se existir
  if (invite?.reserva_id) {
    await supabase
      .from("reservas")
      .update({ estado: "Convertida", submission_id: submissionId })
      .eq("id", invite.reserva_id);
  }
};
