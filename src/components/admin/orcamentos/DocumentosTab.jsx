import { useState, useEffect } from "react";
import GerarOrcamento from "./GerarOrcamento";
import GerarContrato from "./GerarContrato";
import GerarProposta from "./GerarProposta";
import { formatarDataPT, formatarEuros } from "./orcamentoConfig";
import { listarDocumentos, apagarDocumento } from "../../../lib/documentos";
import { getResumoSubmissao } from "../../../lib/submissionFields";

// ============================================================
// DocumentosTab v3 — a Biblioteca de Documentos, e só ela.
//
// Os botões 💰/📃/🎨 do drawer deixaram de passar por aqui: vão à
// DocumentoEventoPage (pseudo-separador "documentoEvento" no
// AdminPage). Este separador é SEMPRE a biblioteca:
//
//   vista BIBLIOTECA (pesquisa, cartões com pastilha/cliente/valor/
//   "editado há X", apagar em 2 passos). A biblioteca é um ARQUIVO,
//   não uma checklist: mostra o que existe. Documentos nascem
//   exclusivamente na ficha do evento (DocumentoEventoPage) — um
//   documento sem evento seria um órfão (decisão da sessão da
//   biblioteca: opção A, sem "+ Novo documento").
//   ↔ vista EDITOR ("← Todos os documentos" + o gerador certo,
//   aberto por documentoId). Só UM gerador monta de cada vez —
//   a persistência é da BD e o flush-on-unmount do useDocumento
//   cobre saídas a meio da escrita.
// ============================================================
export default function DocumentosTab({
  ativo = true,
  onDadosMudaram,
  eventTypes = [],
}) {
  return (
    <ModoBiblioteca
      ativo={ativo}
      onDadosMudaram={onDadosMudaram}
      eventTypes={eventTypes}
    />
  );
}

// ------------------------------------------------------------
// Metadados dos tipos de documento (pastilhas da biblioteca).
// Cores alinhadas com a linguagem da app: orçamento = dourado (em
// conversa), contrato = verde (garantido), projecto = azul (em
// preparação). Afinam-se aqui num sítio só.
// ------------------------------------------------------------
const TIPOS_DOC = [
  {
    id: "orcamento",
    label: "Orçamento",
    pastilha: "ORÇAMENTO",
    cor: "#A07830",
    fundo: "#FBF4E4",
  },
  {
    id: "contrato",
    label: "Contrato",
    pastilha: "CONTRATO",
    cor: "#166534",
    fundo: "#DCFCE7",
  },
  {
    id: "proposta",
    label: "Projecto",
    pastilha: "PROJECTO",
    cor: "#1D4ED8",
    fundo: "#DBEAFE",
  },
];

const metaTipo = (id) => TIPOS_DOC.find((t) => t.id === id) || TIPOS_DOC[0];

