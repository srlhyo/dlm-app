import { useState, useMemo, useRef, useEffect } from "react";
import { useDocumento, rotuloEstadoGravacao } from "../../../lib/documentos";
import logoUrl from "../../../assets/logo.png";
import {
  EMPRESA,
  CONTRATO_INTRO,
  CLAUSULAS,
  COMPOSICAO_LUGAR_SUGERIDA,
  dataPorExtenso,
  valorPorExtensoPT,
} from "./contratoConfig";
import { formatarEuros, formatarDataPT } from "./orcamentoConfig";

// ============================================================
// GerarContrato v2 — persistência no Supabase (Biblioteca de
// Documentos, migração 021). Mesmo padrão do GerarOrcamento:
//
//   • GerarContrato (shell) — resolve ONDE o documento vive:
//       - prefill.submissionId (drawer 📃) OU documentoId (biblioteca)
//         → tabela `documentos` via useDocumento (lazy-create na
//         primeira edição; gravação debounced ~800ms com indicador)
//       - manual (sem evento nem id) → localStorage TRANSITÓRIO num
//         objeto único com a MESMA forma dos `dados`
//   • ContratoEditor — o formulário + documento de sempre; hidrata de
//     `dadosIniciais` (useState inicial — o AdminPage remonta por
//     `key` quando o contexto muda) e avisa onMudou(dados) a cada
//     alteração.
//
// Precedência de hidratação: documento.dados > prefill > defaults.
// Suporta 1 ou 2 contraentes (cliente único ou casal); nos casais, o
// NIF do cliente pré-preenche o 1.º contraente (via prefill).
// O valor por extenso é gerado automaticamente (valorPorExtensoPT)
// sempre que o valor muda — mas o campo continua editável.
// ============================================================

let seq = 0;
const novoContraente = (base = {}) => ({
  uid: `c_${Date.now()}_${seq++}`,
  nome: "",
  nif: "",
  ...base,
});

// ---- rascunho manual (transitório, até à vista biblioteca) ----
const CHAVE_RASCUNHO_MANUAL = "dlm_rascunho_contrato:manual:dados";

const lerRascunhoManual = () => {
  try {
    const bruto = localStorage.getItem(CHAVE_RASCUNHO_MANUAL);
    if (bruto !== null) return JSON.parse(bruto);
  } catch {
    /* storage indisponível ou JSON corrompido — segue vazio */
  }
  return null;
};

const gravarRascunhoManual = (dados) => {
  try {
    localStorage.setItem(CHAVE_RASCUNHO_MANUAL, JSON.stringify(dados));
  } catch {
    /* quota cheia ou privado — o pior caso é perder o rascunho manual */
  }
};

