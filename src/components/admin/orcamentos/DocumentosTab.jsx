import { useState } from "react";
import GerarOrcamento from "./GerarOrcamento";
import GerarContrato from "./GerarContrato";

// ============================================================
// DocumentosTab — agrupa a geração de Orçamento e Contrato sob o
// separador "Orçamentos", com sub-navegação interna (sem inchar a
// barra de separadores principal).
// ============================================================

export default function DocumentosTab() {
  const [sub, setSub] = useState("orcamento");

  return (
    <div>
      {/* Sub-navegação */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
        }}
      >
        {[
          { id: "orcamento", label: "Orçamento" },
          { id: "contrato", label: "Contrato" },
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

      {sub === "orcamento" && <GerarOrcamento />}
      {sub === "contrato" && <GerarContrato />}
    </div>
  );
}
