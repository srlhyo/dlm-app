import { supabase } from "./supabase";

// Cria um novo tipo de evento (sempre predefinido = false,
// já que os predefinidos só são criados por nós, à mão, no SQL)
export const createEventType = async ({ nome, steps }) => {
  const { data, error } = await supabase
    .from("event_types")
    .insert([{ nome, steps, predefinido: false }])
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Actualiza um tipo de evento já existente (não muda se é predefinido
// ou não — isso mantém-se como estava)
export const updateEventType = async ({ id, nome, steps }) => {
  const { data, error } = await supabase
    .from("event_types")
    .update({ nome, steps })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Remove um tipo de evento. A base de dados impede a remoção se já
// houver convites ou submissões a usá-lo (é assim de propósito —
// protege contra apagar algo que está em uso sem dar por isso)
export const deleteEventType = async (id) => {
  const { error } = await supabase.from("event_types").delete().eq("id", id);
  if (error) throw error;
};