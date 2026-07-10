import { useState, useEffect } from "react";
import {
  getClientes,
  getClienteComEventos,
  createEventoParaCliente,
} from "../../lib/clientes";
import { FASE_LABEL, FASE_COR } from "./faseConfig";
import FunilBoard from "./FunilBoard";

// ============================================================
// ClientesLista — a vista de Clientes: PESSOAS (não eventos), agora
// com duas vistas alternáveis:
//   • Lista  — cards de clientes → eventos de cada um (como sempre)
//   • Funil  — a esteira comercial por fases (FunilBoard)
//
// Clicar num evento (em qualquer vista) delega no onAbrirEvento
// (o SubmissionDrawer que já existe).
// ============================================================

const iniciais = (nome) =>
  (nome || "?")
    .split(/[\s&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");

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

// A fase "mais avançada" de uma pessoa, para a pastilha do card da
// lista: um cliente fechado sobrepõe-se a tudo; senão, o ponto mais
// adiantado da negociação; só "perdido" quando todos os eventos o são.
// Torna visível, sem cliques, quem é cliente e quem é interessado.
const faseDaPessoa = (c) => {
  const fases = (c.submissions || []).map((e) => e.fase).filter(Boolean);
  if (fases.length === 0) return null;
  for (const f of ["cliente", "contrato", "orcamento", "interessado"]) {
    if (fases.includes(f)) return f;
  }
  if (fases.every((f) => f === "perdido")) return "perdido";
  return null;
};

export default function ClientesLista({ eventTypes = [], onAbrirEvento }) {
  const [vista, setVista] = useState("lista"); // "lista" | "funil"
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [aberto, setAberto] = useState(null); // cliente com eventos
  const [busca, setBusca] = useState("");
  const [criandoEvento, setCriandoEvento] = useState(false);
  const [perguntandoFase, setPerguntandoFase] = useState(false);

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const data = await getClientes();
      setClientes(data);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível carregar os clientes.");
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirCliente = async (id) => {
    setPerguntandoFase(false);
    try {
      const c = await getClienteComEventos(id);
      setAberto(c);
    } catch (e) {
      console.error(e);
    }
  };

  const nomeTipo = (eventTypeId) => {
    const t = eventTypes.find((x) => x.id === eventTypeId);
    return t?.nome || "Evento";
  };

  const novoEvento = async (fase) => {
    if (!aberto) return;
    setCriandoEvento(true);
    setPerguntandoFase(false);
    try {
      await createEventoParaCliente(aberto.id, { fase });
      await abrirCliente(aberto.id); // recarrega os eventos
      await carregar(); // atualiza contagens na lista
    } catch (e) {
      console.error(e);
    }
    setCriandoEvento(false);
  };

  const filtrados = clientes.filter((c) => {
    const q = busca.trim().toLowerCase();
    if (!q) return true;
    return [c.nome, c.contacto, c.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  // Alternador Lista ↔ Funil — vive acima de tudo, nas duas vistas
  const alternador = (
    <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
      {[
        { id: "lista", label: "👥 Lista" },
        { id: "funil", label: "🧭 Funil" },
      ].map((v) => {
        const ativo = vista === v.id;
        return (
          <button
            key={v.id}
            onClick={() => setVista(v.id)}
            style={{
              padding: "8px 20px",
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
            {v.label}
          </button>
        );
      })}
    </div>
  );

  // ===== VISTA FUNIL =====
  if (vista === "funil") {
    return (
      <div>
        {alternador}
        <FunilBoard eventTypes={eventTypes} onAbrirEvento={onAbrirEvento} />
      </div>
    );
  }

  // ===== VISTA LISTA =====
  if (carregando) {
    return (
      <div>
        {alternador}
        <p style={{ color: "var(--gray-mid)", fontSize: "14px" }}>
          A carregar clientes...
        </p>
      </div>
    );
  }
  if (erro) {
    return (
      <div>
        {alternador}
        <p style={{ color: "#DC2626", fontSize: "14px" }}>{erro}</p>
      </div>
    );
  }

  return (
    <div>
      {alternador}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: aberto
            ? "repeat(auto-fit, minmax(300px, 1fr))"
            : "1fr",
          gap: "20px",
          alignItems: "start",
        }}
      >
        {/* ===== LISTA DE CLIENTES (pessoas) ===== */}
        <div>
          <input
            style={{
              width: "100%",
              padding: "11px 14px",
              borderRadius: "10px",
              border: "1.5px solid var(--gold-light)",
              fontSize: "13px",
              outline: "none",
              marginBottom: "14px",
              boxSizing: "border-box",
            }}
            placeholder="🔍 Procurar por nome, contacto ou email..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          {filtrados.length === 0 && (
            <p style={{ color: "var(--gray-mid)", fontSize: "13px" }}>
              Nenhum cliente encontrado.
            </p>
          )}

          {filtrados.map((c) => {
            const ativo = aberto?.id === c.id;
            const fase = faseDaPessoa(c);
            const corFase = fase ? FASE_COR[fase] : null;
            return (
              <div
                key={c.id}
                onClick={() => abrirCliente(c.id)}
                style={{
                  backgroundColor: "white",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  marginBottom: "10px",
                  border: ativo ? "2px solid var(--gold)" : "1px solid #F0EBE0",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  transition: "border 0.15s",
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    backgroundColor: "#FBF7EF",
                    border: "1px solid var(--gold-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Playfair Display, serif",
                    fontSize: "15px",
                    color: "var(--gold)",
                    flexShrink: 0,
                  }}
                >
                  {iniciais(c.nome)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "var(--charcoal)",
                      margin: 0,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.nome}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--gray-mid)",
                      margin: 0,
                    }}
                  >
                    {c.totalEventos}{" "}
                    {c.totalEventos === 1 ? "evento" : "eventos"}
                    {c.desdeAno ? ` · desde ${c.desdeAno}` : ""}
                  </p>
                </div>
                {corFase && (
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: "11px",
                      fontWeight: "600",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      backgroundColor: corFase.bg,
                      color: corFase.cor,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {FASE_LABEL[fase]}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* ===== CLIENTE ABERTO — os eventos dela ===== */}
        {aberto && (
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "14px",
              padding: "18px",
              border: "1px solid #F0EBE0",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              position: "sticky",
              top: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "6px",
              }}
            >
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  backgroundColor: "#FBF7EF",
                  border: "1px solid var(--gold-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Playfair Display, serif",
                  fontSize: "17px",
                  color: "var(--gold)",
                }}
              >
                {iniciais(aberto.nome)}
              </div>
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    fontFamily: "Playfair Display, serif",
                    color: "var(--charcoal)",
                    margin: 0,
                  }}
                >
                  {aberto.nome}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--gray-mid)",
                    margin: 0,
                  }}
                >
                  {[aberto.contacto, aberto.nif ? `NIF ${aberto.nif}` : null]
                    .filter(Boolean)
                    .join(" · ") || "sem contacto"}
                </p>
              </div>
              <button
                onClick={() => setAberto(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  color: "var(--gray-mid)",
                  cursor: "pointer",
                }}
                aria-label="Fechar"
              >
                ×
              </button>
            </div>

            <div
              style={{
                borderTop: "1px solid #F0EBE0",
                paddingTop: "12px",
                marginTop: "10px",
              }}
            >
              {aberto.eventos.length === 0 && (
                <p style={{ fontSize: "13px", color: "var(--gray-mid)" }}>
                  Ainda sem eventos.
                </p>
              )}
              {aberto.eventos.map((ev) => {
                const f = FASE_COR[ev.fase] || FASE_COR.interessado;
                return (
                  <div
                    key={ev.id}
                    onClick={() => onAbrirEvento && onAbrirEvento(ev)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      padding: "11px 13px",
                      backgroundColor: "#FBF7EF",
                      borderRadius: "10px",
                      marginBottom: "8px",
                      cursor: onAbrirEvento ? "pointer" : "default",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "var(--charcoal)",
                          margin: 0,
                        }}
                      >
                        {nomeTipo(ev.event_type_id)}
                      </p>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--gray-mid)",
                          margin: 0,
                        }}
                      >
                        {formatarData(ev.data_evento)}
                        {ev.local_evento ? ` · ${ev.local_evento}` : ""}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        padding: "3px 10px",
                        borderRadius: "999px",
                        backgroundColor: f.bg,
                        color: f.cor,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {FASE_LABEL[ev.fase] || ev.fase}
                    </span>
                  </div>
                );
              })}

              {perguntandoFase && !criandoEvento ? (
                <div
                  style={{
                    marginTop: "8px",
                    padding: "12px",
                    borderRadius: "10px",
                    border: "1.5px solid var(--gold-light)",
                    backgroundColor: "white",
                  }}
                >
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: "600",
                      color: "var(--charcoal)",
                      margin: "0 0 10px 0",
                    }}
                  >
                    Em que ponto está este evento?
                  </p>
                  <button
                    onClick={() => novoEvento("interessado")}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "600",
                      border: "1.5px solid #F0D9B5",
                      backgroundColor: "#FEF3E2",
                      color: "#B45309",
                      cursor: "pointer",
                      marginBottom: "8px",
                      textAlign: "left",
                    }}
                  >
                    🟡 Ainda a decidir
                    <span
                      style={{
                        display: "block",
                        fontWeight: "400",
                        fontSize: "11px",
                        marginTop: "2px",
                      }}
                    >
                      Vai precisar de orçamento
                    </span>
                  </button>
                  <button
                    onClick={() => novoEvento("cliente")}
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "600",
                      border: "1.5px solid #BBE5C8",
                      backgroundColor: "#DCFCE7",
                      color: "#166534",
                      cursor: "pointer",
                      marginBottom: "8px",
                      textAlign: "left",
                    }}
                  >
                    🟢 Já fechado
                    <span
                      style={{
                        display: "block",
                        fontWeight: "400",
                        fontSize: "11px",
                        marginTop: "2px",
                      }}
                    >
                      A cliente confirmou o evento
                    </span>
                  </button>
                  <button
                    onClick={() => setPerguntandoFase(false)}
                    style={{
                      width: "100%",
                      padding: "7px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      border: "none",
                      backgroundColor: "transparent",
                      color: "var(--gray-mid)",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setPerguntandoFase(true)}
                  disabled={criandoEvento}
                  style={{
                    width: "100%",
                    marginTop: "8px",
                    padding: "10px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: "600",
                    border: "1.5px solid var(--gold)",
                    color: criandoEvento ? "var(--gray-mid)" : "var(--gold)",
                    backgroundColor: "white",
                    cursor: criandoEvento ? "wait" : "pointer",
                  }}
                >
                  {criandoEvento
                    ? "A criar..."
                    : "+ Novo evento para esta cliente"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
