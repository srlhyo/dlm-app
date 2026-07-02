import { supabase } from "./supabase";

// ============================================================
// reservas.js — reservas provisórias da Agenda.
// Marcação rápida de um dia enquanto a irmã fala com a cliente,
// antes de haver cliente fechado. Quando a cliente fecha o pacote,
// a reserva converte-se e liga-se à submissão.
// Estilo alinhado com invites.js / eventTypes.js.
// ============================================================

// Estados possíveis de uma reserva no funil.
export const ESTADOS_RESERVA = {
  PROVISORIA: "Provisória",
  CONVERTIDA: "Convertida",
  CANCELADA: "Cancelada",
};

// Vai buscar as reservas, com o nome do tipo de evento (join opcional).
// Por defeito só traz as provisórias — as convertidas já viraram
// submissões e aparecem como eventos reais; as canceladas não interessam.
// incluirTodas = true traz tudo (para históricos/depuração).
export const getReservas = async ({ incluirTodas = false } = {}) => {
  let query = supabase
    .from("reservas")
    .select("*, event_types(nome, icone)")
    .order("data_evento", { ascending: true });

  if (!incluirTodas) query = query.eq("estado", ESTADOS_RESERVA.PROVISORIA);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

// Cria uma reserva. Só o nome é obrigatório — o resto é opcional,
// para ela poder marcar rápido ao telefone.
export const createReserva = async ({
  nomeCliente,
  dataEvento,
  eventTypeId,
  contacto,
  nota,
}) => {
  if (!nomeCliente || !nomeCliente.trim()) {
    throw new Error("O nome da cliente é obrigatório.");
  }

  const { data, error } = await supabase
    .from("reservas")
    .insert([
      {
        nome_cliente: nomeCliente.trim(),
        data_evento: dataEvento || null,
        event_type_id: eventTypeId || null,
        contacto: contacto?.trim() || null,
        nota: nota?.trim() || null,
        estado: ESTADOS_RESERVA.PROVISORIA,
      },
    ])
    .select("*, event_types(nome, icone)")
    .single();
  if (error) throw error;
  return data;
};

// Actualiza campos de uma reserva. Só passa os campos presentes.
export const updateReserva = async (id, campos) => {
  const mapa = {
    nomeCliente: "nome_cliente",
    dataEvento: "data_evento",
    eventTypeId: "event_type_id",
    contacto: "contacto",
    nota: "nota",
    estado: "estado",
    submissionId: "submission_id",
  };
  const patch = {};
  for (const [chaveJS, coluna] of Object.entries(mapa)) {
    if (chaveJS in campos) {
      let valor = campos[chaveJS];
      if (typeof valor === "string") valor = valor.trim() || null;
      patch[coluna] = valor;
    }
  }
  if (Object.keys(patch).length === 0) throw new Error("Nada para actualizar.");

  const { data, error } = await supabase
    .from("reservas")
    .update(patch)
    .eq("id", id)
    .select("*, event_types(nome, icone)")
    .single();
  if (error) throw error;
  return data;
};

// Remove uma reserva definitivamente.
export const deleteReserva = async (id) => {
  const { error } = await supabase.from("reservas").delete().eq("id", id);
  if (error) throw error;
};

// Cancela uma reserva (soft) — mantém o registo mas tira-a da agenda.
export const cancelarReserva = async (id) => {
  return updateReserva(id, { estado: ESTADOS_RESERVA.CANCELADA });
};

// Converte uma reserva num cliente fechado: liga-a à submissão criada
// e marca como convertida. A reserva não é apagada — fica como o
// registo de onde este cliente começou.
export const converterReserva = async (id, submissionId) => {
  if (!submissionId) throw new Error("submissionId em falta na conversão.");
  return updateReserva(id, {
    estado: ESTADOS_RESERVA.CONVERTIDA,
    submissionId,
  });
};

// Agrupa reservas por dia (chave 'YYYY-MM-DD') — útil para o calendário
// juntar reservas e eventos reais no mesmo dia.
export const agruparReservasPorDia = (reservas) => {
  const mapa = {};
  for (const r of reservas) {
    if (!r.data_evento) continue;
    const chave = r.data_evento; // já vem como 'YYYY-MM-DD' do Postgres (date)
    if (!mapa[chave]) mapa[chave] = [];
    mapa[chave].push(r);
  }
  return mapa;
};
