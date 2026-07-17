import { useState, useMemo, useRef, useEffect } from "react";
import { useCampoDocumento as useRascunho } from "./DocumentoProvider";
import logoUrl from "../../../assets/logo.png";
import { uploadImagemReferencia } from "../../../lib/captacao";
import { guardarValorAcordado } from "../../../lib/clientes";
import {
  CATALOGO_SERVICOS,
  CONDICOES_ORCAMENTO,
  NOTA_RODAPE_ORCAMENTO,
  VALIDADE_ORCAMENTO_DIAS,
  formatarEuros,
  formatarDataPT,
} from "./orcamentoConfig";

// Substitui {N} pelo nº de lugares (ou remove o marcador se vazio)
const resolverDescricao = (template, lugares) => {
  if (!template) return "";
  if (!template.includes("{N}")) return template;
  const n = String(lugares || "").trim();
  return n ? template.replace("{N}", n) : template.replace("{N}", "___");
};

// ============================================================
// GerarOrcamento — formulário de dados do evento + linhas de serviço,
// e pré-visualização imprimível que replica o template da Nádia.
// A geração de PDF é via window.print() (só a área do documento imprime).
//
// prefill (opcional) — dados do evento vindos do getDadosParaDocumento
// (botão 💰 no drawer do evento). Alimenta só os useState iniciais:
// o componente é remontado pelo AdminPage (via key) quando o contexto
// muda, por isso não precisa de useEffect. Tudo continua editável.
// ============================================================

let seqLinha = 0;
const novaLinha = (base = {}) => ({
  uid: `l_${Date.now()}_${seqLinha++}`,
  descricao: "",
  inclui: [],
  qtd: 1,
  valor: "",
  lugares: "", // nº de lugares (só para serviços que escalam com lugares)
  temLugares: false,
  ...base,
});

