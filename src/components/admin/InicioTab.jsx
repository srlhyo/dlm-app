import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { getResumoSubmissao } from "../../lib/submissionFields";
import CaptacaoForm from "../captacao/CaptacaoForm";

// ============================================================
// InicioTab — a porta de entrada da app (bloco 12b).
// Em vez de abrir numa lista, a app abre num assistente: cumprimenta
// a Nádia, mostra o próximo evento, diz-lhe O QUE PRECISA DELA hoje
// (interessados parados, sinais pendentes, formulários por preencher,
// eventos por preparar) e põe as duas ações mais frequentes a um
// clique. O sistema a trabalhar para ela, não ela a procurar nele.
//
// Read-only sobre os dados que o AdminPage já tem; as saídas são
// onAbrirEvento (drawer) e onNavegar (mudar de ecrã).
// ============================================================

const DIA_MS = 1000 * 60 * 60 * 24;

const hojeZero = () => {
  const h = new Date();
  h.setHours(0, 0, 0, 0);
  return h;
};

const diasAte = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - hojeZero()) / DIA_MS);
};

const diasDesde = (isoTimestamp) => {
  if (!isoTimestamp) return null;
  return Math.floor((Date.now() - new Date(isoTimestamp).getTime()) / DIA_MS);
};

const formatarDataLonga = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "long",
  });
};

const saudacao = () => {
  const h = new Date().getHours();
  if (h < 6) return "Boa noite";
  if (h < 13) return "Bom dia";
  if (h < 20) return "Boa tarde";
  return "Boa noite";
};

