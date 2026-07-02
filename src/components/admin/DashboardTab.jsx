import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";

const STATUS_OPTIONS = ["Recebido", "Em Preparação", "Confirmado", "Concluído"];

const STATUS_COLORS = {
  Recebido: { bg: "#FEF9EC", color: "#C9A84C", border: "#E8D5A3" },
  "Em Preparação": { bg: "#EFF6FF", color: "#3B82F6", border: "#BFDBFE" },
  Confirmado: { bg: "#F0FDF4", color: "#22C55E", border: "#BBF7D0" },
  Concluído: { bg: "#F9FAFB", color: "#6B7280", border: "#E5E7EB" },
};

const GOLD_SHADES = ["#C9A84C", "#A07830", "#E8D5A3", "#7A5C20", "#F5ECD7"];

// Estilos partilhados dos cards de KPI do dashboard
const kpiCardStyle = {
  backgroundColor: "white",
  borderRadius: "14px",
  padding: "20px 16px",
  textAlign: "center",
  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};
const kpiValueStyle = {
  fontSize: "34px",
  fontWeight: "600",
  margin: "0 0 4px 0",
  lineHeight: 1,
};
const kpiLabelStyle = {
  fontSize: "12px",
  color: "var(--gray-mid)",
  margin: 0,
  lineHeight: 1.4,
};

