import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

// ============================================================
// notificacoes.js — a Caixa de Entrada da Nádia (migração 022).
// Cada linha é um acontecimento (hoje: uma captação pública) com o
// snapshot completo do pedido em `dados` — o que o interessado
// preencheu, tal como chegou.
//
// Degradação graciosa: enquanto a migração 022 não correr numa BD,
// a tabela não existe lá — tudo devolve vazio sem rebentar, e a app
// continua a funcionar como antes (mesmo padrão do rpc.js).
// ============================================================

// O PostgREST responde 42P01/PGRST205 quando a tabela não existe.
const ehTabelaEmFalta = (erro) =>
  erro?.code === "42P01" ||
  erro?.code === "PGRST205" ||
  /relation .* does not exist|could not find the table/i.test(
    erro?.message || "",
  );

export const getNotificacoes = async (limite = 60) => {
  try {
    const { data, error } = await supabase
      .from("notificacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limite);
    if (error) throw error;
    return data || [];
  } catch (e) {
    if (ehTabelaEmFalta(e)) {
      console.warn("Tabela notificacoes ainda não existe (migração 022).");
    } else {
      console.error("Erro ao ler notificações:", e);
    }
    return [];
  }
};

export const marcarNotificacaoLida = async (id) => {
  try {
    await supabase
      .from("notificacoes")
      .update({ lida_em: new Date().toISOString() })
      .eq("id", id)
      .is("lida_em", null);
  } catch (e) {
    console.error("Erro ao marcar notificação lida:", e);
  }
};

export const marcarTodasNotificacoesLidas = async () => {
  try {
    await supabase
      .from("notificacoes")
      .update({ lida_em: new Date().toISOString() })
      .is("lida_em", null);
  } catch (e) {
    console.error("Erro ao marcar notificações lidas:", e);
  }
};

// Subscreve INSERTs em tempo real. Devolve a função de limpeza.
export const subscreverNotificacoes = (onNova) => {
  const canal = supabase
    .channel("notificacoes-changes")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notificacoes" },
      (payload) => {
        if (payload?.new) onNova(payload.new);
      },
    )
    .subscribe();
  return () => supabase.removeChannel(canal);
};

// ------------------------------------------------------------
// useNotificacoes — o estado vivo da Caixa de Entrada.
// Carrega a lista, subscreve o realtime, conta as não lidas e
// reflete-as no título do separador do browser. `nova` guarda a
// última chegada em tempo real (alimenta o toast).
// ------------------------------------------------------------
export function useNotificacoes() {
  const [lista, setLista] = useState([]);
  const [nova, setNova] = useState(null);

  useEffect(() => {
    getNotificacoes().then(setLista);
    const parar = subscreverNotificacoes((n) => {
      setLista((prev) => [n, ...prev.filter((x) => x.id !== n.id)]);
      setNova(n);
    });
    return parar;
  }, []);

  const naoLidas = lista.filter((n) => !n.lida_em).length;

  useEffect(() => {
    const base = "Sistema DLM — Do Luxo à Mesa";
    document.title = naoLidas > 0 ? `(${naoLidas}) ${base}` : base;
  }, [naoLidas]);

  const marcarLida = useCallback((id) => {
    setLista((prev) =>
      prev.map((n) =>
        n.id === id && !n.lida_em
          ? { ...n, lida_em: new Date().toISOString() }
          : n,
      ),
    );
    marcarNotificacaoLida(id);
  }, []);

  const marcarTodas = useCallback(() => {
    setLista((prev) =>
      prev.map((n) =>
        n.lida_em ? n : { ...n, lida_em: new Date().toISOString() },
      ),
    );
    marcarTodasNotificacoesLidas();
  }, []);

  const limparNova = useCallback(() => setNova(null), []);

  return { lista, naoLidas, nova, marcarLida, marcarTodas, limparNova };
}
