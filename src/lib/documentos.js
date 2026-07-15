import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";

// ============================================================
// documentos — a Biblioteca de Documentos (migração 021).
//
// Cada documento é uma linha na tabela `documentos`:
//   tipo ('orcamento' | 'contrato' | 'proposta')
//   submission_id (evento; NULL = documento manual)
//   dados (JSONB — o estado completo do gerador, num objeto só)
//
// Regras:
//   • Um documento por tipo+evento (índice único parcial da 021).
//     O "upsert" faz-se por select-then-insert — o ON CONFLICT não
//     infere índices parciais via PostgREST de forma fiável.
//   • Documentos manuais têm sempre linha própria (podem existir N).
//   • Criação LAZY nos documentos de evento: a linha só nasce na
//     primeira gravação — abrir o editor sem escrever nada não deixa
//     esqueletos na biblioteca.
// ============================================================

// ------------------------------------------------------------
// CRUD simples
// ------------------------------------------------------------

// Todos os documentos, mais recentes primeiro, com o evento ligado
// (a UI usa getResumoSubmissao(doc.submissions, eventTypes) para o
// título dos cartões; docs manuais têm submissions = null).
export const listarDocumentos = async () => {
  const { data, error } = await supabase
    .from("documentos")
    .select("*, submissions(*)")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

// O documento de um tipo para um evento (ou null se ainda não existe).
export const obterDocumentoDoEvento = async (tipo, submissionId) => {
  const { data, error } = await supabase
    .from("documentos")
    .select("*")
    .eq("tipo", tipo)
    .eq("submission_id", submissionId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

// Um documento pelo id (biblioteca → editor).
export const obterDocumentoPorId = async (id) => {
  const { data, error } = await supabase
    .from("documentos")
    .select("*, submissions(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
};

// Cria um documento. submissionId null = manual (linha própria).
// Se dois separadores correrem à mesma linha de evento (23505 no
// índice único), o vencedor fica e nós relemos o dele.
export const criarDocumento = async (tipo, submissionId = null, dados = {}) => {
  const { data, error } = await supabase
    .from("documentos")
    .insert({ tipo, submission_id: submissionId, dados })
    .select()
    .single();
  if (error) {
    if (error.code === "23505" && submissionId) {
      return await obterDocumentoDoEvento(tipo, submissionId);
    }
    throw error;
  }
  return data;
};

// Grava o estado completo do gerador (o hook abaixo debounça isto).
export const gravarDadosDocumento = async (id, dados) => {
  const { data, error } = await supabase
    .from("documentos")
    .update({ dados })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Apaga um documento (a biblioteca confirma antes de chamar).
export const apagarDocumento = async (id) => {
  const { error } = await supabase.from("documentos").delete().eq("id", id);
  if (error) throw error;
};

// ------------------------------------------------------------
// useDocumento — o coração da persistência nos geradores.
//
// Carrega (ou prepara) o documento certo e devolve um `gravar(dados)`
// debounced (~800ms) com indicador de estado, como na Logística.
//
// Identidade do documento (uma de duas):
//   • documentoId — aberto da biblioteca (manual ou de evento)
//   • tipo + submissionId — aberto do drawer do evento (lazy-create)
//   • tipo sozinho — manual ainda sem linha; nasce na 1.ª gravação
//
// Devolve:
//   carregado  — true quando já se sabe o que existe na BD
//   documento  — a linha (ou null se ainda não nasceu)
//   gravar(d)  — agenda a gravação do objeto de dados completo
//   estado     — 'inactivo' | 'a_guardar' | 'guardado' | 'erro'
//
// O componente deve esperar por `carregado` antes de montar os
// campos (hidratação por useState inicial, como nos prefill).
// ------------------------------------------------------------
export function useDocumento({ tipo, submissionId = null, documentoId = null }) {
  const [documento, setDocumento] = useState(null);
  const [carregado, setCarregado] = useState(false);
  const [estado, setEstado] = useState("inactivo");

  // Refs para o debounce não trabalhar com valores velhos
  const docRef = useRef(null);
  const dadosPendentesRef = useRef(null);
  const timerRef = useRef(null);
  const vivoRef = useRef(true);

  // Executa a gravação do que estiver pendente (cria a linha se preciso)
  const descarregarPendente = async () => {
    const dados = dadosPendentesRef.current;
    if (dados === null) return;
    dadosPendentesRef.current = null;
    try {
      if (docRef.current?.id) {
        const atualizado = await gravarDadosDocumento(docRef.current.id, dados);
        docRef.current = { ...docRef.current, ...atualizado };
      } else {
        // Primeira gravação: a linha nasce agora (lazy-create)
        const novo = await criarDocumento(tipo, submissionId, dados);
        docRef.current = novo;
      }
      if (vivoRef.current) {
        setDocumento(docRef.current);
        setEstado("guardado");
      }
    } catch (e) {
      console.error("useDocumento: falha a gravar", e);
      // Repor os dados pendentes para a próxima tentativa não perder nada
      if (dadosPendentesRef.current === null) dadosPendentesRef.current = dados;
      if (vivoRef.current) setEstado("erro");
    }
  };


  useEffect(() => {
    vivoRef.current = true;
    let cancelado = false;

    const carregar = async () => {
      try {
        let doc = null;
        if (documentoId) {
          doc = await obterDocumentoPorId(documentoId);
        } else if (submissionId) {
          doc = await obterDocumentoDoEvento(tipo, submissionId);
        }
        if (cancelado) return;
        docRef.current = doc;
        setDocumento(doc);
      } catch (e) {
        console.error("useDocumento: falha a carregar", e);
      }
      if (!cancelado) setCarregado(true);
    };
    carregar();

    return () => {
      cancelado = true;
      vivoRef.current = false;
      // Desmontar com gravação pendente: dispara já, sem esperar
      // (fire-and-forget — melhor do que perder o que se escreveu).
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        descarregarPendente();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, submissionId, documentoId]);

  // gravar(dados) — agenda a gravação do estado COMPLETO do gerador.
  const gravar = (dados) => {
    dadosPendentesRef.current = dados;
    setEstado("a_guardar");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      descarregarPendente();
    }, 800);
  };

  return { carregado, documento, gravar, estado };
}

// ------------------------------------------------------------
// IndicadorGravacao — o "A guardar… ✓ Guardado" (padrão da Logística),
// como texto simples para encaixar em qualquer canto dos geradores.
// ------------------------------------------------------------
export const rotuloEstadoGravacao = (estado) => {
  if (estado === "a_guardar") return "A guardar…";
  if (estado === "guardado") return "✓ Guardado";
  if (estado === "erro") return "⚠ Não foi possível guardar";
  return "";
};