// "editado há X" — tempo relativo curto, em PT
const tempoRelativo = (iso) => {
  if (!iso) return "";
  const seg = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seg < 60) return "editado agora mesmo";
  const min = Math.floor(seg / 60);
  if (min < 60) return `editado há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `editado há ${h} h`;
  const dias = Math.floor(h / 24);
  if (dias === 1) return "editado ontem";
  if (dias < 30) return `editado há ${dias} dias`;
  return `editado a ${formatarDataPT(iso.slice(0, 10))}`;
};

// O € do cartão: orçamento soma as linhas; contrato usa o valor;
// projecto não fala de dinheiro (é assunto do orçamento).
const valorDoc = (doc) => {
  const d = doc.dados || {};
  if (doc.tipo === "orcamento" && Array.isArray(d.linhas)) {
    const total = d.linhas.reduce(
      (soma, l) => soma + (Number(l.valor) || 0) * (Number(l.qtd) || 0),
      0,
    );
    return total > 0 ? total : null;
  }
  if (doc.tipo === "contrato") {
    const v = Number(d.valor);
    return Number.isFinite(v) && v > 0 ? v : null;
  }
  return null;
};

// Título do cartão: eventos usam o resumo canónico (getResumoSubmissao,
// como em toda a app); manuais usam o que a Nádia escreveu no documento.
const tituloDoc = (doc, eventTypes) => {
  if (doc.submissions) {
    return getResumoSubmissao(doc.submissions, eventTypes).titulo;
  }
  const d = doc.dados || {};
  return (
    d.cliente ||
    d.contraentes?.[0]?.nome ||
    "Documento manual"
  );
};

// Linha 2 do cartão: tipo de evento (do modelo, nos eventos; do que
// está escrito no documento, nos manuais) + data do evento se houver.
const subtituloDoc = (doc, eventTypes) => {
  const d = doc.dados || {};
  let tipoEvento = d.tipoEvento || "";
  if (doc.submissions) {
    const tipo = eventTypes?.find(
      (et) => et.id === doc.submissions.event_type_id,
    );
    tipoEvento = tipo?.nome || tipoEvento;
  }
  const dataEvento = doc.submissions?.data_evento || d.dataEvento || "";
  return [tipoEvento, dataEvento ? formatarDataPT(dataEvento) : ""]
    .filter(Boolean)
    .join(" · ");
};

// ------------------------------------------------------------
// ModoBiblioteca — biblioteca ↔ editor
// ------------------------------------------------------------
function ModoBiblioteca({ ativo, onDadosMudaram, eventTypes }) {
  const [vista, setVista] = useState("biblioteca"); // biblioteca | editor
  const [docAberto, setDocAberto] = useState(null); // { id, tipo }
  const [documentos, setDocumentos] = useState([]);
  const [aCarregar, setACarregar] = useState(true);
  const [pesquisa, setPesquisa] = useState("");
  const [confirmarApagar, setConfirmarApagar] = useState(null); // id do doc
  const [aApagar, setAApagar] = useState(false);

  const carregar = async () => {
    setACarregar(true);
    try {
      setDocumentos(await listarDocumentos());
    } catch (e) {
      console.error("Biblioteca: falha a listar documentos", e);
    }
    setACarregar(false);
  };

  // Primeira carga
  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Voltar ao separador Documentos re-lê a lista (o componente fica
  // sempre montado no AdminPage, por isso a montagem só acontece 1 vez)
  useEffect(() => {
    if (ativo && vista === "biblioteca") carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativo]);

  const abrirBiblioteca = () => {
    setVista("biblioteca");
    setDocAberto(null);
    setConfirmarApagar(null);
    carregar(); // o que se editou aparece já com o "editado há X" fresco
  };

  const abrirDocumento = (doc) => {
    setDocAberto({ id: doc.id, tipo: doc.tipo });
    setVista("editor");
  };

  const apagar = async (id) => {
    setAApagar(true);
    try {
      await apagarDocumento(id);
      setDocumentos((prev) => prev.filter((x) => x.id !== id));
      setConfirmarApagar(null);
    } catch (e) {
      console.error("Biblioteca: falha a apagar documento", e);
      alert("Não foi possível apagar o documento. Tenta novamente.");
    }
    setAApagar(false);
  };

  // ===== VISTA EDITOR =====
  if (vista === "editor" && docAberto) {
    return (
      <div>
        <button
          className="no-print"
          onClick={abrirBiblioteca}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: "600",
            border: "1.5px solid var(--gold)",
            color: "var(--gold-dark)",
            backgroundColor: "white",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          ← Todos os documentos
        </button>

        {docAberto.tipo === "orcamento" && (
          <GerarOrcamento
            documentoId={docAberto.id}
            ativo={ativo}
            onDadosMudaram={onDadosMudaram}
          />
        )}
        {docAberto.tipo === "contrato" && (
          <GerarContrato documentoId={docAberto.id} ativo={ativo} />
        )}
        {docAberto.tipo === "proposta" && (
          <GerarProposta documentoId={docAberto.id} ativo={ativo} />
        )}
      </div>
    );
  }

  // ===== VISTA BIBLIOTECA =====
  const termo = pesquisa.trim().toLowerCase();
  const filtrados = termo
    ? documentos.filter((doc) => {
        const alvo = [
          tituloDoc(doc, eventTypes),
          subtituloDoc(doc, eventTypes),
          metaTipo(doc.tipo).label,
        ]
          .join(" ")
          .toLowerCase();
        return alvo.includes(termo);
      })
    : documentos;

  return (
    <div>
      {/* Cabeçalho: pesquisa */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <input
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
          placeholder="Procurar por cliente, tipo de evento ou documento…"
          style={{
            flex: 1,
            minWidth: "220px",
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1.5px solid var(--gold-light)",
            fontSize: "13px",
            outline: "none",
            fontFamily: "Inter, sans-serif",
            boxSizing: "border-box",
            backgroundColor: "white",
          }}
        />
      </div>

      {/* Lista */}
      {aCarregar ? (
        <p style={{ fontSize: "13px", color: "var(--gray-mid)" }}>
          A carregar a biblioteca…
        </p>
      ) : filtrados.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            backgroundColor: "#FBF7EF",
            borderRadius: "16px",
            border: "1px dashed var(--gold-light)",
          }}
        >
          <p
            style={{
              fontSize: "14px",
              color: "var(--charcoal)",
              margin: "0 0 6px 0",
              fontFamily: "Playfair Display, serif",
            }}
          >
            {termo
              ? "Nenhum documento encontrado"
              : "A biblioteca está vazia"}
          </p>
          <p
            style={{
              fontSize: "12px",
              color: "var(--gray-mid)",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {termo
              ? "Tenta procurar por outro nome ou tipo."
              : "Abre um orçamento, contrato ou projecto a partir da ficha de um evento e ele fica guardado aqui."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "14px",
          }}
        >
          {filtrados.map((doc) => {
            const meta = metaTipo(doc.tipo);
            const valor = valorDoc(doc);
            const emConfirmacao = confirmarApagar === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => {
                  if (!emConfirmacao) abrirDocumento(doc);
                }}
                style={{
                  backgroundColor: "white",
                  borderRadius: "14px",
                  border: "1px solid var(--gold-light)",
                  padding: "16px",
                  cursor: emConfirmacao ? "default" : "pointer",
                  boxShadow: "0 1px 8px rgba(0,0,0,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {/* Pastilha + apagar */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      letterSpacing: "0.08em",
                      color: meta.cor,
                      backgroundColor: meta.fundo,
                      borderRadius: "999px",
                      padding: "3px 10px",
                    }}
                  >
                    {meta.pastilha}
                  </span>
                  {!emConfirmacao && (
                    <button
                      onClick={(e) => {
                        // A lição dos convites: sem isto, o clique no
                        // botão também abre o cartão.
                        e.stopPropagation();
                        setConfirmarApagar(doc.id);
                      }}
                      title="Apagar documento"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "var(--gray-mid)",
                        padding: "2px 4px",
                        lineHeight: 1,
                      }}
                    >
                      🗑
                    </button>
                  )}
                </div>

                {/* Título + subtítulo */}
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "var(--charcoal)",
                      margin: "0 0 2px 0",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tituloDoc(doc, eventTypes)}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--gray-mid)",
                      margin: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {subtituloDoc(doc, eventTypes) ||
                      (doc.submissions ? "" : "Documento manual")}
                  </p>
                </div>

                {/* Valor + editado há X (ou confirmação de apagar) */}
                {emConfirmacao ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginTop: "2px",
                    }}
                  >
                    <span
                      style={{ fontSize: "12px", color: "var(--charcoal)" }}
                    >
                      Apagar este documento?
                    </span>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          apagar(doc.id);
                        }}
                        disabled={aApagar}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          fontWeight: "600",
                          border: "none",
                          backgroundColor: "#DC2626",
                          color: "white",
                          cursor: aApagar ? "wait" : "pointer",
                        }}
                      >
                        {aApagar ? "…" : "Apagar"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmarApagar(null);
                        }}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "999px",
                          fontSize: "11px",
                          border: "1px solid var(--gold-light)",
                          backgroundColor: "white",
                          color: "var(--gray-mid)",
                          cursor: "pointer",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      gap: "8px",
                      marginTop: "2px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: "700",
                        color: "var(--gold-dark)",
                        fontFamily: "Playfair Display, serif",
                      }}
                    >
                      {valor !== null ? formatarEuros(valor) : ""}
                    </span>
                    <span
                      style={{ fontSize: "11px", color: "var(--gray-mid)" }}
                    >
                      {tempoRelativo(doc.updated_at)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}