export default function GerarContrato({
  prefill = null,
  ativo = true,
  documentoId = null,
}) {
  const submissionId = prefill?.submissionId || null;
  const modoPersistente = !!(submissionId || documentoId);

  // O hook chama-se SEMPRE (regras dos hooks); sem ids não carrega nada
  // e nós nunca chamamos `gravar` no modo manual — zero linhas fantasma.
  const { carregado, documento, gravar, estado } = useDocumento({
    tipo: "contrato",
    submissionId,
    documentoId,
  });

  if (modoPersistente && !carregado) {
    return (
      <p
        style={{
          fontSize: "13px",
          color: "var(--gray-mid)",
          padding: "24px 0",
        }}
      >
        A carregar o documento…
      </p>
    );
  }

  // Fonte da hidratação: BD > localStorage manual > prefill > defaults
  const d = modoPersistente ? documento?.dados || null : lerRascunhoManual();

  const dadosIniciais = {
    contraentes:
      Array.isArray(d?.contraentes) && d.contraentes.length > 0
        ? d.contraentes
        : prefill?.contraentes?.length
          ? prefill.contraentes.map((c) => novoContraente(c))
          : [novoContraente()],
    morada: d?.morada ?? prefill?.morada ?? "",
    contacto: d?.contacto ?? prefill?.contacto ?? "",
    tipoEvento:
      d?.tipoEvento ?? (prefill ? prefill.tipoEvento || "" : "Casamento"),
    dataEvento: d?.dataEvento ?? prefill?.dataEvento ?? "",
    horaInicio: d?.horaInicio ?? prefill?.horaInicio ?? "",
    horaFim: d?.horaFim ?? prefill?.horaFim ?? "",
    local: d?.local ?? prefill?.localCompleto ?? "",
    lugares: d?.lugares ?? prefill?.lugares ?? "",
    composicao: d?.composicao ?? COMPOSICAO_LUGAR_SUGERIDA.join("\n"),
    servicosExtra: d?.servicosExtra ?? "",
    valor:
      d?.valor ??
      (prefill?.valor !== undefined && prefill?.valor !== null
        ? String(prefill.valor)
        : ""),
    valorExtenso:
      d?.valorExtenso ??
      (prefill?.valor ? valorPorExtensoPT(prefill.valor) : ""),
    localAssinatura: d?.localAssinatura ?? "Ericeira",
    dataAssinatura:
      d?.dataAssinatura ?? new Date().toISOString().slice(0, 10),
  };

  return (
    <ContratoEditor
      dadosIniciais={dadosIniciais}
      ativo={ativo}
      estadoGravacao={modoPersistente ? estado : null}
      onMudou={modoPersistente ? gravar : gravarRascunhoManual}
    />
  );
}

