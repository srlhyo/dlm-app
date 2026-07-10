import { useState, useEffect } from "react";
import {
  getMensagens,
  createMensagem,
  updateMensagem,
  removerMensagem,
  resolverMensagem,
} from "../../lib/mensagens";

// ============================================================
// MensagensSheet — o painel de mensagens-tipo, aberto do drawer de
// um evento (💬 Mensagens). Cada mensagem aparece JÁ RESOLVIDA com
// os dados do evento ({SINAL} vira "138€", {LINK_INTERESSE} vira o
// link real...) e um toque em Copiar põe-na no clipboard, pronta a
// colar no Instagram.
//
// Gestão no próprio painel: tocar no texto abre a edição (com os
// placeholders crus, para ela os poder mexer), "+ Nova mensagem",
// e "remover" (soft-delete) com confirmação inline.
//
// props:
//   dados    — contexto do evento (getDadosParaDocumento) ou null
//   onFechar — fecha o painel (o drawer fica por baixo, intacto)
// ============================================================

// O MIOLO (lista + copiar + editor) — partilhado entre a folha do
// drawer e o separador Mensagens (biblioteca sem contexto de evento).
export function MensagensConteudo({ dados }) {
  const [mensagens, setMensagens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [copiadoId, setCopiadoId] = useState(null);
  const [editando, setEditando] = useState(null); // {id?, titulo, corpo} | null
  const [guardando, setGuardando] = useState(false);
  const [confirmandoRemover, setConfirmandoRemover] = useState(null); // id

  const carregar = async () => {
    setCarregando(true);
    setErro(null);
    try {
      setMensagens(await getMensagens());
    } catch (e) {
      console.error(e);
      setErro("Não foi possível carregar as mensagens.");
    }
    setCarregando(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const copiar = async (m) => {
    try {
      await navigator.clipboard.writeText(resolverMensagem(m.corpo, dados));
      setCopiadoId(m.id);
      setTimeout(() => setCopiadoId(null), 1600);
    } catch (e) {
      console.error(e);
      alert("Não foi possível copiar. Tenta novamente.");
    }
  };

  const guardar = async () => {
    if (!editando?.titulo?.trim() || !editando?.corpo?.trim()) return;
    setGuardando(true);
    try {
      if (editando.id) {
        await updateMensagem(editando.id, {
          titulo: editando.titulo.trim(),
          corpo: editando.corpo.trim(),
        });
      } else {
        await createMensagem(editando);
      }
      setEditando(null);
      await carregar();
    } catch (e) {
      console.error(e);
      alert("Não foi possível guardar. Tenta novamente.");
    }
    setGuardando(false);
  };

  const remover = async (id) => {
    try {
      await removerMensagem(id);
      setConfirmandoRemover(null);
      await carregar();
    } catch (e) {
      console.error(e);
      alert("Não foi possível remover. Tenta novamente.");
    }
  };

  return (
    <div>
        {carregando && (
          <p style={{ fontSize: "13px", color: "var(--gray-mid)" }}>
            A carregar mensagens...
          </p>
        )}
        {erro && <p style={{ fontSize: "13px", color: "#DC2626" }}>{erro}</p>}

        {/* Lista de mensagens resolvidas */}
        {!carregando &&
          !erro &&
          mensagens.map((m) => (
            <div
              key={m.id}
              style={{
                border: "1px solid #F0E6D0",
                backgroundColor: "#FBF7EF",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                }}
              >
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "var(--gold-dark)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: 0,
                  }}
                >
                  {m.titulo}
                </p>
                <button
                  onClick={() => copiar(m)}
                  style={{
                    flexShrink: 0,
                    padding: "5px 14px",
                    borderRadius: "999px",
                    fontSize: "12px",
                    fontWeight: "600",
                    border:
                      copiadoId === m.id
                        ? "1.5px solid var(--gold)"
                        : "none",
                    backgroundColor:
                      copiadoId === m.id ? "white" : "var(--gold)",
                    color: copiadoId === m.id ? "var(--gold-dark)" : "white",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {copiadoId === m.id ? "Copiado ✓" : "Copiar"}
                </button>
              </div>

              {/* Texto resolvido — tocar abre a edição (com placeholders crus) */}
              <p
                onClick={() =>
                  setEditando({ id: m.id, titulo: m.titulo, corpo: m.corpo })
                }
                title="Tocar para editar"
                style={{
                  fontSize: "13px",
                  color: "var(--charcoal)",
                  margin: 0,
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  cursor: "pointer",
                }}
              >
                {resolverMensagem(m.corpo, dados)}
              </p>

              {/* Remoção com confirmação inline */}
              <div style={{ marginTop: "8px", textAlign: "right" }}>
                {confirmandoRemover === m.id ? (
                  <span style={{ fontSize: "12px" }}>
                    <button
                      onClick={() => remover(m.id)}
                      style={{
                        border: "none",
                        background: "none",
                        color: "#DC2626",
                        fontWeight: "600",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Sim, remover
                    </button>
                    <button
                      onClick={() => setConfirmandoRemover(null)}
                      style={{
                        border: "none",
                        background: "none",
                        color: "var(--gray-mid)",
                        cursor: "pointer",
                        fontSize: "12px",
                        marginLeft: "10px",
                      }}
                    >
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmandoRemover(m.id)}
                    style={{
                      border: "none",
                      background: "none",
                      color: "var(--gray-mid)",
                      cursor: "pointer",
                      fontSize: "11px",
                    }}
                  >
                    remover
                  </button>
                )}
              </div>
            </div>
          ))}

        {/* Editor (nova ou existente) */}
        {editando ? (
          <div
            style={{
              border: "1.5px solid var(--gold-light)",
              borderRadius: "12px",
              padding: "14px",
              marginBottom: "10px",
              backgroundColor: "white",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "var(--gold)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                margin: "0 0 10px 0",
              }}
            >
              {editando.id ? "Editar mensagem" : "Nova mensagem"}
            </p>
            <input
              style={{ ...inputStyle, marginBottom: "8px" }}
              value={editando.titulo}
              onChange={(e) =>
                setEditando((p) => ({ ...p, titulo: e.target.value }))
              }
              placeholder="Título (ex: Follow-up)"
            />
            <textarea
              style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }}
              value={editando.corpo}
              onChange={(e) =>
                setEditando((p) => ({ ...p, corpo: e.target.value }))
              }
              placeholder="O texto da mensagem..."
            />
            <p
              style={{
                fontSize: "11px",
                color: "var(--gray-mid)",
                margin: "6px 0 10px 0",
                lineHeight: 1.5,
              }}
            >
              Placeholders que se preenchem sozinhos: {"{NOME}"},{" "}
              {"{TIPO_EVENTO}"}, {"{DATA}"}, {"{VALOR}"}, {"{SINAL}"} (50% do
              valor), {"{LINK_INTERESSE}"}.
            </p>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => setEditando(null)}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  border: "1.5px solid var(--gold-light)",
                  color: "var(--gray-mid)",
                  backgroundColor: "white",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={guardando}
                style={{
                  flex: 2,
                  padding: "9px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "600",
                  border: "none",
                  backgroundColor: guardando
                    ? "var(--gold-light)"
                    : "var(--gold)",
                  color: "white",
                  cursor: guardando ? "wait" : "pointer",
                }}
              >
                {guardando ? "A guardar..." : "✓ Guardar"}
              </button>
            </div>
          </div>
        ) : (
          !carregando && (
            <button
              onClick={() => setEditando({ titulo: "", corpo: "" })}
              style={{
                padding: "9px 16px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: "600",
                border: "1.5px solid var(--gold)",
                color: "var(--gold)",
                backgroundColor: "white",
                cursor: "pointer",
              }}
            >
              + Nova mensagem
            </button>
          )
        )}
    </div>
  );
}

// A folha que abre do drawer de um evento (💬): overlay + cabeçalho
// com o nome do cliente + o miolo partilhado.
export default function MensagensSheet({ dados, onFechar }) {
  return (
    <div
      onClick={onFechar}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70, // por cima do drawer (50)
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
          padding: "20px",
          width: "100%",
          maxWidth: "460px",
          border: "1px solid var(--gold-light)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
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
            Mensagens
            {dados?.nomeCliente ? ` · ${dados.nomeCliente}` : ""}
          </h3>
          <button
            onClick={onFechar}
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
          Já preenchidas com os dados deste evento — toca em Copiar e cola
          no Instagram.
        </p>
        <MensagensConteudo dados={dados} />
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "8px",
  border: "1.5px solid var(--gold-light)",
  fontSize: "13px",
  outline: "none",
  fontFamily: "Inter, sans-serif",
  boxSizing: "border-box",
  backgroundColor: "white",
};