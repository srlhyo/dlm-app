import { useState } from "react";
import { motion } from "framer-motion";
import { getResumoSubmissao } from "../../lib/submissionFields";

const STATUS_OPTIONS = ["Recebido", "Em Preparação", "Confirmado", "Concluído"];

const STATUS_COLORS = {
  Recebido: { bg: "#FEF9EC", color: "#C9A84C", border: "#E8D5A3" },
  "Em Preparação": { bg: "#EFF6FF", color: "#3B82F6", border: "#BFDBFE" },
  Confirmado: { bg: "#F0FDF4", color: "#22C55E", border: "#BBF7D0" },
  Concluído: { bg: "#F9FAFB", color: "#6B7280", border: "#E5E7EB" },
};

// Formata uma data para PT-PT (ex: "12 de junho de 2025")
const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

// Tab Clientes — extraída do AdminPage sem mudar comportamento.
// É auto-suficiente: gere a sua própria pesquisa e filtro de estado
// (estado local), recebe as submissões e desenha a lista. A única
// saída é onSelectSubmission ao clicar num cliente.
//
// Props:
//   submissions        — lista de submissões (já normalizadas)
//   loading            — se ainda está a carregar submissões
//   eventTypes         — tipos de evento (para getResumoSubmissao)
//   onSelectSubmission — abre o drawer de um evento (setSelected no pai)
export default function ClientesTab({
  submissions,
  loading,
  eventTypes,
  onSelectSubmission,
}) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Todos");

  const filtered = submissions
    .filter((s) => filterStatus === "Todos" || s.status === filterStatus)
    .filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const date = s.data_evento
        ? new Date(s.data_evento)
            .toLocaleDateString("pt-PT", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
            .toLowerCase()
        : "";
      return (
        (s.nome_noivo || "").toLowerCase().includes(q) ||
        (s.nome_noiva || "").toLowerCase().includes(q) ||
        (s.local_evento || "").toLowerCase().includes(q) ||
        date.includes(q)
      );
    });

  return (
    <motion.div
      key="tab-clientes"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Estatísticas */}
      <div className="stats-row filter-wrap" style={{ marginBottom: "24px" }}>
        <div className="h-scroll" style={{ gap: "12px", paddingRight: "32px" }}>
          {STATUS_OPTIONS.map((status) => {
            const count = submissions.filter(
              (s) => s.status === status,
            ).length;
            const colors = STATUS_COLORS[status];
            return (
              <div
                key={status}
                style={{
                  backgroundColor: "white",
                  borderRadius: "14px",
                  padding: "16px 12px",
                  textAlign: "center",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  borderTop: `3px solid ${colors.color}`,
                }}
              >
                <p
                  style={{
                    fontSize: "26px",
                    fontWeight: "600",
                    color: colors.color,
                    margin: "0 0 2px 0",
                  }}
                >
                  {count}
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--gray-mid)",
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {status}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pesquisa */}
      <div style={{ position: "relative", marginBottom: "12px" }}>
        <span
          style={{
            position: "absolute",
            left: "14px",
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: "14px",
            pointerEvents: "none",
            color: "var(--gray-mid)",
          }}
        >
          🔍
        </span>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar por nome, local ou data..."
          style={{
            width: "100%",
            padding: "11px 40px 11px 42px",
            borderRadius: "12px",
            fontSize: "13px",
            border: "1.5px solid var(--gold-light)",
            outline: "none",
            transition: "all 0.2s",
            fontFamily: "Inter, sans-serif",
            color: "var(--charcoal)",
            backgroundColor: "white",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--gold)";
            e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--gold-light)";
            e.target.style.boxShadow = "none";
          }}
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{
              position: "absolute",
              right: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              color: "var(--gray-mid)",
              padding: "2px 4px",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Filtros de estado */}
      <div className="filter-wrap" style={{ marginBottom: "8px" }}>
        <div
          className="h-scroll"
          style={{
            gap: "8px",
            alignItems: "center",
            paddingRight: "32px",
          }}
        >
          {["Todos", ...STATUS_OPTIONS].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: "7px 18px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: filterStatus === status ? "600" : "400",
                border: `1px solid ${filterStatus === status ? "var(--gold)" : "var(--gold-light)"}`,
                backgroundColor:
                  filterStatus === status ? "var(--gold)" : "white",
                color: filterStatus === status ? "white" : "var(--charcoal)",
                cursor: "pointer",
                transition: "all 0.2s",
                whiteSpace: "nowrap",
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Contador de resultados da pesquisa */}
      {search && (
        <p
          style={{
            fontSize: "12px",
            color: "var(--gray-mid)",
            margin: "0 0 16px 4px",
          }}
        >
          {filtered.length === 0
            ? "Sem resultados"
            : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`}
        </p>
      )}
      {!search && <div style={{ marginBottom: "16px" }} />}

      {/* Lista */}
      {loading ? (
        <p
          style={{
            textAlign: "center",
            padding: "60px",
            color: "var(--gray-mid)",
            fontSize: "14px",
          }}
        >
          A carregar...
        </p>
      ) : filtered.length === 0 ? (
        <p
          style={{
            textAlign: "center",
            padding: "60px",
            color: "var(--gray-mid)",
            fontSize: "14px",
          }}
        >
          Nenhum formulário encontrado.
        </p>
      ) : (
        <div
          className="clients-list"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          {filtered.map((s, idx) => {
            const colors = STATUS_COLORS[s.status] || STATUS_COLORS["Recebido"];
            return (
              <motion.div
                key={s.id}
                onClick={() => onSelectSubmission(s)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.25,
                  ease: "easeOut",
                  delay: Math.min(idx * 0.04, 0.3),
                }}
                whileHover={{
                  y: -2,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                }}
                style={{
                  backgroundColor: "white",
                  borderRadius: "14px",
                  padding: "18px 22px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                  borderLeft: `4px solid ${colors.color}`,
                }}
              >
                {(() => {
                  const resumo = getResumoSubmissao(s, eventTypes);
                  return (
                    <div>
                      <p
                        style={{
                          fontSize: "15px",
                          fontWeight: "500",
                          color: "var(--charcoal)",
                          margin: "0 0 4px 0",
                        }}
                      >
                        {resumo.titulo}
                      </p>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "var(--gray-mid)",
                          margin: 0,
                        }}
                      >
                        {formatDate(resumo.data)} ·{" "}
                        {resumo.local || "Local não definido"}
                      </p>
                    </div>
                  );
                })()}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      padding: "4px 12px",
                      borderRadius: "999px",
                      backgroundColor: colors.bg,
                      color: colors.color,
                      border: `1px solid ${colors.border}`,
                    }}
                  >
                    {s.status}
                  </span>
                  <span style={{ fontSize: "13px", color: "var(--gold)" }}>
                    Ver detalhes →
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}