export default function GerarOrcamento({
  prefill = null,
  ativo = true,
  onDadosMudaram,
}) {
  // Rascunho persistente: cada documento (evento ou manual) tem o seu
  const rid = `orcamento:${prefill?.submissionId || "manual"}`;
  // Dados do cliente/evento — pré-preenchidos quando se chega de um
  // evento; senão, os defaults manuais de sempre.
  const [cliente, setCliente] = useRascunho(`${rid}:cliente`, prefill?.nomeCliente || "");
  const [tipoEvento, setTipoEvento] = useRascunho(`${rid}:tipoEvento`, 
    prefill ? prefill.tipoEvento || "" : "Casamento",
  );
  const [dataEvento, setDataEvento] = useRascunho(`${rid}:dataEvento`, prefill?.dataEvento || "");
  const [local, setLocal] = useRascunho(`${rid}:local`, prefill?.local || "");
  const [subtitulo, setSubtitulo] = useRascunho(`${rid}:subtitulo`, ""); // linha opcional (ex: "Decoração desenvolvida...")

  // Linhas de serviço
  const [linhas, setLinhas] = useRascunho(`${rid}:linhas`, [novaLinha()]);

  // Imagens de referência DO CLIENTE — pré-preenchidas da captação;
  // a Nádia pode remover ou juntar as que chegaram por Instagram.
  // Entram no PDF como páginas de referências, a seguir ao orçamento.
  const [imagens, setImagens] = useRascunho(`${rid}:imagens`, prefill?.imagensReferencia || []);
  const [carregandoImg, setCarregandoImg] = useState(false);
  // Guardar o total como valor acordado do evento (alimenta o funil)
  const [aGuardarValor, setAGuardarValor] = useState(false);
  const [valorGuardado, setValorGuardado] = useState(false);
  const inputImagens = useRef(null);

  const adicionarImagens = async (e) => {
    const ficheiros = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/"),
    );
    e.target.value = "";
    if (ficheiros.length === 0) return;
    setCarregandoImg(true);
    try {
      const novas = [];
      for (const f of ficheiros) {
        novas.push(await uploadImagemReferencia(f));
      }
      setImagens((prev) => [...prev, ...novas]);
    } catch (err) {
      console.error(err);
      alert("Não foi possível carregar a imagem. Tenta novamente.");
    }
    setCarregandoImg(false);
  };

  const removerImagem = (idx) =>
    setImagens((prev) => prev.filter((_, i) => i !== idx));

  const hoje = new Date().toISOString().slice(0, 10);

  const total = useMemo(
    () =>
      linhas.reduce((soma, l) => {
        const v = Number(l.valor) || 0;
        const q = Number(l.qtd) || 0;
        return soma + v * q;
      }, 0),
    [linhas],
  );

  // Se o total mudar depois de guardado, volta a pedir para guardar
  useEffect(() => {
    setValorGuardado(false);
  }, [total]);


  const atualizarLinha = (uid, campos) =>
    setLinhas((prev) =>
      prev.map((l) => (l.uid === uid ? { ...l, ...campos } : l)),
    );

  const escolherServico = (uid, servicoId) => {
    const serv = CATALOGO_SERVICOS.find((s) => s.id === servicoId);
    if (!serv) return;
    if (serv.ehLivre) {
      atualizarLinha(uid, {
        servicoId,
        descricao: "",
        inclui: [],
        temLugares: false,
      });
      return;
    }
    // Se o serviço escala com lugares, a descrição resolve-se com o nº atual.
    const linha = linhas.find((l) => l.uid === uid);
    const lugares = linha?.lugares || "";
    atualizarLinha(uid, {
      servicoId,
      descricao: resolverDescricao(serv.descricaoTemplate, lugares),
      descricaoTemplate: serv.descricaoTemplate,
      inclui: [...serv.inclui],
      temLugares: serv.temLugares,
    });
  };

  // Substitui {N} pelo nº de lugares na descrição
  const atualizarLugares = (uid, lugares) => {
    const linha = linhas.find((l) => l.uid === uid);
    if (!linha) return;
    const template = linha.descricaoTemplate || linha.descricao;
    atualizarLinha(uid, {
      lugares,
      descricao: resolverDescricao(template, lugares),
    });
  };

  const removerLinha = (uid) =>
    setLinhas((prev) => prev.filter((l) => l.uid !== uid));

  // Durante a impressão o browser usa o <title> da app nos cabeçalhos;
  // trocamo-lo temporariamente para o nome certo (e o @page margin 0
  // no CSS elimina os cabeçalhos por completo — cinto e suspensórios).
  const imprimir = () => {
    const tituloAnterior = document.title;
    document.title = `Orçamento — ${cliente || "Do Luxo à Mesa"}`;
    window.print();
    document.title = tituloAnterior;
  };

  return (
    <div>
      {/* ===== Estilos de impressão =====
          @page margin 0 elimina os cabeçalhos/rodapés automáticos do
          browser (título + URL); as margens passam a ser o padding dos
          próprios "cartões-página". Cada imagem de referência é uma
          página inteira (.pagina-ref). */}
      {ativo && (
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .area-impressao, .area-impressao * { visibility: visible; }
          .area-impressao { position: absolute; left: 0; top: 0; width: 100%; }
          .orcamento-doc {
            box-shadow: none !important; border: none !important;
            border-radius: 0 !important; max-width: none !important;
            margin: 0 !important; padding: 1.5cm !important;
          }
          .pagina-ref {
            page-break-before: always;
            height: 26.5cm; width: 100%;
            margin: 0 !important; max-width: none !important;
            padding: 1.5cm; box-sizing: border-box;
            display: flex; align-items: center; justify-content: center;
            box-shadow: none !important; border-radius: 0 !important;
          }
          .pagina-ref img { max-width: 100% !important; max-height: 100% !important; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
      )}

      <div
        className="no-print"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
          marginBottom: "24px",
        }}
      >
        {/* ===== COLUNA ESQUERDA: FORMULÁRIO ===== */}
        <div>
          <h3
            style={{
              fontSize: "15px",
              fontFamily: "Playfair Display, serif",
              color: "var(--charcoal)",
              margin: "0 0 16px 0",
            }}
          >
            Dados do orçamento
          </h3>

          <Campo label="Cliente">
            <input
              style={inputStyle}
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="ex: Brenda Lorrana"
            />
          </Campo>

          <div style={{ display: "flex", gap: "12px" }}>
            <Campo label="Tipo de evento" flex={1}>
              <input
                style={inputStyle}
                value={tipoEvento}
                onChange={(e) => setTipoEvento(e.target.value)}
                placeholder="ex: Casamento"
              />
            </Campo>
            <Campo label="Data do evento" flex={1}>
              <input
                type="date"
                style={inputStyle}
                value={dataEvento}
                onChange={(e) => setDataEvento(e.target.value)}
              />
            </Campo>
          </div>

          <Campo label="Local">
            <input
              style={inputStyle}
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="ex: Guia Lounge Cascais"
            />
          </Campo>

          <Campo label="Subtítulo (opcional)">
            <input
              style={inputStyle}
              value={subtitulo}
              onChange={(e) => setSubtitulo(e.target.value)}
              placeholder="ex: Decoração desenvolvida dentro da estética Do Luxo à Mesa."
            />
          </Campo>

          <Campo label="Imagens de referência do cliente">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {imagens.map((url, i) => (
                <div key={url + i} style={{ position: "relative" }}>
                  <img
                    src={url}
                    alt={`Referência ${i + 1}`}
                    style={{
                      width: "58px",
                      height: "58px",
                      objectFit: "cover",
                      borderRadius: "10px",
                      border: "1px solid var(--gold-light)",
                      display: "block",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => removerImagem(i)}
                    aria-label="Remover imagem"
                    style={{
                      position: "absolute",
                      top: "-6px",
                      right: "-6px",
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      border: "none",
                      backgroundColor: "var(--charcoal)",
                      color: "white",
                      fontSize: "10px",
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => inputImagens.current?.click()}
                disabled={carregandoImg}
                aria-label="Adicionar imagens"
                style={{
                  width: "58px",
                  height: "58px",
                  borderRadius: "10px",
                  border: "1.5px dashed var(--gold)",
                  backgroundColor: "white",
                  color: "var(--gold)",
                  fontSize: "20px",
                  cursor: carregandoImg ? "wait" : "pointer",
                }}
              >
                {carregandoImg ? "…" : "+"}
              </button>
            </div>
            <input
              ref={inputImagens}
              type="file"
              accept="image/*"
              multiple
              onChange={adicionarImagens}
              style={{ display: "none" }}
            />
          </Campo>

          <h3
            style={{
              fontSize: "15px",
              fontFamily: "Playfair Display, serif",
              color: "var(--charcoal)",
              margin: "24px 0 12px 0",
            }}
          >
            Serviços
          </h3>

          {linhas.map((l, idx) => (
            <LinhaServicoEditor
              key={l.uid}
              linha={l}
              indice={idx + 1}
              podeRemover={linhas.length > 1}
              onEscolherServico={(sid) => escolherServico(l.uid, sid)}
              onAtualizar={(campos) => atualizarLinha(l.uid, campos)}
              onAtualizarLugares={(n) => atualizarLugares(l.uid, n)}
              onRemover={() => removerLinha(l.uid)}
            />
          ))}

          <button
            onClick={() => setLinhas((prev) => [...prev, novaLinha()])}
            style={{
              marginTop: "8px",
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
            + Adicionar linha
          </button>
        </div>

        {/* ===== COLUNA DIREITA: dica + imprimir ===== */}
        <div>
          <div
            style={{
              backgroundColor: "#FBF7EF",
              borderRadius: "12px",
              padding: "18px",
              border: "1px solid var(--gold-light)",
              position: "sticky",
              top: "16px",
            }}
          >
            <p
              style={{
                fontSize: "13px",
                color: "var(--charcoal)",
                margin: "0 0 6px 0",
                fontWeight: "600",
              }}
            >
              Total: {formatarEuros(total)}
            </p>
            <p
              style={{
                fontSize: "12px",
                color: "var(--gray-mid)",
                margin: "0 0 16px 0",
                lineHeight: 1.5,
              }}
            >
              A pré-visualização à direita/abaixo é exactamente o que sai
              impresso. Confere e carrega em imprimir para guardar como PDF.
            </p>
            <button
              onClick={imprimir}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: "600",
                border: "none",
                backgroundColor: "var(--gold)",
                color: "white",
                cursor: "pointer",
              }}
            >
              🖨 Imprimir / Guardar PDF
            </button>
            {prefill?.submissionId && (
              <button
                onClick={async () => {
                  setAGuardarValor(true);
                  try {
                    await guardarValorAcordado(prefill.submissionId, total);
                    setValorGuardado(true);
                    if (onDadosMudaram) onDadosMudaram();
                  } catch (e) {
                    console.error(e);
                    alert("Não foi possível guardar o valor. Tenta novamente.");
                  }
                  setAGuardarValor(false);
                }}
                disabled={aGuardarValor || total <= 0}
                style={{
                  width: "100%",
                  marginTop: "8px",
                  padding: "10px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  border: valorGuardado
                    ? "1.5px solid #16A34A"
                    : "1.5px solid var(--gold)",
                  backgroundColor: valorGuardado ? "#DCFCE7" : "white",
                  color: valorGuardado ? "#166534" : "var(--gold-dark)",
                  cursor: aGuardarValor ? "wait" : "pointer",
                }}
              >
                {aGuardarValor
                  ? "A guardar..."
                  : valorGuardado
                    ? "✓ Valor guardado no evento"
                    : `💾 Guardar ${total}€ como valor acordado`}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== PRÉ-VISUALIZAÇÃO / ÁREA IMPRIMÍVEL =====
          O orçamento é um cartão-página; cada imagem de referência é
          OUTRO cartão-página abaixo (a divisão visível no ecrã é a
          mesma divisão de páginas do PDF). Sem imagens, nada muda. */}
      <div className="area-impressao">
        <OrcamentoDocumento
          cliente={cliente}
          tipoEvento={tipoEvento}
          dataEvento={dataEvento}
          local={local}
          subtitulo={subtitulo}
          linhas={linhas}
          total={total}
          dataEmissao={hoje}
        />
        {imagens.map((url, i) => (
          <div
            key={url + i}
            className="pagina-ref"
            style={{
              backgroundColor: "white",
              maxWidth: "800px",
              margin: "24px auto 0",
              padding: "48px 56px",
              boxShadow: "0 2px 24px rgba(0,0,0,0.08)",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={url}
              alt={`Referência do cliente ${i + 1}`}
              style={{
                maxWidth: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: "4px",
                display: "block",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Editor de uma linha de serviço
// ------------------------------------------------------------
function LinhaServicoEditor({
  linha,
  indice,
  podeRemover,
  onEscolherServico,
  onAtualizar,
  onAtualizarLugares,
  onRemover,
}) {
  return (
    <div
      style={{
        backgroundColor: "#FBF7EF",
        borderRadius: "12px",
        padding: "14px",
        marginBottom: "12px",
        border: "1px solid #F0E6D0",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: "700",
            color: "var(--gold)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Linha {indice}
        </span>
        {podeRemover && (
          <button
            onClick={onRemover}
            style={{
              background: "none",
              border: "none",
              color: "#DC2626",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            remover
          </button>
        )}
      </div>

      <select
        value={linha.servicoId || ""}
        onChange={(e) => onEscolherServico(e.target.value)}
        style={{ ...inputStyle, marginBottom: "8px" }}
      >
        <option value="">Escolher serviço...</option>
        {CATALOGO_SERVICOS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.ehLivre ? "— Linha livre —" : s.descricaoTemplate || s.id}
          </option>
        ))}
      </select>

      {linha.temLugares && (
        <div style={{ marginBottom: "8px" }}>
          <label style={miniLabel}>Nº de lugares</label>
          <input
            type="number"
            min="1"
            style={inputStyle}
            value={linha.lugares}
            onChange={(e) => onAtualizarLugares(e.target.value)}
            placeholder="ex: 60"
          />
        </div>
      )}

      <input
        style={{ ...inputStyle, marginBottom: "8px" }}
        value={linha.descricao}
        onChange={(e) => onAtualizar({ descricao: e.target.value })}
        placeholder="Descrição da linha"
      />

      {linha.inclui.length > 0 && (
        <textarea
          style={{
            ...inputStyle,
            marginBottom: "8px",
            minHeight: "70px",
            resize: "vertical",
          }}
          value={linha.inclui.join("\n")}
          onChange={(e) => onAtualizar({ inclui: e.target.value.split("\n") })}
          placeholder="Um item por linha (aparece como • no Inclui:)"
        />
      )}

      <div style={{ display: "flex", gap: "8px" }}>
        <div style={{ flex: "0 0 70px" }}>
          <label style={miniLabel}>Qtd</label>
          <input
            type="number"
            min="1"
            style={inputStyle}
            value={linha.qtd}
            onChange={(e) => onAtualizar({ qtd: e.target.value })}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={miniLabel}>Valor (€)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            style={inputStyle}
            value={linha.valor}
            onChange={(e) => onAtualizar({ valor: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// O DOCUMENTO — replica o template do orçamento da Nádia
// ------------------------------------------------------------
function OrcamentoDocumento({
  cliente,
  tipoEvento,
  dataEvento,
  local,
  subtitulo,
  linhas,
  total,
  dataEmissao,
}) {
  return (
    <div
      className="orcamento-doc"
      style={{
        backgroundColor: "white",
        maxWidth: "800px",
        margin: "0 auto",
        padding: "48px 56px",
        boxShadow: "0 2px 24px rgba(0,0,0,0.08)",
        borderRadius: "4px",
        fontFamily: "Inter, sans-serif",
        color: "#2A2A2A",
      }}
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "24px",
          borderBottom: "2px solid var(--gold)",
          paddingBottom: "20px",
          marginBottom: "28px",
        }}
      >
        <div style={{ flex: "0 0 auto" }}>
          <img
            src={logoUrl}
            alt="Do Luxo à Mesa"
            style={{ width: "110px", height: "auto", display: "block" }}
          />
        </div>
        <div
          style={{
            flex: 1,
            borderLeft: "2px solid var(--gold-light)",
            paddingLeft: "24px",
          }}
        >
          <h1
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "34px",
              color: "#2A2A2A",
              margin: 0,
              fontWeight: "500",
            }}
          >
            ORÇAMENTO
          </h1>
          <p
            style={{
              fontSize: "13px",
              letterSpacing: "0.1em",
              color: "var(--gray-mid)",
              margin: "2px 0 0 0",
            }}
          >
            PROPOSTA DE SERVIÇOS
          </p>
        </div>
        <div style={{ flex: "0 0 auto", textAlign: "left", fontSize: "12px" }}>
          <p style={{ margin: "0 0 6px 0", color: "#2A2A2A" }}>
            DATA: {formatarDataPT(dataEmissao)}
          </p>
          <p style={{ margin: 0, color: "#2A2A2A" }}>
            VALIDADE: {VALIDADE_ORCAMENTO_DIAS} dias
          </p>
        </div>
      </div>

      {/* Dados do cliente */}
      <div style={{ marginBottom: "28px", fontSize: "14px", lineHeight: 2 }}>
        <p style={{ margin: 0 }}>
          <strong>CLIENTE:</strong> {cliente || "—"}
        </p>
        <p style={{ margin: 0 }}>
          <strong>TIPO DE EVENTO:</strong> {tipoEvento || "—"}
        </p>
        <p style={{ margin: 0 }}>
          <strong>DATA DO EVENTO:</strong> {formatarDataPT(dataEvento) || "—"}
        </p>
        <p style={{ margin: 0 }}>
          <strong>LOCAL:</strong> {local || "—"}
        </p>
        {subtitulo && (
          <p
            style={{
              margin: "10px 0 0 0",
              fontStyle: "italic",
              color: "var(--gray-mid)",
              fontSize: "13px",
            }}
          >
            {subtitulo}
          </p>
        )}
      </div>

      {/* Tabela de serviços */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "28px",
          fontSize: "13px",
        }}
      >
        <thead>
          <tr style={{ backgroundColor: "#F5F0E6" }}>
            <th style={thStyle}>DESCRIÇÃO</th>
            <th style={{ ...thStyle, width: "60px" }}>QTD</th>
            <th style={{ ...thStyle, width: "90px" }}>VALOR</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.uid} style={{ borderBottom: "1px solid #E5DFD0" }}>
              <td style={tdStyle}>
                <strong>{l.descricao || "—"}</strong>
                {l.inclui.filter((i) => i.trim()).length > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <p
                      style={{
                        margin: "0 0 4px 0",
                        fontWeight: "600",
                        fontSize: "12px",
                      }}
                    >
                      Inclui:
                    </p>
                    {l.inclui
                      .filter((i) => i.trim())
                      .map((item, i) => (
                        <p
                          key={i}
                          style={{
                            margin: "0 0 2px 0",
                            fontSize: "12px",
                            color: "#3A3A3A",
                          }}
                        >
                          • {item}
                        </p>
                      ))}
                  </div>
                )}
              </td>
              <td style={{ ...tdStyle, verticalAlign: "top" }}>{l.qtd}</td>
              <td style={{ ...tdStyle, verticalAlign: "top" }}>
                {l.valor !== "" ? formatarEuros(l.valor) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Condições + Total */}
      <div
        style={{
          display: "flex",
          gap: "32px",
          alignItems: "flex-start",
          marginBottom: "28px",
        }}
      >
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "16px",
              color: "var(--gold-dark)",
              margin: "0 0 12px 0",
              letterSpacing: "0.05em",
            }}
          >
            CONDIÇÕES
          </h3>
          {CONDICOES_ORCAMENTO.map((c, i) => (
            <p
              key={i}
              style={{
                fontSize: "12px",
                margin: "0 0 8px 0",
                color: "#3A3A3A",
              }}
            >
              • {c}
            </p>
          ))}
        </div>
        <div
          style={{
            flex: "0 0 240px",
            border: "1.5px solid var(--gold)",
            borderRadius: "4px",
            padding: "20px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              letterSpacing: "0.08em",
              color: "#3A3A3A",
              margin: "0 0 8px 0",
            }}
          >
            INVESTIMENTO TOTAL
          </p>
          <p
            style={{
              fontFamily: "Playfair Display, serif",
              fontSize: "38px",
              color: "var(--gold-dark)",
              margin: 0,
            }}
          >
            {formatarEuros(total)}
          </p>
        </div>
      </div>

      {/* Nota rodapé */}
      <div
        style={{
          backgroundColor: "#FAFAF8",
          borderRadius: "6px",
          padding: "16px 20px",
          marginBottom: "20px",
        }}
      >
        <p
          style={{
            fontSize: "11px",
            fontStyle: "italic",
            textAlign: "center",
            color: "var(--gray-mid)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          {NOTA_RODAPE_ORCAMENTO}
        </p>
      </div>

      <p
        style={{
          textAlign: "center",
          fontSize: "11px",
          letterSpacing: "0.1em",
          color: "var(--gray-mid)",
          margin: 0,
        }}
      >
        DO LUXO À MESA &nbsp;|&nbsp; By Nádia Schultz
      </p>
    </div>
  );
}

// ---- estilos partilhados ----
function Campo({ label, children, flex }) {
  return (
    <div style={{ marginBottom: "12px", flex }}>
      <label style={miniLabel}>{label}</label>
      {children}
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

const miniLabel = {
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--charcoal)",
  display: "block",
  marginBottom: "5px",
};

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  fontSize: "12px",
  fontWeight: "700",
  color: "#2A2A2A",
  borderBottom: "2px solid var(--gold-light)",
};

const tdStyle = {
  padding: "12px",
  fontSize: "13px",
  color: "#2A2A2A",
};