const hojePorExtenso = () => {
  const texto = new Date().toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

export default function InicioTab({
  submissions = [],
  invites = [],
  eventTypes = [],
  onAbrirEvento,
  onNavegar,
}) {
  const [novoInteressado, setNovoInteressado] = useState(false);

  // 3 colunas só quando há largura para elas (senão empilham)
  const [largura, setLargura] = useState(window.innerWidth);
  useEffect(() => {
    const aoRedimensionar = () => setLargura(window.innerWidth);
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, []);
  const tresColunas = largura >= 1100;

  const titulo = (s) => getResumoSubmissao(s, eventTypes).titulo;
  const vivos = submissions.filter((s) => s.fase !== "perdido");

  // ---- Próximo evento (com data futura, não concluído) ----
  const futuros = vivos
    .filter((s) => s.data_evento && s.status !== "Concluído")
    .filter((s) => diasAte(s.data_evento) >= 0)
    .sort((a, b) => new Date(a.data_evento) - new Date(b.data_evento));
  const proximo = futuros[0] || null;

  // ---- Esta semana: os próximos 7 dias com rosto ----
  const semana = futuros.filter((s) => diasAte(s.data_evento) <= 7);
  const nomeDoTipo = (s) =>
    eventTypes.find((et) => et.id === s.event_type_id)?.nome || null;
  const DIAS_ABREV = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
  const pastilhaDia = (iso) => {
    const d = new Date(iso);
    return { semana: DIAS_ABREV[d.getUTCDay()], numero: d.getUTCDate() };
  };

  // ---- Números do momento ----
  const estaSemana = futuros.filter((s) => diasAte(s.data_evento) <= 7).length;
  const emConversa = vivos.filter((s) =>
    ["interessado", "orcamento"].includes(s.fase),
  ).length;
  const aEsperaDoSinal = vivos.filter((s) => s.fase === "contrato").length;

  // ---- "A precisar de ti" — as regras do dia a dia ----
  // Cada alerta: { chave, texto, evento } — clicar abre o drawer.
  const alertas = [];

  // a) Interessados parados há 3+ dias (ainda sem orçamento enviado)
  vivos
    .filter((s) => s.fase === "interessado")
    .forEach((s) => {
      const dias = diasDesde(s.created_at);
      if (dias !== null && dias >= 3) {
        alertas.push({
          chave: `parado-${s.id}`,
          texto: `${titulo(s)} · interessada há ${dias} dias, ainda sem orçamento`,
          evento: s,
          peso: 2,
        });
      }
    });

  // b) Contrato entregue, sinal pendente
  vivos
    .filter((s) => s.fase === "contrato")
    .forEach((s) => {
      alertas.push({
        chave: `sinal-${s.id}`,
        texto: `${titulo(s)} · contrato entregue, sinal pendente`,
        evento: s,
        peso: 3,
      });
    });

  // c) Cliente fechado com evento próximo e formulário por preencher
  //    (não existe nenhum convite PREENCHIDO ligado a este evento)
  const idsComFormulario = new Set(
    invites.filter((i) => i.submission_id).map((i) => i.submission_id),
  );
  vivos
    .filter((s) => s.fase === "cliente" && s.data_evento)
    .forEach((s) => {
      const dias = diasAte(s.data_evento);
      if (
        dias !== null &&
        dias >= 0 &&
        dias <= 21 &&
        !idsComFormulario.has(s.id)
      ) {
        alertas.push({
          chave: `form-${s.id}`,
          texto: `${titulo(s)} · evento em ${dias === 0 ? "HOJE" : `${dias} dias`}, formulário por preencher`,
          evento: s,
          peso: 4,
        });
      }
    });

  // d) Evento em ≤7 dias ainda "Recebido" (por preparar)
  vivos
    .filter((s) => s.data_evento && s.status === "Recebido")
    .forEach((s) => {
      const dias = diasAte(s.data_evento);
      if (dias !== null && dias >= 0 && dias <= 7) {
        alertas.push({
          chave: `prep-${s.id}`,
          texto: `${titulo(s)} · evento em ${dias === 0 ? "HOJE" : `${dias} dias`} ainda por preparar`,
          evento: s,
          peso: 5,
        });
      }
    });

  // Mais urgente primeiro; máximo 6 para não virar lista infinita
  const alertasVisiveis = alertas.sort((a, b) => b.peso - a.peso).slice(0, 6);

  return (
    <motion.div
      key="tab-inicio"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Saudação */}
      <h2
        style={{
          fontSize: "28px",
          fontFamily: "Playfair Display, serif",
          fontWeight: "500",
          letterSpacing: "0.01em",
          color: "var(--charcoal)",
          margin: "0 0 2px 0",
        }}
      >
        {saudacao()}, Nádia
      </h2>
      <p
        style={{
          fontSize: "13px",
          color: "var(--gray-mid)",
          margin: "0 0 26px 0",
        }}
      >
        {hojePorExtenso()}
        {estaSemana > 0
          ? ` · ${estaSemana} ${estaSemana === 1 ? "evento" : "eventos"} esta semana`
          : ""}
      </p>

      {/* Próximo evento */}
      {proximo && (
        <div
          onClick={() => onAbrirEvento && onAbrirEvento(proximo)}
          style={{
            backgroundColor: "#FBF7EF",
            border: "1px solid var(--gold-light)",
            borderRadius: "14px",
            padding: "16px 20px",
            marginBottom: "18px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                fontSize: "11px",
                color: "var(--gold-dark)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                margin: "0 0 3px 0",
              }}
            >
              Próximo evento ·{" "}
              {(() => {
                const d = diasAte(proximo.data_evento);
                if (d === 0) return "é hoje!";
                if (d === 1) return "é amanhã";
                return `faltam ${d} dias`;
              })()}
            </p>
            <p
              style={{
                fontSize: "19px",
                fontWeight: "600",
                fontFamily: "Playfair Display, serif",
                color: "var(--charcoal)",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {titulo(proximo)}
              {" · "}
              {formatarDataLonga(proximo.data_evento)}
            </p>
          </div>
          <span
            style={{
              flexShrink: 0,
              fontSize: "13px",
              color: "var(--gold-dark)",
              border: "1px solid var(--gold)",
              borderRadius: "999px",
              padding: "6px 14px",
              whiteSpace: "nowrap",
            }}
          >
            Abrir evento →
          </span>
        </div>
      )}

      {/* Duas colunas: A precisar de ti + O momento */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: tresColunas
            ? "1.35fr 1fr 0.95fr"
            : "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "26px",
          alignItems: "start",
        }}
      >
        {/* A precisar de ti */}
        <div>
          <p style={tituloSeccao}>A precisar de ti</p>
          {alertasVisiveis.length === 0 ? (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "18px",
                border: "1px solid #F0E6D0",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--gray-mid)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Tudo em dia ✨
                <br />
                Nada a precisar de ti neste momento.
              </p>
            </div>
          ) : (
            alertasVisiveis.map((a) => (
              <div
                key={a.chave}
                onClick={() => onAbrirEvento && onAbrirEvento(a.evento)}
                style={{
                  backgroundColor: "white",
                  borderRadius: "12px",
                  padding: "12px 14px",
                  marginBottom: "8px",
                  border: "1px solid #F0E6D0",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    color: "var(--charcoal)",
                    lineHeight: 1.5,
                    display: "flex",
                    alignItems: "center",
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      backgroundColor: "var(--gold)",
                      marginRight: "10px",
                      verticalAlign: "middle",
                      flexShrink: 0,
                    }}
                  />
                  {a.texto}
                </span>
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: "13px",
                    color: "var(--gold-dark)",
                    whiteSpace: "nowrap",
                  }}
                >
                  ver →
                </span>
              </div>
            ))
          )}
        </div>

        {/* Esta semana — mini-agenda dos próximos 7 dias */}
        <div>
          <p style={tituloSeccao}>Esta semana</p>
          {semana.length === 0 ? (
            <div
              style={{
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "18px",
                border: "1px solid #F0E6D0",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--gray-mid)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Semana tranquila ✨
                <br />
                Sem eventos nos próximos 7 dias.
              </p>
            </div>
          ) : (
            <>
              {semana.map((s) => {
                const p = pastilhaDia(s.data_evento);
                const tipo = nomeDoTipo(s);
                return (
                  <div
                    key={`sem-${s.id}`}
                    onClick={() => onAbrirEvento && onAbrirEvento(s)}
                    style={{
                      backgroundColor: "white",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      marginBottom: "8px",
                      border: "1px solid #F0E6D0",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <span
                      style={{
                        flexShrink: 0,
                        width: "38px",
                        textAlign: "center",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          fontSize: "9px",
                          fontWeight: "600",
                          letterSpacing: "0.1em",
                          color: "var(--gold)",
                        }}
                      >
                        {p.semana}
                      </span>
                      <span
                        style={{
                          display: "block",
                          fontSize: "18px",
                          fontWeight: "600",
                          fontFamily: "Playfair Display, serif",
                          color: "var(--gold-dark)",
                          lineHeight: 1.1,
                        }}
                      >
                        {p.numero}
                      </span>
                    </span>
                    <span
                      style={{
                        fontSize: "14px",
                        color: "var(--charcoal)",
                        lineHeight: 1.4,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {titulo(s)}
                      {tipo ? ` · ${tipo}` : ""}
                    </span>
                  </div>
                );
              })}
              <button
                onClick={() => onNavegar && onNavegar("calendario")}
                style={{
                  width: "100%",
                  padding: "9px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: "600",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  border: "none",
                  backgroundColor: "transparent",
                  color: "var(--gold-dark)",
                  cursor: "pointer",
                }}
              >
                Ver a agenda completa →
              </button>
            </>
          )}
        </div>

        {/* O momento + ações rápidas */}
        <div>
          <p style={tituloSeccao}>O momento</p>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "8px" }}
          >
            <CartaoNumero
              numero={emConversa}
              legenda={
                emConversa === 1
                  ? "interessado em conversa"
                  : "interessados em conversa"
              }
              onClick={() => onNavegar && onNavegar("clientes")}
            />
            <CartaoNumero
              numero={aEsperaDoSinal}
              legenda="à espera do sinal"
              onClick={() => onNavegar && onNavegar("clientes")}
            />
            <button
              onClick={() => setNovoInteressado(true)}
              style={{
                padding: "13px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: "none",
                backgroundColor: "var(--gold)",
                color: "white",
                cursor: "pointer",
                marginTop: "6px",
              }}
            >
              + Novo interessado
            </button>
            <button
              onClick={() => onNavegar && onNavegar("calendario")}
              style={{
                padding: "13px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                border: "1px solid var(--gold)",
                backgroundColor: "white",
                color: "var(--gold-dark)",
                cursor: "pointer",
              }}
            >
              + Nova reserva
            </button>
          </div>
        </div>
      </div>

      {/* Modal de novo interessado — o mesmo CaptacaoForm das outras
          portas (uma UI, quatro portas 😄) */}
      {novoInteressado && (
        <div
          onClick={() => setNovoInteressado(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "24px 16px",
            overflowY: "auto",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "22px 20px",
              width: "100%",
              maxWidth: "440px",
              border: "1px solid var(--gold-light)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "4px",
              }}
            >
              <h3
                style={{
                  fontSize: "17px",
                  fontFamily: "Playfair Display, serif",
                  color: "var(--charcoal)",
                  margin: 0,
                }}
              >
                Novo interessado
              </h3>
              <button
                onClick={() => setNovoInteressado(false)}
                aria-label="Fechar"
                style={{
                  fontSize: "18px",
                  color: "var(--gray-mid)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--gray-mid)",
                margin: "0 0 16px 0",
              }}
            >
              Transcreve o que a pessoa te disse na conversa.
            </p>
            <CaptacaoForm
              textoBotao="Criar interessado"
              onSubmetido={() => {
                setNovoInteressado(false);
                if (onNavegar) onNavegar("clientes");
              }}
            />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function CartaoNumero({ numero, legenda, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "12px 16px",
        border: "1px solid #F0E6D0",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <p
        style={{
          fontSize: "24px",
          fontWeight: "600",
          color: "var(--gold-dark)",
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {numero}
      </p>
      <p style={{ fontSize: "13px", color: "var(--gray-mid)", margin: 0 }}>
        {legenda}
      </p>
    </div>
  );
}

const tituloSeccao = {
  fontSize: "12px",
  fontWeight: "600",
  color: "var(--gray-mid)",
  textTransform: "uppercase",
  letterSpacing: "0.18em",
  margin: "0 0 12px 0",
};