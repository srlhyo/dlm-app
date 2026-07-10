import { useState, useEffect, useRef } from "react";
import {
  submeterCaptacao,
  getTiposParaCaptacao,
  MAX_IMAGENS_REFERENCIA,
} from "../../lib/captacao";

// ============================================================
// CaptacaoForm — os campos da captação, PARTILHADOS entre:
//   • a página pública /interesse (o interessado preenche)
//   • o botão "+ Novo interessado" no funil (a Nádia transcreve
//     uma conversa de Instagram) — bloco 4b
//
// Fricção zero: só nome, contacto e tipo são obrigatórios.
// props:
//   onSubmetido(submission) — chamado após criar cliente + evento
//   textoBotao              — label do botão (default "Enviar pedido")
// ============================================================

const OPCOES_PRETENDE = ["Decoração", "Buffet", "Outro"];

export default function CaptacaoForm({
  onSubmetido,
  textoBotao = "Enviar pedido",
}) {
  const [tipos, setTipos] = useState([]);
  const [nome, setNome] = useState("");
  const [contacto, setContacto] = useState("");
  const [eventTypeId, setEventTypeId] = useState("");
  const [tipoOutro, setTipoOutro] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [numeroConvidados, setNumeroConvidados] = useState("");
  const [local, setLocal] = useState("");
  const [pretende, setPretende] = useState([]);
  const [pretendeOutro, setPretendeOutro] = useState("");
  const [ficheiros, setFicheiros] = useState([]); // File[]
  const [mensagem, setMensagem] = useState("");
  const [erros, setErros] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [erroGeral, setErroGeral] = useState(null);
  const inputImagens = useRef(null);

  useEffect(() => {
    getTiposParaCaptacao().then(setTipos);
  }, []);

  const togglePretende = (opt) => {
    setPretende((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt],
    );
    setErros((prev) => ({ ...prev, pretende: undefined }));
  };

  const escolherImagens = (e) => {
    const novos = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/"),
    );
    setFicheiros((prev) =>
      [...prev, ...novos].slice(0, MAX_IMAGENS_REFERENCIA),
    );
    e.target.value = ""; // permite escolher o mesmo ficheiro outra vez
  };

  const removerImagem = (idx) =>
    setFicheiros((prev) => prev.filter((_, i) => i !== idx));

  const validar = () => {
    const e = {};
    if (!nome.trim()) e.nome = "Diz-nos o teu nome.";
    if (!contacto.trim()) e.contacto = "Precisamos de um contacto.";
    const temTipo =
      (eventTypeId && eventTypeId !== "__outro__") || tipoOutro.trim();
    if (!temTipo) e.tipo = "Escolhe o tipo de evento.";
    if (pretende.length === 0) e.pretende = "Escolhe pelo menos uma opção.";
    if (pretende.includes("Outro") && !pretendeOutro.trim())
      e.pretendeOutro = "Diz-nos o que procuras.";
    setErros(e);
    return Object.keys(e).length === 0;
  };

  const submeter = async () => {
    setErroGeral(null);
    if (!validar()) return;
    setEnviando(true);
    try {
      // "Outro" no pretende leva o texto livre em vez da palavra solta
      const pretendeFinal = pretende.map((p) =>
        p === "Outro" ? `Outro: ${pretendeOutro.trim()}` : p,
      );
      const tipoReal =
        eventTypeId && eventTypeId !== "__outro__" ? eventTypeId : null;
      const submission = await submeterCaptacao({
        nome,
        contacto,
        eventTypeId: tipoReal,
        tipoOutro: tipoReal ? null : tipoOutro,
        dataEvento,
        numeroConvidados,
        local,
        pretende: pretendeFinal,
        mensagem,
        ficheiros,
      });
      if (onSubmetido) onSubmetido(submission);
    } catch (err) {
      console.error(err);
      setErroGeral(
        "Não foi possível enviar o pedido. Verifica a ligação e tenta novamente.",
      );
    }
    setEnviando(false);
  };

  return (
    <div>
      <Campo label="O teu nome *" erro={erros.nome}>
        <input
          style={inputStyle(erros.nome)}
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setErros((p) => ({ ...p, nome: undefined }));
          }}
          placeholder="ex: Ana Cruz"
        />
      </Campo>

      <Campo label="Contacto (telemóvel ou Instagram) *" erro={erros.contacto}>
        <input
          style={inputStyle(erros.contacto)}
          value={contacto}
          onChange={(e) => {
            setContacto(e.target.value);
            setErros((p) => ({ ...p, contacto: undefined }));
          }}
          placeholder="ex: 912 345 678 ou @zeliiaaa__"
        />
      </Campo>

      <Campo label="Tipo de evento *" erro={erros.tipo}>
        {tipos.length > 0 ? (
          <select
            style={inputStyle(erros.tipo)}
            value={eventTypeId}
            onChange={(e) => {
              setEventTypeId(e.target.value);
              if (e.target.value && e.target.value !== "__outro__")
                setTipoOutro("");
              setErros((p) => ({ ...p, tipo: undefined }));
            }}
          >
            <option value="">Escolher...</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
            <option value="__outro__">Outro (escrever em baixo)</option>
          </select>
        ) : null}
        {(tipos.length === 0 || eventTypeId === "__outro__") && (
          <input
            style={{ ...inputStyle(erros.tipo), marginTop: "6px" }}
            value={tipoOutro}
            onChange={(e) => {
              setTipoOutro(e.target.value);
              setErros((p) => ({ ...p, tipo: undefined }));
            }}
            placeholder={
              tipos.length > 0
                ? "Outro tipo de evento? Escreve aqui"
                : "ex: Casamento, Batizado, Aniversário..."
            }
          />
        )}
      </Campo>

      <div style={{ display: "flex", gap: "10px" }}>
        <Campo label="Data (aproximada)" flex={1}>
          <input
            type="date"
            style={inputStyle()}
            value={dataEvento}
            onChange={(e) => setDataEvento(e.target.value)}
          />
        </Campo>
        <Campo label="Nº de convidados" flex={1}>
          <input
            type="number"
            min="1"
            style={inputStyle()}
            value={numeroConvidados}
            onChange={(e) => setNumeroConvidados(e.target.value)}
            placeholder="ex: 25"
          />
        </Campo>
      </div>

      <Campo label="Local (se já souberes)">
        <input
          style={inputStyle()}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          placeholder="ex: Cascais"
        />
      </Campo>

      <Campo label="O que pretendes? *" erro={erros.pretende}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {OPCOES_PRETENDE.map((opt) => {
            const ativo = pretende.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => togglePretende(opt)}
                style={{
                  padding: "8px 18px",
                  borderRadius: "999px",
                  fontSize: "13px",
                  fontWeight: ativo ? "600" : "400",
                  border: `1.5px solid ${ativo ? "var(--gold)" : "var(--gold-light)"}`,
                  backgroundColor: ativo ? "var(--gold)" : "white",
                  color: ativo ? "white" : "var(--gray-mid)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {pretende.includes("Outro") && (
          <div style={{ marginTop: "8px" }}>
            <input
              style={inputStyle(erros.pretendeOutro)}
              value={pretendeOutro}
              onChange={(e) => {
                setPretendeOutro(e.target.value);
                setErros((p) => ({ ...p, pretendeOutro: undefined }));
              }}
              placeholder="Conta-nos o que procuras"
            />
            {erros.pretendeOutro && <Erro texto={erros.pretendeOutro} />}
          </div>
        )}
      </Campo>

      <Campo
        label={`Imagens de referência (até ${MAX_IMAGENS_REFERENCIA}, opcional)`}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {ficheiros.map((f, i) => (
            <div key={i} style={{ position: "relative" }}>
              <img
                src={URL.createObjectURL(f)}
                alt={`Referência ${i + 1}`}
                style={{
                  width: "64px",
                  height: "64px",
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
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: "none",
                  backgroundColor: "var(--charcoal)",
                  color: "white",
                  fontSize: "11px",
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}
          {ficheiros.length < MAX_IMAGENS_REFERENCIA && (
            <button
              type="button"
              onClick={() => inputImagens.current?.click()}
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "10px",
                border: "1.5px dashed var(--gold)",
                backgroundColor: "white",
                color: "var(--gold)",
                fontSize: "22px",
                cursor: "pointer",
              }}
              aria-label="Adicionar imagens"
            >
              +
            </button>
          )}
        </div>
        <input
          ref={inputImagens}
          type="file"
          accept="image/*"
          multiple
          onChange={escolherImagens}
          style={{ display: "none" }}
        />
      </Campo>

      <Campo label="Conta-nos mais (opcional)">
        <textarea
          style={{ ...inputStyle(), minHeight: "70px", resize: "vertical" }}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder="ex: Ambiente bonito e acolhedor para um pedido de noivado, cor champanhe..."
        />
      </Campo>

      {erroGeral && (
        <p
          style={{
            fontSize: "13px",
            color: "#DC2626",
            margin: "0 0 12px 0",
          }}
        >
          {erroGeral}
        </p>
      )}

      <button
        onClick={submeter}
        disabled={enviando}
        style={{
          width: "100%",
          padding: "13px",
          borderRadius: "10px",
          fontSize: "14px",
          fontWeight: "600",
          border: "none",
          backgroundColor: enviando ? "var(--gold-light)" : "var(--gold)",
          color: "white",
          cursor: enviando ? "wait" : "pointer",
          boxShadow: "0 4px 12px rgba(201,168,76,0.3)",
        }}
      >
        {enviando ? "A enviar..." : textoBotao}
      </button>
    </div>
  );
}

// ---- helpers ----
function Campo({ label, erro, children, flex }) {
  return (
    <div style={{ marginBottom: "14px", flex }}>
      <label
        style={{
          fontSize: "11px",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--charcoal)",
          display: "block",
          marginBottom: "5px",
        }}
      >
        {label}
      </label>
      {children}
      {erro && <Erro texto={erro} />}
    </div>
  );
}

function Erro({ texto }) {
  return (
    <p style={{ fontSize: "12px", color: "#DC2626", margin: "4px 0 0 0" }}>
      {texto}
    </p>
  );
}

const inputStyle = (temErro) => ({
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: `1.5px solid ${temErro ? "#DC2626" : "var(--gold-light)"}`,
  fontSize: "13px",
  outline: "none",
  fontFamily: "Inter, sans-serif",
  boxSizing: "border-box",
  backgroundColor: "white",
});
