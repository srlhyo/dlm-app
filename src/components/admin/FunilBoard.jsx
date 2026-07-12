import { useState, useEffect } from "react";
import { getEventosFunil, updateFase } from "../../lib/clientes";
import { getResumoSubmissao } from "../../lib/submissionFields";
import { formatarEuros } from "./orcamentos/orcamentoConfig";
import {
  FASE_LABEL,
  FASE_COR,
  FASES_BOARD,
  FASES_POS_SINAL,
  PROXIMA_FASE,
  AVANCO_LABEL,
} from "./faseConfig";
import CaptacaoForm from "../captacao/CaptacaoForm";

// ============================================================
// FunilBoard — a esteira visual do funil comercial, dentro de Clientes.
// Colunas Interessado → Orçamento → Cliente → Projecto → Contrato,
// com scroll
// horizontal no telemóvel. Perdido NÃO é coluna (é saída): só aparece
// quando a Nádia liga "Ver perdidos".
//
// Interação por TOQUE, não drag-and-drop (decisão validada: DnD entre
// colunas com scroll horizontal é péssimo no telemóvel):
//   • tocar no corpo do card → abre o drawer do evento (onAbrirEvento)
//   • "FaseSeguinte →" → avança uma fase
//   • "perder" → confirmação inline → fase perdido
//   • na coluna Perdidos: "↩ Recuperar" → volta a interessado
// Todos os botões dos cards usam e.stopPropagation() (lição conhecida).
// ============================================================

const formatarData = (iso) => {
  if (!iso) return "sem data";
  const [a, m, d] = iso.split("-");
  const meses = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ];
  return `${Number(d)} ${meses[Number(m) - 1]} ${a}`;
};

// Soma o valor acordado de uma lista de eventos (quem não tem valor
// simplesmente não pesa — sem inventar zeros).
const somaValores = (lista) =>
  lista.reduce((acc, e) => acc + (Number(e.valor_acordado) || 0), 0);

