import { useState } from "react";
import GerarOrcamento from "./GerarOrcamento";
import GerarContrato from "./GerarContrato";
import GerarProposta from "./GerarProposta";
import { formatarDataPT } from "./orcamentoConfig";

// ============================================================
// DocumentosTab — agrupa a geração de Orçamento e Contrato sob o
// separador "Documentos", com sub-navegação interna (sem inchar a
// barra de separadores principal).
//
// contexto (opcional) — dados de um evento para pré-preencher os
//   formulários (vem do botão 💰/📃 no SubmissionDrawer, via AdminPage).
//   Quando existe: abre na sub-aba certa (contexto.tipoDoc), mostra o
//   banner "Pré-preenchido do evento" e passa o prefill aos geradores.
//   NOTA: o AdminPage monta este componente com uma `key` derivada do
//   contexto — mudar de contexto remonta tudo, por isso os useState
//   iniciais chegam.
// onLimpar() — descarta o contexto e volta ao modo manual (vazio).
// ============================================================
export default function DocumentosTab({ contexto = null, onLimpar }) {
  const [sub, setSub] = useState(contexto?.tipoDoc || "orcamento");

  return (
    <div>
      {/* Sub-navegação */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: contexto ? "16px" : "24px",
        }}
      >
        {[
          { id: "orcamento", label: "Orçamento" },
          { id: "contrato", label: "Contrato" },
          { id: "proposta", label: "Proposta" },
        ].map((t) => {
          const ativo = sub === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSub(t.id)}
              style={{
                padding: "9px 22px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: ativo ? "700" : "500",
                border: `1.5px solid ${ativo ? "var(--gold)" : "var(--gold-light)"}`,
                backgroundColor: ativo ? "var(--gold)" : "white",
                color: ativo ? "white" : "var(--charcoal)",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Banner de contexto — só quando se chega vindo de um evento */}
      {contexto && (
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            backgroundColor: "#FBF7EF",
            border: "1px solid var(--gold-light)",
            borderRadius: "10px",
            padding: "12px 16px",
            marginBottom: "24px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: "10px",
                color: "var(--gold-dark)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                margin: "0 0 2px 0",
              }}
            >
              Pré-preenchido do evento
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
          <button
            onClick={onLimpar}
            title="Descartar o pré-preenchimento e começar do zero"
            style={{
              flexShrink: 0,
              padding: "6px 14px",
              borderRadius: "999px",
              fontSize: "12px",
              border: "1px solid var(--gold)",
              color: "var(--gold-dark)",
              backgroundColor: "white",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ✕ Limpar
          </button>
        </div>
      )}

      {sub === "orcamento" && <GerarOrcamento prefill={contexto} />}
      {sub === "contrato" && <GerarContrato prefill={contexto} />}
      {sub === "proposta" && <GerarProposta prefill={contexto} />}
    </div>
  );
}