// ------------------------------------------------------------
// ContratoEditor — formulário dos dados variáveis + pré-visualização
// fiel ao contrato da Do Luxo à Mesa, imprimível (window.print()).
// Não sabe onde os dados vivem: hidrata de `dadosIniciais` e avisa
// `onMudou(dados)` a cada mudança.
// ------------------------------------------------------------
function ContratoEditor({ dadosIniciais, ativo, estadoGravacao, onMudou }) {
  // 1.ª Contraente — cliente(s)
  const [contraentes, setContraentes] = useState(dadosIniciais.contraentes);
  const [morada, setMorada] = useState(dadosIniciais.morada);
  const [contacto, setContacto] = useState(dadosIniciais.contacto);

  // Objeto
  const [tipoEvento, setTipoEvento] = useState(dadosIniciais.tipoEvento);
  const [dataEvento, setDataEvento] = useState(dadosIniciais.dataEvento);
  const [horaInicio, setHoraInicio] = useState(dadosIniciais.horaInicio);
  const [horaFim, setHoraFim] = useState(dadosIniciais.horaFim);
  const [local, setLocal] = useState(dadosIniciais.local);

  // Serviços (texto livre multilinha, pré-preenchido com a composição habitual)
  const [lugares, setLugares] = useState(dadosIniciais.lugares);
  const [composicao, setComposicao] = useState(dadosIniciais.composicao);
  const [servicosExtra, setServicosExtra] = useState(
    dadosIniciais.servicosExtra,
  );

  // Valor — o extenso deriva automaticamente do valor, mas fica editável
  const [valor, setValor] = useState(dadosIniciais.valor);
  const [valorExtenso, setValorExtenso] = useState(dadosIniciais.valorExtenso);

  // Assinatura (local + data)
  const [localAssinatura, setLocalAssinatura] = useState(
    dadosIniciais.localAssinatura,
  );
  const [dataAssinatura, setDataAssinatura] = useState(
    dadosIniciais.dataAssinatura,
  );

  // Uma gravação por documento (não por campo): sempre que QUALQUER
  // campo muda, o estado completo segue para onMudou (Supabase
  // debounced ou localStorage manual). A guarda salta o 1.º render —
  // hidratar não é editar (senão criava linhas na BD só de abrir).
  const primeiraRenderRef = useRef(true);
  useEffect(() => {
    if (primeiraRenderRef.current) {
      primeiraRenderRef.current = false;
      return;
    }
    onMudou({
      contraentes,
      morada,
      contacto,
      tipoEvento,
      dataEvento,
      horaInicio,
      horaFim,
      local,
      lugares,
      composicao,
      servicosExtra,
      valor,
      valorExtenso,
      localAssinatura,
      dataAssinatura,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    contraentes,
    morada,
    contacto,
    tipoEvento,
    dataEvento,
    horaInicio,
    horaFim,
    local,
    lugares,
    composicao,
    servicosExtra,
    valor,
    valorExtenso,
    localAssinatura,
    dataAssinatura,
  ]);

  const atualizarContraente = (uid, campos) =>
    setContraentes((prev) =>
      prev.map((c) => (c.uid === uid ? { ...c, ...campos } : c)),
    );

  // Mudar o valor regenera o extenso (a Nádia pode depois afiná-lo à mão)
  const atualizarValor = (v) => {
    setValor(v);
    setValorExtenso(valorPorExtensoPT(v));
  };

  // Troca temporária do <title> durante a impressão (o browser usa-o
  // nos cabeçalhos; o @page margin 0 no CSS já os elimina de qualquer
  // forma — cinto e suspensórios).
  const imprimir = () => {
    const tituloAnterior = document.title;
    const nomePrimeiro = contraentes[0]?.nome;
    document.title = `Contrato — ${nomePrimeiro || "Do Luxo à Mesa"}`;
    window.print();
    document.title = tituloAnterior;
  };

  return (
    <div>
      {/* O contrato é multi-página: mantém @page margin 2cm (margens
          bonitas em TODAS as páginas). Os cabeçalhos do browser
          resolvem-se com o swap do título + desligar "Headers and
          footers" uma vez no diálogo de impressão (fica memorizado). */}
      {ativo && (
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .contrato-doc, .contrato-doc * { visibility: visible; }
          .contrato-doc {
            position: absolute; left: 0; top: 0; width: 100%;
            box-shadow: none !important; max-width: none !important;
            margin: 0 !important; padding: 0 !important;
          }
          .no-print { display: none !important; }
          @page { size: A4; margin: 2cm; }
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
        {/* ===== FORMULÁRIO ===== */}
        <div>
          <h3 style={h3Style}>Contraente(s) — Cliente</h3>
          {contraentes.map((c, i) => (
            <div
              key={c.uid}
              style={{
                backgroundColor: "#FBF7EF",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "10px",
                border: "1px solid #F0E6D0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <span style={miniLabelGold}>
                  {contraentes.length > 1 ? `Cliente ${i + 1}` : "Cliente"}
                </span>
                {contraentes.length > 1 && (
                  <button
                    onClick={() =>
                      setContraentes((prev) =>
                        prev.filter((x) => x.uid !== c.uid),
                      )
                    }
                    style={linkRemover}
                  >
                    remover
                  </button>
                )}
              </div>
              <Campo label="Nome completo">
                <input
                  style={inputStyle}
                  value={c.nome}
                  onChange={(e) =>
                    atualizarContraente(c.uid, { nome: e.target.value })
                  }
                  placeholder="ex: Brenda Lorrana Lima da Silva"
                />
              </Campo>
              <Campo label="NIF">
                <input
                  style={inputStyle}
                  value={c.nif}
                  onChange={(e) =>
                    atualizarContraente(c.uid, { nif: e.target.value })
                  }
                  placeholder="ex: 299 217 833"
                />
              </Campo>
            </div>
          ))}
          {contraentes.length < 2 && (
            <button
              onClick={() =>
                setContraentes((prev) => [...prev, novoContraente()])
              }
              style={btnAdd}
            >
              + Adicionar 2.º cliente (casal)
            </button>
          )}

          <Campo label="Morada (do cliente)">
            <input
              style={inputStyle}
              value={morada}
              onChange={(e) => setMorada(e.target.value)}
              placeholder="ex: Rua Maria Telles Mendes 14, 8º C"
            />
          </Campo>
          <Campo label="Contacto">
            <input
              style={inputStyle}
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              placeholder="ex: 926 687 792"
            />
          </Campo>

          <h3 style={h3Style}>Objeto do contrato</h3>
          <Campo label="Tipo de evento">
            <input
              style={inputStyle}
              value={tipoEvento}
              onChange={(e) => setTipoEvento(e.target.value)}
              placeholder="ex: Casamento, Batizado, Aniversário..."
            />
          </Campo>
          <Campo label="Data do evento">
            <input
              type="date"
              style={inputStyle}
              value={dataEvento}
              onChange={(e) => setDataEvento(e.target.value)}
            />
          </Campo>
          <div style={{ display: "flex", gap: "12px" }}>
            <Campo label="Hora início" flex={1}>
              <input
                type="time"
                style={inputStyle}
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </Campo>
            <Campo label="Hora fim" flex={1}>
              <input
                type="time"
                style={inputStyle}
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
              />
            </Campo>
          </div>
          <Campo label="Local (completo)">
            <input
              style={inputStyle}
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="ex: Av. Nossa Senhora do Cabo 101, 2750-374 Cascais"
            />
          </Campo>

          <h3 style={h3Style}>Serviços</h3>
          <Campo label="Nº de lugares">
            <input
              type="number"
              style={inputStyle}
              value={lugares}
              onChange={(e) => setLugares(e.target.value)}
              placeholder="ex: 60"
            />
          </Campo>
          <Campo label="Composição por lugar (um item por linha)">
            <textarea
              style={{ ...inputStyle, minHeight: "120px", resize: "vertical" }}
              value={composicao}
              onChange={(e) => setComposicao(e.target.value)}
            />
          </Campo>
          <Campo label="Serviços adicionais (um por linha, opcional)">
            <textarea
              style={{ ...inputStyle, minHeight: "70px", resize: "vertical" }}
              value={servicosExtra}
              onChange={(e) => setServicosExtra(e.target.value)}
              placeholder="ex: Espaço Fotografável dos Noivos&#10;Painéis decorativos"
            />
          </Campo>

          <h3 style={h3Style}>Valor e assinatura</h3>
          <div style={{ display: "flex", gap: "12px" }}>
            <Campo label="Valor (€)" flex={1}>
              <input
                type="number"
                step="0.01"
                style={inputStyle}
                value={valor}
                onChange={(e) => atualizarValor(e.target.value)}
                placeholder="650"
              />
            </Campo>
            <Campo label="Valor por extenso (automático, editável)" flex={2}>
              <input
                style={inputStyle}
                value={valorExtenso}
                onChange={(e) => setValorExtenso(e.target.value)}
                placeholder="seiscentos e cinquenta euros"
              />
            </Campo>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <Campo label="Local de assinatura" flex={1}>
              <input
                style={inputStyle}
                value={localAssinatura}
                onChange={(e) => setLocalAssinatura(e.target.value)}
              />
            </Campo>
            <Campo label="Data de assinatura" flex={1}>
              <input
                type="date"
                style={inputStyle}
                value={dataAssinatura}
                onChange={(e) => setDataAssinatura(e.target.value)}
              />
            </Campo>
          </div>
        </div>

        {/* ===== AÇÕES ===== */}
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
                color: "var(--gray-mid)",
                margin: "0 0 16px 0",
                lineHeight: 1.5,
              }}
            >
              A pré-visualização abaixo é o contrato tal como sai impresso.
              Confere e carrega em imprimir para guardar como PDF.
            </p>
            <button onClick={imprimir} style={btnImprimir}>
              🖨 Imprimir / Guardar PDF
            </button>
            {/* Indicador de gravação — só nos documentos persistidos
                na BD (o manual continua no localStorage, silencioso) */}
            {estadoGravacao && rotuloEstadoGravacao(estadoGravacao) && (
              <p
                style={{
                  fontSize: "11px",
                  textAlign: "center",
                  margin: "10px 0 0 0",
                  color:
                    estadoGravacao === "erro"
                      ? "#DC2626"
                      : estadoGravacao === "guardado"
                        ? "#166534"
                        : "var(--gray-mid)",
                }}
              >
                {rotuloEstadoGravacao(estadoGravacao)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ===== DOCUMENTO ===== */}
      <ContratoDocumento
        contraentes={contraentes}
        morada={morada}
        contacto={contacto}
        tipoEvento={tipoEvento}
        dataEvento={dataEvento}
        horaInicio={horaInicio}
        horaFim={horaFim}
        local={local}
        lugares={lugares}
        composicao={composicao}
        servicosExtra={servicosExtra}
        valor={valor}
        valorExtenso={valorExtenso}
        localAssinatura={localAssinatura}
        dataAssinatura={dataAssinatura}
      />
    </div>
  );
}

// ------------------------------------------------------------
// O DOCUMENTO — replica o contrato da Do Luxo à Mesa
// ------------------------------------------------------------
function ContratoDocumento({
  contraentes,
  morada,
  contacto,
  tipoEvento,
  dataEvento,
  horaInicio,
  horaFim,
  local,
  lugares,
  composicao,
  servicosExtra,
  valor,
  valorExtenso,
  localAssinatura,
  dataAssinatura,
}) {
  // Monta o corpo dos serviços (cláusula 2.ª) a partir dos campos
  const servicosTexto = useMemo(() => {
    const linhas = [];
    const n = lugares || "___";
    linhas.push(`Decoração de Mesas - ${n} Lugares Completos`);
    linhas.push("");
    linhas.push("Composição por Lugar");
    composicao
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((l) => linhas.push(`• ${l}`));
    const extra = servicosExtra
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (extra.length) {
      linhas.push("");
      extra.forEach((l) => linhas.push(`• ${l}`));
    }
    return linhas.join("\n");
  }, [lugares, composicao, servicosExtra]);

  const substituir = (texto) =>
    texto
      .replace("{TIPO_EVENTO}", tipoEvento || "___")
      .replace("{DATA_EXTENSO}", dataPorExtenso(dataEvento))
      .replace("{LOCAL}", local || "___")
      .replace("{HORA_INICIO}", horaInicio ? `${horaInicio}h` : "___")
      .replace("{HORA_FIM}", horaFim ? `${horaFim}h` : "___")
      .replace("{VALOR}", valor ? formatarEuros(valor) : "___")
      .replace("{VALOR_EXTENSO}", valorExtenso ? valorExtenso : "___");

  return (
    <div
      className="contrato-doc"
      style={{
        backgroundColor: "white",
        maxWidth: "760px",
        margin: "0 auto",
        padding: "56px 64px",
        boxShadow: "0 2px 24px rgba(0,0,0,0.08)",
        fontFamily: "Georgia, 'Times New Roman', serif",
        color: "#1A1A1A",
        fontSize: "13px",
        lineHeight: 1.7,
      }}
    >
      {/* Logo + título */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <img
          src={logoUrl}
          alt="Do Luxo à Mesa"
          style={{ width: "90px", height: "auto", margin: "0 auto 16px" }}
        />
        <h1
          style={{
            fontSize: "16px",
            fontWeight: "700",
            letterSpacing: "0.05em",
            margin: "0 0 4px 0",
          }}
        >
          CONTRATO DE PRESTAÇÃO DE SERVIÇOS
        </h1>
        <p style={{ fontStyle: "italic", margin: 0, color: "#444" }}>
          {EMPRESA.designacao}
        </p>
      </div>

      {/* Partes */}
      <p style={{ fontWeight: "700", margin: "24px 0 12px 0" }}>DAS PARTES</p>

      <p style={{ fontWeight: "700", margin: "0 0 8px 0" }}>1.ª CONTRAENTE</p>
      {contraentes.length > 1 ? (
        <>
          <p style={{ margin: "0 0 4px 0", fontWeight: "600" }}>Clientes:</p>
          {contraentes.map((c) => (
            <p key={c.uid} style={{ margin: "0 0 4px 0" }}>
              {c.nome || "___"}, <strong>NIF:</strong> {c.nif || "___"}
            </p>
          ))}
        </>
      ) : (
        <p style={{ margin: "0 0 4px 0" }}>
          <strong>Nome do Cliente:</strong> {contraentes[0]?.nome || "___"}
        </p>
      )}
      {contraentes.length === 1 && (
        <p style={{ margin: "0 0 4px 0" }}>
          <strong>NIF:</strong> {contraentes[0]?.nif || "___"}
        </p>
      )}
      <p style={{ margin: "0 0 4px 0" }}>
        <strong>Morada:</strong> {morada || "___"}
      </p>
      <p style={{ margin: "0 0 16px 0" }}>
        <strong>Contacto:</strong> {contacto || "___"}
      </p>

      <p style={{ fontWeight: "700", margin: "0 0 8px 0" }}>2.ª CONTRAENTE</p>
      <p style={{ margin: "0 0 4px 0" }}>
        <strong>Nome:</strong> {EMPRESA.nome}
      </p>
      <p style={{ margin: "0 0 4px 0" }}>
        <strong>Morada:</strong> {EMPRESA.morada}
      </p>
      <p style={{ margin: "0 0 16px 0" }}>
        <strong>NIF:</strong> {EMPRESA.nif}
      </p>

      {/* Intro */}
      {CONTRATO_INTRO.split("\n\n").map((par, i) => (
        <p key={i} style={{ margin: "0 0 12px 0", textAlign: "justify" }}>
          {par}
        </p>
      ))}

      {/* Cláusulas */}
      {CLAUSULAS.map((cl) => (
        <div key={cl.n} style={{ marginTop: "20px" }}>
          <p style={{ fontWeight: "700", margin: "0 0 2px 0" }}>
            CLÁUSULA {cl.n}
          </p>
          <p style={{ fontWeight: "700", margin: "0 0 8px 0" }}>{cl.titulo}</p>
          {cl.ehServicos
            ? servicosTexto.split("\n").map((linha, i) => (
                <p
                  key={i}
                  style={{
                    margin: linha === "" ? "8px 0" : "0 0 2px 0",
                    fontWeight: /^(Composição|Decoração)/.test(linha)
                      ? "600"
                      : "400",
                  }}
                >
                  {linha}
                </p>
              ))
            : substituir(cl.corpo)
                .split("\n\n")
                .map((par, i) => (
                  <p
                    key={i}
                    style={{ margin: "0 0 8px 0", textAlign: "justify" }}
                  >
                    {par.split("\n").map((linha, j) => (
                      <span key={j}>
                        {linha}
                        {j < par.split("\n").length - 1 && <br />}
                      </span>
                    ))}
                  </p>
                ))}
        </div>
      ))}

      {/* Assinaturas */}
      <p style={{ margin: "32px 0 40px 0" }}>
        {localAssinatura || "___"}, {dataPorExtenso(dataAssinatura)}
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "40px",
          marginTop: "20px",
        }}
      >
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #1A1A1A", paddingTop: "6px" }}>
            1.º Contraente
          </div>
        </div>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ borderTop: "1px solid #1A1A1A", paddingTop: "6px" }}>
            2.ª Contraente
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- helpers de estilo ----
function Campo({ label, children, flex }) {
  return (
    <div style={{ marginBottom: "12px", flex }}>
      <label style={miniLabel}>{label}</label>
      {children}
    </div>
  );
}

const h3Style = {
  fontSize: "15px",
  fontFamily: "Playfair Display, serif",
  color: "var(--charcoal)",
  margin: "22px 0 12px 0",
};
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
const miniLabelGold = {
  fontSize: "11px",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--gold)",
};
const linkRemover = {
  background: "none",
  border: "none",
  color: "#DC2626",
  cursor: "pointer",
  fontSize: "12px",
};
const btnAdd = {
  padding: "9px 16px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: "600",
  border: "1.5px solid var(--gold)",
  color: "var(--gold)",
  backgroundColor: "white",
  cursor: "pointer",
  marginBottom: "12px",
};
const btnImprimir = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  fontSize: "13px",
  fontWeight: "600",
  border: "none",
  backgroundColor: "var(--gold)",
  color: "white",
  cursor: "pointer",
};