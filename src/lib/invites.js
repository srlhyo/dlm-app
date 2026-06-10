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
export const createInvite = async ({
  nomeNoivo,
  nomeNoiva,
  email,
  dataEvento,
}) => {
  let code, exists;

  // Garante que o código é único
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
        nome_noivo: nomeNoivo,
        nome_noiva: nomeNoiva,
        email: email || null,
        data_evento: dataEvento || null,
        status: "Pendente",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Valida um código e devolve o convite se válido
export const validateCode = async (code) => {
  const { data, error } = await supabase
    .from("invites")
    .select("*")
    .eq("code", code.toUpperCase().trim())
    .single();

  if (error || !data) return { valid: false, reason: "Código inválido" };

  // Verifica se já expirou (dia seguinte ao evento)
  if (data.data_evento) {
    const [year, month, day] = data.data_evento.split("-").map(Number);
    // Expira no fim do dia seguinte ao evento (hora local)
    const expiryDate = new Date(year, month - 1, day + 2);
    if (new Date() > expiryDate) {
      return { valid: false, reason: "Este código já expirou" };
    }
  }

  return { valid: true, invite: data };
};

// Marca o convite como preenchido e liga à submissão
export const markInviteUsed = async (inviteId, submissionId) => {
  await supabase
    .from("invites")
    .update({ status: "Preenchido", submission_id: submissionId })
    .eq("id", inviteId);
};
