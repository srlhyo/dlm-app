import { useEffect, useRef, useState } from "react";

// ============================================================
// AvisoMoradaDoEvento — o irmão gémeo do AvisoDataDoEvento, para o
// tipo de campo "Morada / Endereço" (ver src/lib/morada.js). Mesmo
// sistema visual, pixel a pixel — só o conteúdo muda.
//
// Diferença importante de conceito, reflectida no texto: a MORADA
// desbloqueia-se pelo TIPO do campo (é o único campo desse tipo no
// modelo, normalmente — ver getResumoSubmissao), não pelo "papel" como
// a data. Por isso o seletor de demonstração aqui mostra "Tipo deste
// campo", não "Papel deste campo" — ensina o gesto certo: escolher o
// tipo "Morada / Endereço" ao criar o campo já é suficiente.
// ============================================================

const C = {
  ouro: "#a8842c",
  ouroForte: "#c9a227",
  ouroPonto: "#d3a72c",
  ouroTexto1: "#9a7a22",
  ouroTexto2: "#8a6d1e",
  ouroTexto3: "#7a5f16",
  ouroSub: "#a08a3e",
  ouroLabel: "#b59a4f",
  ouroItalico: "#b58f36",
  ouroSeta: "#bd9a3a",
  fundo1: "#fffdf8",
  fundo2: "#fdf7ea",
  fundo3: "#fdf4d8",
  fundo4: "#f6e7b4",
  fundo5: "#fffdf5",
  fundo6: "#fbf2d6",
  fundo7: "#f7ebc6",
  fundo8: "#f1e0b0",
  fundoUnlockIcone: "#f7efd6",
  borda1: "#efe3c1",
  borda2: "#e3d5ae",
  borda3: "#ecd9a0",
  borda4: "#e6dab8",
  borda5: "#d6c088",
  borda6: "#e7c65c",
  bordaUnlockIcone: "#ecd9a0",
  label: "#a99a72",
  selectTexto: "#8a8272",
  opcaoTexto: "#5c5443",
  bloqFundo: "#f6f3ec",
  bloqTraco: "#ddd5c4",
  bloqIconeFundo: "#efe9dd",
  bloqIcone: "#b3a88f",
  bloqTitulo: "#9a9080",
  bloqSub: "#a79c86",
  bloqCadeado: "#c0b6a0",
};

const SERIF = "'Playfair Display', serif";
const SANS = "'Inter', sans-serif";

/* ---------- ícones ---------- */

function IconPin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.ouro} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.1-7-11a7 7 0 0114 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconCheck({ size = 10, strokeWidth = "3.4", color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5 9-11" />
    </svg>
  );
}

function IconChevronSelect() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#b09a5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flex: "0 0 auto" }}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function IconChevronHeader({ direction }) {
  const d = direction === "up" ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function IconCaretPlaceholder() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#c9a227" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

function IconHintArrow() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.ouroSeta} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

