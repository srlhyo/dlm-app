import { useState } from "react";
import { motion } from "framer-motion";

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

// Cores por estado — mantém o mesmo padrão visual do resto da app
const STATUS_CORES = {
  Recebido: { bg: "#FEF9EC", border: "#E8D5A3", texto: "#A07830" },
  "Em Preparação": { bg: "#EFF6FF", border: "#BFDBFE", texto: "#1D4ED8" },
  Confirmado: { bg: "#F0FDF4", border: "#BBF7D0", texto: "#15803D" },
  Concluído: { bg: "#F9FAFB", border: "#E5E7EB", texto: "#6B7280" },
};

function getTituloSubmissao(s, eventTypes) {
  // Tenta nome das colunas antigas, depois de respostas
  const nomePrimeiro =
    s.nome_noivo || s.respostas?.nomeNoivo || s.respostas?.nomeContacto || null;
  const nomeSegundo = s.nome_noiva || s.respostas?.nomeNoiva || null;
  if (nomePrimeiro && nomeSegundo) return `${nomePrimeiro} & ${nomeSegundo}`;
  if (nomePrimeiro) return nomePrimeiro;

  // Fallback: tipo + estado
  const tipo = eventTypes?.find((et) => et.id === s.event_type_id);
  return tipo ? tipo.nome : "Evento";
}

function getTipoNome(s, eventTypes) {
  const tipo = eventTypes?.find((et) => et.id === s.event_type_id);
  return tipo?.nome || null;
}