export default function FunilBoard({
  eventTypes = [],
  onAbrirEvento,
  onDadosMudaram,
}) {
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [mostrarPerdidos, setMostrarPerdidos] = useState(false);
  const [confirmandoPerda, setConfirmandoPerda] = useState(null); // id do evento
  const [atualizando, setAtualizando] = useState(null); // id do evento
  const [novoInteressado, setNovoInteressado] = useState(false); // modal aberto
  const [avisoErro, setAvisoErro] = useState(null); // toast discreto (adeus alert)
  // Colunas VAZIAS colapsam em faixas finas (clicar expande); uma
  // coluna com eventos expande-se sozinha. Poupa o scroll horizontal.
  const [expandidas, setExpandidas] = useState({});

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await getEventosFunil();
      setEventos(data);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível carregar o funil.");
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  // Fase segura: eventos antigos sem fase (não devia haver, mas há BD
  // de teste) caem em "interessado" para nunca desaparecerem do funil.
  const faseDe = (ev) => (FASE_LABEL[ev.fase] ? ev.fase : "interessado");

  const mudarFase = async (ev, fase) => {
    setAtualizando(ev.id);
    try {
      await updateFase(ev.id, fase);
      setEventos((prev) =>
        prev.map((e) => (e.id === ev.id ? { ...e, fase } : e)),
      );
      if (onDadosMudaram) onDadosMudaram();
    } catch (e) {
      console.error(e);
      setAvisoErro(
        "Não foi possível atualizar a fase — verifica a ligação e as migrações.",
      );
      setTimeout(() => setAvisoErro(null), 4500);
    }
    setAtualizando(null);
    setConfirmandoPerda(null);
  };

  const nomeTipo = (eventTypeId) => {
    const t = eventTypes.find((x) => x.id === eventTypeId);
    return t?.nome || "Evento";
  };

  // O nome no card: o cliente (a pessoa que contrata); se o evento não
  // tiver cliente ligado, o título do resumo (dupla fonte).
  const nomeCard = (ev) =>
    ev.clientes?.nome || getResumoSubmissao(ev, eventTypes).titulo;

  if (carregando) {
    return (
      <p style={{ color: "var(--gray-mid)", fontSize: "14px" }}>
        A carregar o funil...
      </p>
    );
  }
  if (erro) {
    return <p style={{ color: "#DC2626", fontSize: "14px" }}>{erro}</p>;
  }

  const perdidos = eventos.filter((e) => faseDe(e) === "perdido");
  const colunas = mostrarPerdidos ? [...FASES_BOARD, "perdido"] : FASES_BOARD;

  return (
    <div>
      {/* ===== BARRA-RESUMO: o pulso financeiro do funil =====
          Em negociação = fases pré-sinal (dinheiro possível);
          Garantido = pós-sinal, sem Concluídos (a data está vendida).
          Lê exatamente o que o quadro mostra. */}
      {(() => {
        const preSinal = FASES_BOARD.filter(
          (fase) => !FASES_POS_SINAL.includes(fase),
        );
        const negociacao = eventos.filter((e) =>
          preSinal.includes(faseDe(e)),
        );
        const garantidos = eventos.filter(
          (e) =>
            FASES_POS_SINAL.includes(faseDe(e)) && e.status !== "Concluído",
        );
        const cartao = (rotulo, lista, corTexto, corFundo) => (
          <div
            style={{
              flex: "1 1 180px",
              backgroundColor: corFundo,
              borderRadius: "12px",
              padding: "10px 16px",
              border: "1px solid #F0EBE0",
            }}
          >
            <p
              style={{
                fontSize: "10px",
                fontWeight: "600",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: corTexto,
                margin: "0 0 2px 0",
              }}
            >
              {rotulo}
            </p>
            <p
              style={{
                fontSize: "17px",
                fontWeight: "700",
                color: corTexto,
                margin: 0,
              }}
            >
              {formatarEuros(somaValores(lista))}{" "}
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "400",
                  color: "var(--gray-mid)",
                }}
              >
                · {lista.length} {lista.length === 1 ? "evento" : "eventos"}
              </span>
            </p>
          </div>
        );
        return (
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              marginBottom: "14px",
            }}
          >
            {cartao(
              "Em negociação",
              negociacao,
              "var(--gold-dark)",
              "white",
            )}
            {cartao("Garantido (sinal pago)", garantidos, "#166534", "#F0FDF4")}
          </div>
        );
      })()}

      {avisoErro && (
        <div
          style={{
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#B91C1C",
            borderRadius: "10px",
            padding: "10px 14px",
            fontSize: "13px",
            marginBottom: "12px",
          }}
        >
          {avisoErro}
        </div>
      )}

      {/* Barra de topo: novo interessado (o caso Instagram: a Nádia
          transcreve a conversa) + filtro de perdidos */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          marginBottom: "14px",
        }}
      >
        <button
          onClick={() => setNovoInteressado(true)}
          style={{
            padding: "9px 18px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "600",
            border: "none",
            backgroundColor: "var(--gold)",
            color: "white",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(201,168,76,0.3)",
            whiteSpace: "nowrap",
          }}
        >
          + Novo interessado
        </button>
        <button
          onClick={() => setMostrarPerdidos((v) => !v)}
          style={{
            padding: "7px 16px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: mostrarPerdidos ? "600" : "500",
            border: `1.5px solid ${mostrarPerdidos ? "#9CA3AF" : "var(--gold-light)"}`,
            backgroundColor: mostrarPerdidos ? "#F3F4F6" : "white",
            color: "var(--gray-mid)",
            cursor: "pointer",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          {mostrarPerdidos ? "✓ " : ""}Ver perdidos ({perdidos.length})
        </button>
      </div>

      {/* Colunas com scroll horizontal (mobile-first) */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          paddingBottom: "10px",
          alignItems: "flex-start",
        }}
      >
        {colunas.map((fase) => {
          const f = FASE_COR[fase];
          const daColuna = eventos.filter((e) => {
            if (faseDe(e) !== fase) return false;
            // As colunas pós-sinal são o "presente", não o arquivo:
            // eventos já CONCLUÍDOS saem do funil (o histórico vive na
            // Logística, no Dashboard e na ficha da pessoa) — senão as
            // colunas cresciam para sempre. Fechados com data passada
            // mas NÃO concluídos ficam, de propósito: é sinal de atenção.
            if (FASES_POS_SINAL.includes(fase) && e.status === "Concluído")
              return false;
            return true;
          });
          // Coluna vazia e não expandida à mão → faixa fina vertical
          if (daColuna.length === 0 && !expandidas[fase]) {
            return (
              <button
                key={fase}
                onClick={() =>
                  setExpandidas((prev) => ({ ...prev, [fase]: true }))
                }
                title={`${FASE_LABEL[fase]} — sem eventos (clicar para expandir)`}
                style={{
                  flex: "0 0 44px",
                  alignSelf: "stretch",
                  minHeight: "190px",
                  backgroundColor: f.bg,
                  border: "none",
                  borderRadius: "14px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  padding: "12px 0",
                }}
              >
                <span
                  style={{
                    writingMode: "vertical-rl",
                    fontSize: "10px",
                    fontWeight: "700",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: f.cor,
                  }}
                >
                  {FASE_LABEL[fase]}
                </span>
                <span
                  style={{ fontSize: "12px", fontWeight: "700", color: f.cor }}
                >
                  0
                </span>
              </button>
            );
          }

          return (
            <div
              key={fase}
              style={{
                flex: "0 0 240px",
                backgroundColor: "#FBF7EF",
                borderRadius: "14px",
                padding: "12px",
                border: "1px solid #F0EBE0",
              }}
            >
              {/* Cabeçalho da coluna */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                  padding: "0 2px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    padding: "3px 10px",
                    borderRadius: "999px",
                    backgroundColor: f.bg,
                    color: f.cor,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {FASE_LABEL[fase]}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--gray-mid)",
                  }}
                >
                  {daColuna.length}
                </span>
                {daColuna.length === 0 && (
                  <button
                    onClick={() =>
                      setExpandidas((prev) => ({ ...prev, [fase]: false }))
                    }
                    title="Recolher a coluna"
                    style={{
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: "var(--gray-mid)",
                      padding: "0 2px",
                      lineHeight: 1,
                    }}
                  >
                    «
                  </button>
                )}
              </div>

              {/* Total da coluna em € (na de Aguarda Sinal, também os
                  sinais a receber). Sem valores acordados: um traço. */}
              {fase !== "perdido" && (
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: f.cor,
                    margin: "-4px 2px 8px 2px",
                  }}
                >
                  {(() => {
                    const total = somaValores(daColuna);
                    if (total <= 0) return "—";
                    return fase === "sinal"
                      ? `${formatarEuros(total)} · sinais: ${formatarEuros(total / 2)}`
                      : formatarEuros(total);
                  })()}
                </p>
              )}

              {daColuna.length === 0 && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--gray-mid)",
                    fontStyle: "italic",
                    textAlign: "center",
                    padding: "14px 0",
                    margin: 0,
                  }}
                >
                  Sem eventos nesta fase.
                </p>
              )}

              {daColuna.map((ev) => (
                <CardEvento
                  key={ev.id}
                  evento={ev}
                  fase={fase}
                  nome={nomeCard(ev)}
                  tipo={nomeTipo(ev.event_type_id)}
                  aAtualizar={atualizando === ev.id}
                  aConfirmarPerda={confirmandoPerda === ev.id}
                  onAbrir={() => onAbrirEvento && onAbrirEvento(ev)}
                  onAvancar={() => mudarFase(ev, PROXIMA_FASE[fase])}
                  onPedirPerda={() => setConfirmandoPerda(ev.id)}
                  onCancelarPerda={() => setConfirmandoPerda(null)}
                  onConfirmarPerda={() => mudarFase(ev, "perdido")}
                  onRecuperar={() => mudarFase(ev, "interessado")}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* Modal: novo interessado — reutiliza o CaptacaoForm da página
          pública (uma UI, duas portas). Ao criar, recarrega o funil. */}
      {novoInteressado && (
        <div
          onClick={() => setNovoInteressado(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
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
                carregar();
                if (onDadosMudaram) onDadosMudaram();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Card de um evento no funil
// ------------------------------------------------------------
function CardEvento({
  evento,
  fase,
  nome,
  tipo,
  aAtualizar,
  aConfirmarPerda,
  onAbrir,
  onAvancar,
  onPedirPerda,
  onCancelarPerda,
  onConfirmarPerda,
  onRecuperar,
}) {
  const proxima = PROXIMA_FASE[fase];
  const ehPerdido = fase === "perdido";
  const temValor =
    evento.valor_acordado !== null && evento.valor_acordado !== undefined;

  return (
    <div
      onClick={onAbrir}
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "12px",
        marginBottom: "8px",
        border: "1px solid #F0EBE0",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        cursor: "pointer",
        opacity: ehPerdido ? 0.85 : 1,
      }}
    >
      <p
        style={{
          fontSize: "13px",
          fontWeight: "600",
          color: ehPerdido ? "var(--gray-mid)" : "var(--charcoal)",
          margin: "0 0 2px 0",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {nome}
      </p>
      <p
        style={{
          fontSize: "12px",
          color: "var(--gray-mid)",
          margin: temValor ? "0 0 2px 0" : "0 0 10px 0",
        }}
      >
        {tipo} · {formatarData(evento.data_evento)}
      </p>
      {temValor && (
        <p
          style={{
            fontSize: "12px",
            fontWeight: "600",
            color: "var(--gold-dark)",
            margin: "0 0 10px 0",
          }}
        >
          {formatarEuros(evento.valor_acordado)}
          {fase === "sinal" &&
            ` · sinal (50%): ${formatarEuros(evento.valor_acordado / 2)}`}
        </p>
      )}
      {!temValor && fase === "sinal" && (
        <p
          style={{
            fontSize: "11px",
            fontStyle: "italic",
            color: "var(--gray-mid)",
            margin: "0 0 10px 0",
          }}
        >
          sem valor acordado — define-o no evento (✏️ Editar)
        </p>
      )}

      {/* Ações — dependem do estado */}
      {aConfirmarPerda ? (
        <div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--gray-mid)",
              margin: "0 0 8px 0",
            }}
          >
            Marcar como perdido?
          </p>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onConfirmarPerda();
              }}
              disabled={aAtualizar}
              style={{
                flex: 1,
                padding: "7px 8px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                border: "none",
                backgroundColor: "#DC2626",
                color: "white",
                cursor: aAtualizar ? "wait" : "pointer",
              }}
            >
              {aAtualizar ? "..." : "Sim, perdido"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancelarPerda();
              }}
              style={{
                flex: 1,
                padding: "7px 8px",
                borderRadius: "8px",
                fontSize: "12px",
                border: "1px solid #E5E7EB",
                backgroundColor: "white",
                color: "var(--gray-mid)",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : ehPerdido ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRecuperar();
          }}
          disabled={aAtualizar}
          style={{
            width: "100%",
            padding: "7px 8px",
            borderRadius: "8px",
            fontSize: "12px",
            fontWeight: "600",
            border: "1px solid #D1D5DB",
            backgroundColor: "white",
            color: "var(--gray-mid)",
            cursor: aAtualizar ? "wait" : "pointer",
          }}
        >
          {aAtualizar ? "A recuperar..." : "↩ Recuperar"}
        </button>
      ) : (
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {proxima && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAvancar();
              }}
              disabled={aAtualizar}
              style={{
                flex: 1,
                padding: "7px 8px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: "600",
                border: "1.5px solid var(--gold)",
                backgroundColor: "white",
                color: "var(--gold)",
                cursor: aAtualizar ? "wait" : "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {aAtualizar ? "..." : `${AVANCO_LABEL[fase] || FASE_LABEL[proxima]} →`}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPedirPerda();
            }}
            title="Marcar como perdido"
            style={{
              padding: "7px 8px",
              borderRadius: "8px",
              fontSize: "12px",
              border: "none",
              backgroundColor: "transparent",
              color: "var(--gray-mid)",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            perder
          </button>
        </div>
      )}
    </div>
  );
}