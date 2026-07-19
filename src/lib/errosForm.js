import { supabase } from "./supabase";

// ============================================================
// errosForm — registo de erros dos formulários públicos na BD.
//
// Quando uma submissão falha no browser de um cliente, o erro real
// morre na consola dele e ninguém o vê. Este módulo grava o erro na
// tabela form_errors, COM as respostas que o cliente tinha preenchido:
// permite investigar a causa E recuperar os dados sem pedir ao cliente
// para preencher tudo de novo.
//
// A gravação é "fire-and-forget": nunca lança, nunca bloqueia o fluxo
// do formulário, e se a própria BD estiver em baixo falha em silêncio
// (o cliente já está a ver a mensagem de erro; não o piorar).
//
// A tabela é criada pela migração docs/migracoes/form_errors.sql.
// ============================================================

// Serializa um erro (Error de JS ou erro do Supabase/PostgREST) num
// objeto plano com tudo o que interessa para diagnóstico.
const serializarErro = (erro) => {
  if (!erro) return { message: "Erro desconhecido" };
  return {
    message: erro.message || String(erro),
    // Campos específicos do PostgREST/Supabase — é aqui que vive a
    // causa real (coluna inexistente, tipo errado, RLS, constraint...)
    code: erro.code ?? null,
    details: erro.details ?? null,
    hint: erro.hint ?? null,
    status: erro.status ?? null,
    name: erro.name ?? null,
  };
};

// Regista um erro de formulário. Devolve sempre (nunca lança).
//   origem    — "onboarding" | "captacao" | ...
//   erro      — a exceção apanhada
//   contexto  — objeto livre (invite, event_type_id, passo...)
//   respostas — o formData no momento da falha (recuperação de dados)
export const registarErroFormulario = async ({
  origem,
  erro,
  contexto = {},
  respostas = null,
}) => {
  try {
    const detalhe = serializarErro(erro);
    await supabase.from("form_errors").insert({
      origem: origem || "desconhecida",
      mensagem: detalhe.message,
      detalhe,
      contexto: {
        ...contexto,
        url: typeof window !== "undefined" ? window.location.href : null,
        userAgent:
          typeof navigator !== "undefined" ? navigator.userAgent : null,
        online: typeof navigator !== "undefined" ? navigator.onLine : null,
      },
      respostas,
    });
  } catch (e) {
    // Última linha de defesa: nunca deixar o registo de erros
    // rebentar o formulário. Fica ao menos na consola.
    console.warn("errosForm: não foi possível registar o erro", e);
  }
};

// Lê os erros recentes (para o painel de administração).
export const getErrosFormulario = async (dias = 30) => {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("form_errors")
    .select("*")
    .gte("created_at", desde.toISOString())
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
};

// Apaga um erro já investigado/resolvido.
export const apagarErroFormulario = async (id) => {
  const { error } = await supabase.from("form_errors").delete().eq("id", id);
  if (error) throw error;
};