function IconDeslocacao({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.1-7-11a7 7 0 0114 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function IconContrato({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.5h7l4 4V20.5H7z" />
      <path d="M14 3.5V8h4M9.5 12h5" />
      <path d="M9.5 16.5c.9-1 1.6.7 2.5 0s1.6.7 2.5 0" />
    </svg>
  );
}

function IconCadeado({ size = 16, color = C.bloqCadeado }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/* ---------- linha de destino (Cálculo de Deslocação / Contrato) ---------- */

function LinhaDestino({ icon: Icon, titulo, conectado, subtituloBloqueado, subtituloDesbloqueado, delay = 0 }) {
  if (!conectado) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: C.bloqFundo,
          border: `1px dashed ${C.bloqTraco}`,
          borderRadius: "12px",
          padding: "12px 14px",
        }}
      >
        <div style={{ flex: "0 0 auto", width: "34px", height: "34px", borderRadius: "10px", background: C.bloqIconeFundo, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon color={C.bloqIcone} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13.5px", fontWeight: "700", color: C.bloqTitulo, fontFamily: SANS }}>{titulo}</div>
          <div style={{ fontSize: "12px", color: C.bloqSub, fontFamily: SANS }}>{subtituloBloqueado}</div>
        </div>
        <IconCadeado />
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        background: `linear-gradient(160deg, ${C.fundo5}, ${C.fundo6})`,
        border: `1px solid ${C.borda6}`,
        borderRadius: "12px",
        padding: "12px 14px",
        boxShadow: "0 10px 24px -16px rgba(180,140,40,0.6)",
        animation: `dlmAvisoMoradaPopIn 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
      }}
    >
      <div style={{ flex: "0 0 auto", width: "34px", height: "34px", borderRadius: "10px", background: C.fundoUnlockIcone, border: `1px solid ${C.bordaUnlockIcone}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon color={C.ouro} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13.5px", fontWeight: "700", color: C.ouroTexto3, fontFamily: SANS }}>{titulo}</div>
        <div style={{ fontSize: "12px", color: C.ouroSub, fontFamily: SANS }}>{subtituloDesbloqueado}</div>
      </div>
      <div style={{ flex: "0 0 auto", width: "20px", height: "20px", borderRadius: "50%", background: "linear-gradient(135deg,#e0b93f,#c39420)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IconCheck size={11} />
      </div>
    </div>
  );
}

export default function AvisoMoradaDoEvento({
  startConnected = false,
  collapsedByDefault = true,
  showNudge: showGuideProp = true,
}) {
  const [tipo, setTipo] = useState(startConnected ? "morada" : "nenhum");
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(collapsedByDefault);
  const [interacted, setInteracted] = useState(false);
  const selectRef = useRef(null);
  const cardRef = useRef(null);

  const connected = tipo === "morada";
  const showGuide = showGuideProp && !connected && !open && !collapsed;
  const inviteToExpand = collapsed && !interacted;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (collapsed) return;
    const onDocClick = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        setCollapsed(true);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [collapsed]);

  const toggleCollapse = () => {
    setInteracted(true);
    setCollapsed((c) => !c);
  };
  const onHeaderKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleCollapse();
    }
  };

  return (
    <div style={{ width: "468px", maxWidth: "100%", marginBottom: "28px" }}>
      <style>{`
        @keyframes dlmAvisoMoradaCalloutIn { 0% { opacity:0; transform:translateY(16px); } 100% { opacity:1; transform:translateY(0); } }
        @keyframes dlmAvisoMoradaMenuIn { 0% { opacity:0; transform:translateY(-6px) scale(0.98); } 100% { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes dlmAvisoMoradaSoftPulse { 0%,100% { box-shadow:0 0 0 0 rgba(201,162,39,0); } 50% { box-shadow:0 0 0 8px rgba(201,162,39,0.13); } }
        @keyframes dlmAvisoMoradaPopIn { 0% { opacity:0; transform:scale(0.3); } 60% { transform:scale(1.18); } 100% { opacity:1; transform:scale(1); } }
        @keyframes dlmAvisoMoradaHintFloat { 0%,100% { transform:translateY(0); opacity:0.8; } 50% { transform:translateY(3px); opacity:1; } }
        @keyframes dlmAvisoMoradaInviteGlow { 0%,100% { box-shadow:0 26px 62px -34px rgba(150,115,35,0.45), 0 0 0 0 rgba(201,162,39,0); } 50% { box-shadow:0 26px 62px -34px rgba(150,115,35,0.45), 0 0 0 7px rgba(201,162,39,0.16); } }
        @keyframes dlmAvisoMoradaInviteBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(3px); } }
        .dlm-aviso-morada-header:hover { background: rgba(201,162,39,0.04); }
        .dlm-aviso-morada-select:hover { border-color: ${C.borda5}; }
        .dlm-aviso-morada-opcao:hover { background: #f4f0e7; }
        .dlm-aviso-morada-opcao-selecionada:hover { background: ${C.fundo8} !important; }
      `}</style>

      <div
        ref={cardRef}
        style={{
          position: "relative",
          background: `linear-gradient(160deg, ${C.fundo1} 0%, ${C.fundo2} 100%)`,
          border: `1px solid ${C.borda1}`,
          borderRadius: "18px",
          boxShadow: "0 26px 62px -34px rgba(150,115,35,0.45)",
          overflow: "hidden",
          animation: inviteToExpand
            ? "dlmAvisoMoradaCalloutIn 0.7s cubic-bezier(0.16,1,0.3,1) both, dlmAvisoMoradaInviteGlow 2.4s ease-in-out 0.7s infinite"
            : "dlmAvisoMoradaCalloutIn 0.7s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* cabeçalho — clicável para recolher/expandir */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
          onClick={toggleCollapse}
          onKeyDown={onHeaderKeyDown}
          className="dlm-aviso-morada-header"
          style={{ display: "flex", alignItems: "center", gap: "14px", padding: "18px 18px 18px 20px", cursor: "pointer" }}
        >
          <div
            style={{
              position: "relative",
              width: "42px",
              height: "42px",
              borderRadius: "12px",
              background: `radial-gradient(circle at 35% 30%, ${C.fundo3}, ${C.fundo4})`,
              border: `1px solid ${C.borda3}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "0 0 auto",
              boxShadow: "inset 0 1px 2px rgba(255,255,255,0.7)",
            }}
          >
            <IconPin />
            {connected && (
              <div
                style={{
                  position: "absolute",
                  right: "-4px",
                  bottom: "-4px",
                  width: "19px",
                  height: "19px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#e0b93f,#c39420)",
                  border: `2px solid ${C.fundo1}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: "dlmAvisoMoradaPopIn 0.45s cubic-bezier(0.16,1,0.3,1) both",
                }}
              >
                <IconCheck />
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {collapsed ? (
              <span style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--gray-mid)", fontFamily: SANS }}>
                {connected
                  ? "Morada do evento ligada ao Cálculo de Deslocação e ao Contrato."
                  : "Tens a morada do evento no modelo? Usa o tipo Morada / Endereço."}
              </span>
            ) : connected ? (
              <div>
                <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.15em", color: C.ouro, fontFamily: SANS, marginBottom: "2px" }}>DESBLOQUEADO</div>
                <div style={{ fontFamily: SERIF, fontSize: "22px", fontWeight: "600", color: "var(--charcoal)", lineHeight: "1.15" }}>Morada ligada ao teu sistema</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.15em", color: C.ouroLabel, fontFamily: SANS, marginBottom: "2px" }}>LEMBRETE DE CONFIGURAÇÃO</div>
                <div style={{ fontFamily: SERIF, fontSize: "22px", fontWeight: "600", color: "var(--charcoal)", lineHeight: "1.15" }}>Este campo é a morada do evento?</div>
              </div>
            )}
          </div>

          <div
            style={{
              flex: "0 0 auto",
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: C.ouro,
              animation: inviteToExpand ? "dlmAvisoMoradaInviteBounce 1.6s ease-in-out infinite" : "none",
            }}
          >
            <IconChevronHeader direction={collapsed ? "down" : "up"} />
          </div>
        </div>

        {/* corpo colapsável */}
        <div
          style={{
            maxHeight: collapsed ? "0px" : "560px",
            opacity: collapsed ? 0 : 1,
            overflow: "hidden",
            transition: collapsed
              ? "max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.28s ease"
              : "max-height 0.55s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease 0.05s",
          }}
        >
          <div style={{ padding: "2px 22px 22px 22px" }}>
            <p style={{ margin: "0 0 16px", fontSize: "14px", lineHeight: "1.6", color: "var(--gray-mid)", fontFamily: SANS }}>
              {connected
                ? "O tipo está definido. Esta morada passa a alimentar, automaticamente:"
                : "Se o modelo tem um campo com a morada do evento, usa aqui o tipo Morada / Endereço. É esse passo que desbloqueia o resto:"}
            </p>

            {/* seletor de demonstração — "Tipo deste campo" (a morada
                desbloqueia-se pelo TIPO, não por um papel à parte — ver
                getResumoSubmissao) */}
            <div ref={selectRef} style={{ position: "relative", marginBottom: "18px" }}>
              <div style={{ fontSize: "10.5px", fontWeight: "700", letterSpacing: "0.15em", color: C.label, fontFamily: SANS, margin: "0 0 8px 2px" }}>
                TIPO DESTE CAMPO
              </div>
              <div style={{ position: "relative" }}>
                {showGuide && (
                  <div style={{ position: "absolute", inset: 0, borderRadius: "12px", animation: "dlmAvisoMoradaSoftPulse 1.9s ease-in-out infinite", pointerEvents: "none" }} />
                )}
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  aria-haspopup="listbox"
                  aria-expanded={open}
                  className="dlm-aviso-morada-select"
                  style={{
                    position: "relative",
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    background: "#ffffff",
                    border: `1px solid ${C.borda2}`,
                    borderRadius: "12px",
                    padding: "12px 15px",
                    cursor: "pointer",
                    boxShadow: "0 3px 12px -7px rgba(150,115,35,0.4)",
                    fontFamily: SANS,
                    textAlign: "left",
                  }}
                >
                  {connected ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "14px", fontWeight: "600", color: C.ouroTexto1 }}>
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: C.ouroPonto, boxShadow: "0 0 6px rgba(211,167,44,0.7)" }} />
                      Morada / Endereço
                    </span>
                  ) : (
                    <span style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "14px", color: C.selectTexto }}>
                      <IconCaretPlaceholder />
                      Escolher…
                    </span>
                  )}
                  <IconChevronSelect />
                </button>

                {open && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "calc(100% + 6px)",
                      width: "100%",
                      background: "#ffffff",
                      border: `1px solid ${C.borda4}`,
                      borderRadius: "12px",
                      boxShadow: "0 20px 44px -18px rgba(120,90,20,0.5)",
                      padding: "6px",
                      zIndex: 30,
                      animation: "dlmAvisoMoradaMenuIn 0.16s ease both",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setTipo("nenhum"); setOpen(false); }}
                      className="dlm-aviso-morada-opcao"
                      style={{ width: "100%", display: "block", textAlign: "left", padding: "11px 12px", borderRadius: "8px", fontSize: "14px", color: C.opcaoTexto, background: "none", border: "none", cursor: "pointer", fontFamily: SANS }}
                    >
                      Texto curto
                    </button>
                    <button
                      type="button"
                      onClick={() => { setTipo("morada"); setOpen(false); }}
                      className="dlm-aviso-morada-opcao-selecionada"
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: "9px", textAlign: "left", padding: "11px 12px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: C.ouroTexto2, background: C.fundo7, border: "none", cursor: "pointer", fontFamily: SANS }}
                    >
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: C.ouroPonto }} />
                      Morada / Endereço
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* destinos: Cálculo de Deslocação e Contrato, bloqueados → desbloqueados */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <LinhaDestino
                icon={IconDeslocacao}
                titulo="Cálculo de Deslocação"
                conectado={connected}
                subtituloBloqueado="à espera da morada"
                subtituloDesbloqueado="recebe a morada — pronta a calcular a distância"
              />
              <LinhaDestino
                icon={IconContrato}
                titulo="Contrato"
                conectado={connected}
                subtituloBloqueado="à espera da morada"
                subtituloDesbloqueado="recebe a morada — endereço completo do espaço"
                delay={0.1}
              />
            </div>

            {showGuide && (
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "14px", animation: "dlmAvisoMoradaHintFloat 1.9s ease-in-out infinite" }}>
                <IconHintArrow />
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "15px", color: C.ouroItalico }}>
                  escolhe «Morada / Endereço» para desbloquear
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