// Devolve os dias do mês numa grelha começando à Segunda
function buildGrid(ano, mes) {
  const primeiroDia = new Date(ano, mes, 1);
  const ultimoDia = new Date(ano, mes + 1, 0);
  // 0=Dom … em PT começamos na Segunda (1)
  const offset = (primeiroDia.getDay() + 6) % 7; // 0=Seg, 6=Dom
  const grid = [];
  for (let i = 0; i < offset; i++) grid.push(null);
  for (let d = 1; d <= ultimoDia.getDate(); d++) grid.push(d);
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

export default function CalendarioTab({
  submissions,
  eventTypes,
  onSelectSubmission,
}) {
  const hoje = new Date();
  const [viewDate, setViewDate] = useState(
    new Date(hoje.getFullYear(), hoje.getMonth(), 1),
  );
  // Popup de dia: { dia, eventos } ou null
  const [popupDia, setPopupDia] = useState(null);

  const ano = viewDate.getFullYear();
  const mes = viewDate.getMonth();
  const grid = buildGrid(ano, mes);

  const mesAnterior = () => setViewDate(new Date(ano, mes - 1, 1));
  const mesSeguinte = () => setViewDate(new Date(ano, mes + 1, 1));

  // Agrupa as submissões por dia do mês actual
  const eventosPorDia = {};
  submissions.forEach((s) => {
    if (!s.data_evento) return;
    const d = new Date(s.data_evento);
    if (d.getFullYear() !== ano || d.getMonth() !== mes) return;
    const dia = d.getUTCDate();
    if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
    eventosPorDia[dia].push(s);
  });

  const totalEventosMes = Object.values(eventosPorDia).flat().length;
  const diasOcupados = Object.keys(eventosPorDia).length;

  return (
    <motion.div
      key="tab-calendario"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Cabeçalho do mês + navegação */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={mesAnterior}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "1.5px solid var(--gold-light)",
              background: "white",
              cursor: "pointer",
              fontSize: "16px",
              color: "var(--gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ‹
          </button>
          <h2
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "20px",
              color: "var(--charcoal)",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              minWidth: "220px",
              textAlign: "center",
            }}
          >
            {MESES[mes]} {ano}
          </h2>
          <button
            onClick={mesSeguinte}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "1.5px solid var(--gold-light)",
              background: "white",
              cursor: "pointer",
              fontSize: "16px",
              color: "var(--gold)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ›
          </button>
        </div>

        {/* Resumo rápido do mês */}
        <div style={{ display: "flex", gap: "12px" }}>
          <div
            style={{
              fontSize: "12px",
              color: "var(--gray-mid)",
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "6px 14px",
              border: "1px solid var(--gold-light)",
            }}
          >
            <span style={{ fontWeight: "700", color: "var(--gold)" }}>
              {totalEventosMes}
            </span>{" "}
            {totalEventosMes === 1 ? "evento" : "eventos"} este mês
          </div>
          <div
            style={{
              fontSize: "12px",
              color: "var(--gray-mid)",
              backgroundColor: "white",
              borderRadius: "8px",
              padding: "6px 14px",
              border: "1px solid var(--gold-light)",
            }}
          >
            <span style={{ fontWeight: "700", color: "var(--gold)" }}>
              {diasOcupados}
            </span>{" "}
            {diasOcupados === 1 ? "dia ocupado" : "dias ocupados"}
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        {Object.entries(STATUS_CORES).map(([status, cor]) => (
          <div
            key={status}
            style={{ display: "flex", alignItems: "center", gap: "5px" }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: cor.bg,
                border: `1.5px solid ${cor.border}`,
              }}
            />
            <span style={{ fontSize: "10px", color: "var(--gray-mid)" }}>
              {status}
            </span>
          </div>
        ))}
      </div>

      {/* Grelha do calendário */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
          border: "1px solid var(--gold-light)",
        }}
      >
        {/* Cabeçalho dos dias da semana */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            backgroundColor: "var(--gold)",
          }}
        >
          {DIAS_SEMANA.map((d) => (
            <div
              key={d}
              style={{
                textAlign: "center",
                padding: "10px 0",
                fontSize: "11px",
                fontWeight: "700",
                color: "white",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Dias */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {grid.map((dia, i) => {
            if (dia === null) {
              return (
                <div
                  key={`empty-${i}`}
                  style={{
                    minHeight: "90px",
                    backgroundColor: "#FAFAF8",
                    borderRight: "1px solid #F0E6D0",
                    borderBottom: "1px solid #F0E6D0",
                  }}
                />
              );
            }

            const ehHoje =
              dia === hoje.getDate() &&
              mes === hoje.getMonth() &&
              ano === hoje.getFullYear();
            const eventos = eventosPorDia[dia] || [];
            const temEventos = eventos.length > 0;
            const visiveis = eventos.slice(0, 2);
            const extra = eventos.length - visiveis.length;

            return (
              <div
                key={dia}
                style={{
                  minHeight: "90px",
                  borderRight: "1px solid #F0E6D0",
                  borderBottom: "1px solid #F0E6D0",
                  padding: "8px 6px",
                  backgroundColor: temEventos ? "#FFFDF5" : "white",
                  position: "relative",
                  transition: "background-color 0.15s",
                }}
              >
                {/* Número do dia */}
                <div
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    backgroundColor: ehHoje ? "var(--gold)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "4px",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: ehHoje || temEventos ? "700" : "400",
                      color: ehHoje
                        ? "white"
                        : temEventos
                          ? "var(--gold-dark)"
                          : "var(--gray-mid)",
                    }}
                  >
                    {dia}
                  </span>
                </div>

                {/* Eventos */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "3px",
                  }}
                >
                  {visiveis.map((s) => {
                    const cores =
                      STATUS_CORES[s.status] || STATUS_CORES["Recebido"];
                    const titulo = getTituloSubmissao(s, eventTypes);
                    const tipo = getTipoNome(s, eventTypes);
                    return (
                      <button
                        key={s.id}
                        onClick={() => onSelectSubmission(s)}
                        title={`${titulo}${tipo ? ` · ${tipo}` : ""} · ${s.status}`}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "3px 6px",
                          borderRadius: "5px",
                          backgroundColor: cores.bg,
                          border: `1px solid ${cores.border}`,
                          cursor: "pointer",
                          transition: "opacity 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.opacity = "0.75")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.opacity = "1")
                        }
                      >
                        <p
                          style={{
                            fontSize: "10px",
                            fontWeight: "600",
                            color: cores.texto,
                            margin: 0,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {titulo}
                        </p>
                        {tipo && (
                          <p
                            style={{
                              fontSize: "9px",
                              color: cores.texto,
                              margin: 0,
                              opacity: 0.75,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {tipo}
                          </p>
                        )}
                      </button>
                    );
                  })}
                  {extra > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPopupDia({ dia, eventos });
                      }}
                      style={{
                        fontSize: "9px",
                        color: "var(--gold)",
                        fontWeight: "700",
                        paddingLeft: "4px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        padding: "2px 4px",
                        borderRadius: "4px",
                        textDecoration: "underline",
                        textDecorationStyle: "dotted",
                      }}
                    >
                      +{extra} mais
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nota de rodapé */}
      <p
        style={{
          fontSize: "11px",
          color: "var(--gray-mid)",
          textAlign: "center",
          marginTop: "12px",
        }}
      >
        Clica num evento para abrir a ficha completa.
      </p>

      {/* Popup — todos os eventos de um dia */}
      {popupDia && (
        <div
          onClick={() => setPopupDia(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 300,
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              boxShadow: "0 16px 48px rgba(0,0,0,0.18)",
              border: "1px solid var(--gold-light)",
              width: "100%",
              maxWidth: "360px",
              overflow: "hidden",
            }}
          >
            {/* Cabeçalho do popup */}
            <div
              style={{
                backgroundColor: "var(--gold)",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <p
                style={{
                  fontFamily: "Playfair Display, serif",
                  fontSize: "15px",
                  color: "white",
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {popupDia.dia} de {MESES[mes]}
              </p>
              <button
                onClick={() => setPopupDia(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: "18px",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "2px",
                  opacity: 0.85,
                }}
              >
                ✕
              </button>
            </div>

            {/* Lista de todos os eventos do dia */}
            <div
              style={{
                padding: "12px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {popupDia.eventos.map((s) => {
                const cores =
                  STATUS_CORES[s.status] || STATUS_CORES["Recebido"];
                const titulo = getTituloSubmissao(s, eventTypes);
                const tipo = getTipoNome(s, eventTypes);
                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      setPopupDia(null);
                      onSelectSubmission(s);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      backgroundColor: cores.bg,
                      border: `1px solid ${cores.border}`,
                      cursor: "pointer",
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.opacity = "0.75")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                  >
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: cores.texto,
                        margin: "0 0 2px 0",
                      }}
                    >
                      {titulo}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      {tipo && (
                        <span
                          style={{
                            fontSize: "10px",
                            color: cores.texto,
                            opacity: 0.75,
                          }}
                        >
                          {tipo}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: "10px",
                          padding: "1px 8px",
                          borderRadius: "999px",
                          backgroundColor: "white",
                          color: cores.texto,
                          border: `1px solid ${cores.border}`,
                          fontWeight: "500",
                        }}
                      >
                        {s.status}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                padding: "10px 12px 14px",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--gray-mid)",
                  margin: 0,
                }}
              >
                {popupDia.eventos.length}{" "}
                {popupDia.eventos.length === 1 ? "evento" : "eventos"} neste dia
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
