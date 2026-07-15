import { useState, useEffect } from "react";
import GerarOrcamento from "./GerarOrcamento";
import GerarContrato from "./GerarContrato";
import GerarProposta from "./GerarProposta";
import { formatarDataPT } from "./orcamentoConfig";
import {
  obterDocumentoDoEvento,
  criarDocumento,
} from "../../../lib/documentos";

// ============================================================
// DocumentoEventoPage — a página de UM documento de UM evento.
//
// É para aqui que vêm os botões 💰/📃/🎨 do drawer (via AdminPage,
// pseudo-separador "documentoEvento") — o separador Documentos deixa
// de ser sequestrado pelo contexto e é SEMPRE a biblioteca.
//
// Ao abrir, GARANTE a existência do documento na BD (criando-o vazio
// se não existir — o espírito da visão original). Assim, um documento
// aberto pelo drawer aparece na biblioteca mesmo que a Nádia imprima
// sem editar nada. É seguro criar já porque esta página monta UM
// gerador só (no modo antigo, com os três keep-mounted, o eager-create
// criaria 3 documentos por visita — era por isso o lazy).
//
// O gerador recebe documentoId (identidade) + prefill (fallback de
// hidratação: documento.dados > prefill > defaults — como o doc nasce
// com dados {}, o ?? por campo deixa o prefill preencher tudo).
// ============================================================

const ROTULOS = {
  orcamento: "Orçamento",
  contrato: "Contrato",
  proposta: "Projecto",
};

export default function DocumentoEventoPage({
  contexto,
  onVoltar,
  onDadosMudaram,
}) {
  const tipo = contexto?.tipoDoc || "orcamento";
  const submissionId = contexto?.submissionId || null;
  const [docId, setDocId] = useState(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!submissionId) return;
    let cancelado = false;
    (async () => {
      try {
        let doc = await obterDocumentoDoEvento(tipo, submissionId);
        if (!doc) doc = await criarDocumento(tipo, submissionId, {});
        if (!cancelado) setDocId(doc.id);
      } catch (e) {
        console.error("DocumentoEventoPage: falha a preparar o documento", e);
        if (!cancelado) setErro(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [tipo, submissionId]);

  if (!submissionId) return null;

  return (
    <div>
      {/* Cabeçalho: voltar + identificação do documento/evento */}
      <div
        className="no-print"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          backgroundColor: "#FBF7EF",
          border: "1px solid var(--gold-light)",
          borderRadius: "10px",
          padding: "12px 16px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={onVoltar}
          style={{
            flexShrink: 0,
            padding: "6px 14px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: "600",
            border: "1.5px solid var(--gold)",
            backgroundColor: "white",
            color: "var(--gold-dark)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ← Voltar ao evento
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p
            style={{
              fontSize: "10px",
              color: "var(--gold-dark)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: "0 0 2px 0",
            }}
          >
            {ROTULOS[tipo] || "Documento"} do evento
          </p>
          <p
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "var(--charcoal)",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {contexto.titulo}
            {contexto.tipoEvento ? ` · ${contexto.tipoEvento}` : ""}
            {contexto.dataEvento
              ? ` · ${formatarDataPT(contexto.dataEvento)}`
              : ""}
          </p>
        </div>
      </div>

      {erro ? (
        <p style={{ fontSize: "13px", color: "#DC2626" }}>
          Não foi possível preparar o documento. Volta ao evento e tenta
          novamente.
        </p>
      ) : !docId ? (
        <p style={{ fontSize: "13px", color: "var(--gray-mid)" }}>
          A carregar o documento…
        </p>
      ) : (
        <>
          {tipo === "orcamento" && (
            <GerarOrcamento
              prefill={contexto}
              documentoId={docId}
              ativo={true}
              onDadosMudaram={onDadosMudaram}
            />
          )}
          {tipo === "contrato" && (
            <GerarContrato prefill={contexto} documentoId={docId} ativo={true} />
          )}
          {tipo === "proposta" && (
            <GerarProposta prefill={contexto} documentoId={docId} ativo={true} />
          )}
        </>
      )}
    </div>
  );
}