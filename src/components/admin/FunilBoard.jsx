import { useState, useEffect } from "react";
import { getEventosFunil, updateFase } from "../../lib/clientes";
import { getResumoSubmissao } from "../../lib/submissionFields";
import { formatarEuros } from "./orcamentos/orcamentoConfig";
import { FASE_LABEL, FASE_COR, FASES_BOARD, PROXIMA_FASE } from "./faseConfig";

// ============================================================
// FunilBoard — a esteira visual do funil comercial, dentro de Clientes.
// Colunas Interessado → Orçamento → Contrato → Cliente, com scroll
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

export default function FunilBoard({ eventTypes = [], onAbrirEvento }) {
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [mostrarPerdidos, setMostrarPerdidos] = useState(false);
  const [confirmandoPerda, setConfirmandoPerda] = useState(null); // id do evento
  const [atualizando, setAtualizando] = useState(null); // id do evento

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
    } catch (e) {
      console.error(e);
      alert("Não foi possível atualizar a fase. Tenta novamente.");
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
      {/* Filtro de perdidos */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "14px",
        }}
      >
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
          const daColuna = eventos.filter((e) => faseDe(e) === fase);
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
              </div>

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
              {aAtualizar ? "..." : `${FASE_LABEL[proxima]} →`}
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
