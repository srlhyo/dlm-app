import { useState } from "react";
import { CATEGORIAS_ORDEM } from "../../lib/materiais";

// ============================================================
// MaterialModalRico — criar/editar um material do inventário rico.
// Campos em três secções: Identificação, Quantidades, Notas.
// O "nome" é gerado das dimensões (grupo tipo cor medida) ao guardar —
// a Nádia não o escreve.
// ============================================================

const UNIDADES = ["un", "par", "conj", "mt", "kg", "cx"];

// Gera o nome legível a partir das dimensões preenchidas.
const gerarNome = ({ categoria, tipo, cor, medida }) => {
  const partes = [categoria, tipo, cor, medida]
    .map((p) => (p || "").trim())
    .filter(Boolean);
  return partes.join(" ") || (categoria || "Material").trim();
};

export default function MaterialModalRico({
  inicial,
  gruposExistentes = [],
  onCancel,
  onGuardar,
}) {
  const ehNovo = !inicial?.id;

  // Identificação
  const [codigo, setCodigo] = useState(inicial?.codigo || "");
  const [categoria, setCategoria] = useState(inicial?.categoria || "");
  const [tipo, setTipo] = useState(inicial?.tipo || "");
  const [cor, setCor] = useState(inicial?.cor || "");
  const [medida, setMedida] = useState(inicial?.medida || "");
  const [unidade, setUnidade] = useState(inicial?.unidade || "un");

  // Quantidades
  const [quantidadeTotal, setQuantidadeTotal] = useState(
    inicial?.quantidade_total ?? 0,
  );
  const [emHigienizacao, setEmHigienizacao] = useState(
    inicial?.em_higienizacao ?? 0,
  );
  const [porConfirmar, setPorConfirmar] = useState(inicial?.por_confirmar ?? 0);
  const [stockIdeal, setStockIdeal] = useState(inicial?.stock_ideal ?? "");

  // Listas por defeito
  const [defCarga, setDefCarga] = useState(inicial?.def_carga ?? true);
  const [defMontagem, setDefMontagem] = useState(inicial?.def_montagem ?? true);
  const [defHigienizacao, setDefHigienizacao] = useState(
    inicial?.def_higienizacao ?? false,
  );

  // Notas
  const [notas, setNotas] = useState(inicial?.notas || "");

  const [guardando, setGuardando] = useState(false);
  const [erro, setErro] = useState(null);

  // Sugestões de grupo: os que já existem + os canónicos, sem repetir
  const gruposSugeridos = Array.from(
    new Set([...gruposExistentes, ...CATEGORIAS_ORDEM]),
  );

  const num = (v) => Math.max(0, Math.round(Number(v) || 0));

  const guardar = async () => {
    if (!categoria.trim()) {
      setErro("O grupo é obrigatório.");
      return;
    }
    setGuardando(true);
    setErro(null);
    const dados = {
      codigo: codigo.trim() || null,
      categoria: categoria.trim(),
      tipo: tipo.trim() || null,
      cor: cor.trim() || null,
      medida: medida.trim() || null,
      unidade,
      quantidade_total: num(quantidadeTotal),
      em_higienizacao: num(emHigienizacao),
      por_confirmar: num(porConfirmar),
      stock_ideal:
        stockIdeal === "" || stockIdeal == null ? null : num(stockIdeal),
      notas: notas.trim() || null,
      def_carga: defCarga,
      def_montagem: defMontagem,
      def_higienizacao: defHigienizacao,
    };
    dados.nome = gerarNome(dados);
    try {
      await onGuardar(dados);
    } catch (e) {
      console.error(e);
      setErro("Não foi possível guardar. Tenta novamente.");
      setGuardando(false);
    }
  };

  // Pré-visualização do nome gerado
  const nomePreview = gerarNome({ categoria, tipo, cor, medida });

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 150,
        backgroundColor: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "24px",
          maxWidth: "460px",
          width: "100%",
          boxShadow: "0 8px 48px rgba(0,0,0,0.15)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <h3
          style={{
            fontSize: "16px",
            color: "var(--charcoal)",
            margin: "0 0 4px 0",
            fontFamily: "Playfair Display, serif",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {ehNovo ? "Novo material" : "Editar material"}
        </h3>
        {/* Pré-visualização do nome gerado */}
        <p
          style={{
            fontSize: "12px",
            color: "var(--gold-dark)",
            margin: "0 0 18px 0",
            minHeight: "16px",
          }}
        >
          {nomePreview}
        </p>

        {/* ===== SECÇÃO: IDENTIFICAÇÃO ===== */}
        <Seccao titulo="Identificação" />

        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
          <div style={{ flex: "0 0 40%" }}>
            <label style={labelStyle}>Código</label>
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="ex: CP001"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Grupo *</label>
            <input
              type="text"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              placeholder="ex: Copos"
              list="grupos-sugeridos"
              style={inputStyle}
            />
            <datalist id="grupos-sugeridos">
              {gruposSugeridos.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Tipo</label>
            <input
              type="text"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="ex: Vinho"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Cor</label>
            <input
              type="text"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              placeholder="ex: Transparente"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "18px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Medida / detalhe</label>
            <input
              type="text"
              value={medida}
              onChange={(e) => setMedida(e.target.value)}
              placeholder="ex: Diamante"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: "0 0 30%" }}>
            <label style={labelStyle}>Unidade</label>
            <select
              value={unidade}
              onChange={(e) => setUnidade(e.target.value)}
              style={inputStyle}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ===== SECÇÃO: QUANTIDADES ===== */}
        <Seccao titulo="Quantidades" />

        <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Total</label>
            <input
              type="number"
              min="0"
              value={quantidadeTotal}
              onChange={(e) => setQuantidadeTotal(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Stock ideal</label>
            <input
              type="number"
              min="0"
              value={stockIdeal}
              onChange={(e) => setStockIdeal(e.target.value)}
              placeholder="—"
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Na higienização</label>
            <input
              type="number"
              min="0"
              value={emHigienizacao}
              onChange={(e) => setEmHigienizacao(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Por confirmar</label>
            <input
              type="number"
              min="0"
              value={porConfirmar}
              onChange={(e) => setPorConfirmar(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
        <p
          style={{
            fontSize: "11px",
            color: "var(--gray-mid)",
            margin: "0 0 18px 0",
            lineHeight: 1.5,
          }}
        >
          Disponível ={" "}
          <strong>
            {num(quantidadeTotal) - num(emHigienizacao) - num(porConfirmar)}
          </strong>{" "}
          (total menos higienização e por confirmar).
        </p>

        {/* ===== SECÇÃO: LISTAS POR DEFEITO ===== */}
        <Seccao titulo="Listas por defeito" />
        <p
          style={{
            fontSize: "11px",
            color: "var(--gray-mid)",
            margin: "0 0 10px 0",
            lineHeight: 1.5,
          }}
        >
          Em que listas esta peça entra quando a adicionas a um evento.
        </p>
        <CheckLinha label="Carga" checked={defCarga} onChange={setDefCarga} />
        <CheckLinha
          label="Montagem"
          checked={defMontagem}
          onChange={setDefMontagem}
        />
        <CheckLinha
          label="Higienização"
          checked={defHigienizacao}
          onChange={setDefHigienizacao}
        />

        {/* ===== SECÇÃO: NOTAS ===== */}
        <div style={{ marginTop: "18px" }}>
          <Seccao titulo="Notas" />
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Observações sobre esta peça..."
            rows={2}
            style={{ ...inputStyle, resize: "vertical", minHeight: "56px" }}
          />
        </div>

        {erro && (
          <p
            style={{
              fontSize: "12px",
              color: "#DC2626",
              backgroundColor: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "8px",
              padding: "10px 14px",
              margin: "16px 0 0 0",
            }}
          >
            ⚠ {erro}
          </p>
        )}

        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "flex-end",
            marginTop: "20px",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "10px 20px",
              borderRadius: "8px",
              fontSize: "13px",
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
              padding: "10px 24px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: "600",
              border: "none",
              backgroundColor: guardando ? "var(--gold-light)" : "var(--gold)",
              color: "white",
              cursor: guardando ? "not-allowed" : "pointer",
            }}
          >
            {guardando ? "A guardar..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Cabeçalho de secção
function Seccao({ titulo }) {
  return (
    <p
      style={{
        fontSize: "10px",
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "var(--gold-dark)",
        margin: "0 0 10px 0",
        paddingBottom: "6px",
        borderBottom: "1px solid var(--gold-light)",
      }}
    >
      {titulo}
    </p>
  );
}

function CheckLinha({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "9px 12px",
        marginBottom: "6px",
        borderRadius: "10px",
        border: `1.5px solid ${checked ? "var(--gold)" : "var(--gold-light)"}`,
        backgroundColor: checked ? "#FEF9EC" : "white",
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      <span
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "6px",
          border: `1.5px solid ${checked ? "var(--gold)" : "var(--gold-light)"}`,
          backgroundColor: checked ? "var(--gold)" : "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          color: "white",
          fontSize: "11px",
        }}
      >
        {checked ? "✓" : ""}
      </span>
      <span style={{ fontSize: "13px", color: "var(--charcoal)" }}>
        {label}
      </span>
    </button>
  );
}

const labelStyle = {
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--charcoal)",
  display: "block",
  marginBottom: "5px",
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