function ChartCard({ title, children }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "24px 20px",
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        marginBottom: "20px",
      }}
    >
      <p
        style={{
          fontSize: "12px",
          fontWeight: "600",
          color: "var(--gray-mid)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "20px",
          margin: "0 0 20px 0",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div
      style={{
        height: "160px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p style={{ color: "var(--gold-light)", fontSize: "13px" }}>
        Sem dados suficientes ainda
      </p>
    </div>
  );
}

// Formata uma data para PT-PT (ex: "12 de junho de 2025")
const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

// Tab Visão Geral (dashboard) — extraída do AdminPage sem mudar
// comportamento. É read-only: só lê submissions/invites/eventTypes e
// desenha. A única saída é onSelectSubmission ao clicar num evento.
//
// Props:
//   submissions         — lista de submissões (já normalizadas)
//   invites             — lista de convites
//   eventTypes          — tipos de evento
//   onSelectSubmission  — abre o drawer de um evento (setSelected no pai)
export default function DashboardTab({
  submissions,
  invites,
  eventTypes,
  onSelectSubmission,
}) {
  const eventosPorMes = () => {
    const counts = {};
    submissions.forEach((s) => {
      if (!s.data_evento) return;
      const mes = new Date(s.data_evento).toLocaleDateString("pt-PT", {
        month: "short",
        year: "2-digit",
      });
      counts[mes] = (counts[mes] || 0) + 1;
    });
    return Object.entries(counts).map(([mes, total]) => ({ mes, total }));
  };

  const estilosMaisPedidos = () => {
    const counts = {};
    submissions.forEach((s) => {
      (s.estilo_evento || []).forEach((e) => {
        counts[e] = (counts[e] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
  };

  const paletasMaisPopulares = () => {
    const counts = {};
    submissions.forEach((s) => {
      (s.paleta_cores || []).forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
  };

  // Total de convidados a servir (soma de todos os eventos ativos)
  const totalConvidados = () =>
    submissions
      .filter((s) => s.status !== "Concluído")
      .reduce((sum, s) => sum + (s.numero_convidados || 0), 0);

  // Taxa de resposta dos convites (preenchidos / total enviados)
  const taxaResposta = () => {
    if (!invites.length) return null;
    const preenchidos = invites.filter((i) => i.status === "Preenchido").length;
    return {
      preenchidos,
      total: invites.length,
      pct: Math.round((preenchidos / invites.length) * 100),
    };
  };

  // Próximo evento (o mais próximo no futuro, não concluído)
  const proximoEvento = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const futuros = submissions
      .filter((s) => s.data_evento && s.status !== "Concluído")
      .filter((s) => new Date(s.data_evento) >= hoje)
      .sort((a, b) => new Date(a.data_evento) - new Date(b.data_evento));
    return futuros[0] || null;
  };

  // Eventos que precisam de atenção: próximos 60 dias e ainda "Recebido"
  const eventosAtencao = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 60);
    return submissions
      .filter((s) => s.data_evento && s.status === "Recebido")
      .filter((s) => {
        const d = new Date(s.data_evento);
        return d >= hoje && d <= limite;
      })
      .sort((a, b) => new Date(a.data_evento) - new Date(b.data_evento));
  };

  // Dias até uma data (para etiquetas "faltam X dias")
  const diasAte = (date) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return Math.round((d - hoje) / (1000 * 60 * 60 * 24));
  };

  const pipelineData = STATUS_OPTIONS.map((status) => ({
    status,
    total: submissions.filter((s) => s.status === status).length,
  })).filter((p) => p.total > 0);

  return (
    <motion.div
      key="tab-dashboard"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* ===== ZONA 1 — O essencial ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
          marginBottom: "20px",
        }}
      >
        {/* Eventos ativos */}
        <div style={kpiCardStyle}>
          <p style={{ ...kpiValueStyle, color: "var(--gold)" }}>
            {submissions.filter((s) => s.status !== "Concluído").length}
          </p>
          <p style={kpiLabelStyle}>Eventos Activos</p>
        </div>

        {/* Total de convidados a servir */}
        <div style={kpiCardStyle}>
          <p style={{ ...kpiValueStyle, color: "#3B82F6" }}>
            {totalConvidados()}
          </p>
          <p style={kpiLabelStyle}>Convidados a Servir</p>
        </div>

        {/* Confirmados */}
        <div style={kpiCardStyle}>
          <p style={{ ...kpiValueStyle, color: "#22C55E" }}>
            {submissions.filter((s) => s.status === "Confirmado").length}
          </p>
          <p style={kpiLabelStyle}>Confirmados</p>
        </div>

        {/* Taxa de resposta dos convites */}
        <div style={kpiCardStyle}>
          {taxaResposta() ? (
            <>
              <p style={{ ...kpiValueStyle, color: "var(--gold-dark)" }}>
                {taxaResposta().pct}%
              </p>
              <p style={kpiLabelStyle}>
                Convites Preenchidos
                <br />
                <span style={{ fontSize: "10px", opacity: 0.7 }}>
                  {taxaResposta().preenchidos} de {taxaResposta().total}
                </span>
              </p>
            </>
          ) : (
            <>
              <p style={{ ...kpiValueStyle, color: "var(--gold-light)" }}>—</p>
              <p style={kpiLabelStyle}>Sem convites ainda</p>
            </>
          )}
        </div>
      </div>

      {/* Próximo evento — destaque */}
      {proximoEvento() && (
        <div
          onClick={() => onSelectSubmission(proximoEvento())}
          style={{
            backgroundColor: "var(--gold)",
            borderRadius: "16px",
            padding: "20px 24px",
            marginBottom: "28px",
            cursor: "pointer",
            boxShadow: "0 4px 20px rgba(201,168,76,0.3)",
            color: "white",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              margin: "0 0 8px 0",
              opacity: 0.85,
            }}
          >
            Próximo Evento
          </p>
          <p
            style={{
              fontSize: "20px",
              fontFamily: "Playfair Display, serif",
              margin: "0 0 6px 0",
            }}
          >
            {proximoEvento().nome_noivo} & {proximoEvento().nome_noiva}
          </p>
          <p style={{ fontSize: "13px", margin: 0, opacity: 0.95 }}>
            {formatDate(proximoEvento().data_evento)}
            {(() => {
              const dias = diasAte(proximoEvento().data_evento);
              if (dias === 0) return " · É hoje!";
              if (dias === 1) return " · Amanhã";
              return ` · Faltam ${dias} dias`;
            })()}
          </p>
        </div>
      )}

      {/* ===== ZONA 2 — A precisar de atenção ===== */}
      {eventosAtencao().length > 0 && (
        <div style={{ marginBottom: "28px" }}>
          <p
            style={{
              fontSize: "12px",
              fontWeight: "600",
              color: "var(--gray-mid)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              margin: "0 0 12px 4px",
            }}
          >
            A precisar de atenção
          </p>
          <div
            style={{
              backgroundColor: "#FEF9EC",
              borderRadius: "16px",
              padding: "8px",
              border: "1px solid var(--gold-light)",
            }}
          >
            {eventosAtencao().map((s, i) => {
              const dias = diasAte(s.data_evento);
              return (
                <div
                  key={s.id}
                  onClick={() => onSelectSubmission(s)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderBottom:
                      i < eventosAtencao().length - 1
                        ? "1px solid rgba(201,168,76,0.15)"
                        : "none",
                    cursor: "pointer",
                    gap: "12px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "var(--charcoal)",
                        margin: "0 0 2px 0",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.nome_noivo} & {s.nome_noiva}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--gray-mid)",
                        margin: 0,
                      }}
                    >
                      {formatDate(s.data_evento)}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "600",
                      color: dias <= 14 ? "#DC2626" : "var(--gold-dark)",
                      backgroundColor: "white",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {dias === 0
                      ? "Hoje"
                      : dias === 1
                        ? "Amanhã"
                        : `${dias} dias`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== ZONA 2.5 — Por tipo de evento ===== */}
      {(() => {
        // Cruza submissions com eventTypes para contar quantos eventos
        // existem por tipo — só mostra tipos com pelo menos 1 evento.
        // Tipos sem nenhum evento não aparecem (não polui o dashboard).
        const contagemPorTipo = eventTypes
          .map((et) => ({
            id: et.id,
            nome: et.nome,
            total: submissions.filter((s) => s.event_type_id === et.id).length,
          }))
          .filter((et) => et.total > 0)
          .sort((a, b) => b.total - a.total);

        if (contagemPorTipo.length === 0) return null;

        const totalEventos = contagemPorTipo.reduce((s, et) => s + et.total, 0);

        return (
          <div style={{ marginBottom: "20px" }}>
            <p
              style={{
                fontSize: "10px",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "var(--gray-mid)",
                margin: "0 0 12px 0",
              }}
            >
              Eventos por Tipo
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "10px",
              }}
            >
              {contagemPorTipo.map((et, i) => {
                const percentagem =
                  totalEventos > 0
                    ? Math.round((et.total / totalEventos) * 100)
                    : 0;
                const isPrincipal = i < 4; // destaque para os 4 com mais eventos

                return (
                  <div
                    key={et.id}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "14px",
                      padding: "16px 18px",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                      border: isPrincipal
                        ? "1px solid var(--gold-light)"
                        : "1px solid #F0EDE8",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "11px",
                        color: "var(--gray-mid)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        margin: "0 0 4px 0",
                        fontWeight: "500",
                      }}
                    >
                      {et.nome}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: "6px",
                        marginBottom: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: isPrincipal ? "28px" : "22px",
                          fontWeight: "700",
                          fontFamily: "Playfair Display, serif",
                          color: "var(--gold)",
                          lineHeight: 1,
                        }}
                      >
                        {et.total}
                      </span>
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--gray-mid)",
                        }}
                      >
                        {et.total === 1 ? "evento" : "eventos"}
                      </span>
                    </div>
                    {/* Barra de proporção */}
                    <div
                      style={{
                        height: "4px",
                        borderRadius: "999px",
                        backgroundColor: "#F5ECD7",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${percentagem}%`,
                          backgroundColor: "var(--gold)",
                          borderRadius: "999px",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: "10px",
                        color: "var(--gold-light)",
                        margin: "4px 0 0 0",
                        textAlign: "right",
                      }}
                    >
                      {percentagem}% do total
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ===== ZONA 3 — Tendências do negócio ===== */}

      {/* Eventos por mês */}
      <ChartCard title="Eventos por Mês">
        {eventosPorMes().length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={eventosPorMes()}
              margin={{ top: 24, right: 10, left: -20, bottom: 0 }}
            >
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 12, fill: "var(--gray-mid)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "var(--gray-mid)" }}
                axisLine={false}
                tickLine={false}
              />
              <Bar
                dataKey="total"
                fill="var(--gold)"
                radius={[6, 6, 0, 0]}
                name="Eventos"
                label={{
                  position: "top",
                  fontSize: 13,
                  fill: "var(--gold-dark)",
                  fontWeight: 600,
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Estilos mais pedidos */}
      <ChartCard title="Estilos Mais Pedidos">
        {estilosMaisPedidos().length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer
            width="100%"
            height={estilosMaisPedidos().length * 44 + 20}
          >
            <BarChart
              data={estilosMaisPedidos()}
              layout="vertical"
              margin={{ top: 0, right: 36, left: 10, bottom: 0 }}
            >
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="nome"
                width={130}
                tick={{ fontSize: 12, fill: "var(--charcoal)" }}
                axisLine={false}
                tickLine={false}
              />
              <Bar
                dataKey="valor"
                fill="var(--gold)"
                radius={[0, 6, 6, 0]}
                name="Pedidos"
                label={{
                  position: "right",
                  fontSize: 13,
                  fill: "var(--gold-dark)",
                  fontWeight: 600,
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Paletas mais populares */}
      <ChartCard title="Paletas Mais Populares">
        {paletasMaisPopulares().length === 0 ? (
          <EmptyChart />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            {paletasMaisPopulares().map((p, index) => {
              const max = paletasMaisPopulares()[0].valor;
              const pct = Math.round((p.valor / max) * 100);
              return (
                <div key={p.nome}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--charcoal)",
                      }}
                    >
                      {p.nome}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "var(--gold-dark)",
                      }}
                    >
                      {p.valor}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "8px",
                      borderRadius: "999px",
                      backgroundColor: "#F5ECD7",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: "999px",
                        backgroundColor:
                          GOLD_SHADES[index % GOLD_SHADES.length],
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>

      {/* Pipeline de estados — barras horizontais com valor visível */}
      <ChartCard title="Pipeline de Estados">
        {pipelineData.length === 0 ? (
          <EmptyChart />
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {STATUS_OPTIONS.map((status) => {
              const total = submissions.filter(
                (s) => s.status === status,
              ).length;
              const max = submissions.length || 1;
              const pct = Math.round((total / max) * 100);
              const colors = STATUS_COLORS[status];
              return (
                <div key={status}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--charcoal)",
                      }}
                    >
                      {status}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: colors.color,
                      }}
                    >
                      {total}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "8px",
                      borderRadius: "999px",
                      backgroundColor: "#F3F4F6",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: "999px",
                        backgroundColor: colors.color,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ChartCard>
    </motion.div>
  );
}
