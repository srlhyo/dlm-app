import { useEffect, useRef, useState } from "react";

// ============================================================
// AvisoDataDoEvento — lembrete interativo no topo de "Modelos de
// Evento", junto ao conceito de "Papel deste campo". A Nádia alterna
// um seletor de demonstração (só local, não mexe em dados reais — o
// campo real fica na edição do próprio tipo de evento, ver
// FieldRow em EventTypeEditor.jsx) entre "Nenhum" e "Data do evento"
// e vê, dentro do próprio cartão, o Dashboard e o Funil passarem de
// bloqueados a desbloqueados.
//
// Recriado a partir do handoff de design em
// Downloads/design_handoff_aviso_2b/ ("opção 2b — Desbloquear"; hi-fi:
// cores, espaçamento, keyframes, estados). Substitui a versão anterior
// (diagrama grande com linhas a ligar formulário → Dashboard/Funil,
// handoff design_handoff_aviso_data_evento/) por este cartão mais
// compacto, onde o próprio seletor e os dois destinos vivem dentro do
// cartão. Duas adaptações deliberadas para não destoar do resto da
// página: tipografia (Cormorant Garamond → Playfair Display, Hanken
// Grotesk → Inter — já carregadas na app inteira, ver index.css) e as
// cores de texto "genéricas" (título/parágrafo usam var(--charcoal) /
// var(--gray-mid), como todo o resto da página, em vez de tons novos
// só para este cartão). O resto da paleta (dourados do cartão, do
// seletor e das linhas de destino) já pertence à mesma família de
// dourados de var(--gold) — mantida fiel ao original, pixel a pixel.
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

function IconCalendario() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={C.ouro} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2.6" />
      <path d="M3.5 9.5 H20.5" />
      <path d="M8 3.4 V6.4 M16 3.4 V6.4" />
      <circle cx="8.5" cy="13.5" r="0.95" fill={C.ouro} stroke="none" />
      <circle cx="12" cy="13.5" r="0.95" fill={C.ouro} stroke="none" />
      <circle cx="15.5" cy="13.5" r="0.95" fill={C.ouro} stroke="none" />
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

function IconDashboard({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

function IconFunil({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h18l-7 8v5l-4 2v-7z" />
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

/* ---------- linha de destino (Dashboard / Funil) ---------- */

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
        animation: `dlmAvisoPopIn 0.45s cubic-bezier(0.16,1,0.3,1) ${delay}s both`,
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

export default function AvisoDataDoEvento({
  startConnected = false,
  collapsedByDefault = true,
  showNudge: showGuideProp = true,
}) {
  const [role, setRole] = useState(startConnected ? "data" : "nenhum");
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(collapsedByDefault);
  // Só convida a expandir na primeira vez — depois de a Nádia já ter
  // aberto o cartão uma vez, deixa de "chamar a atenção" para não
  // tornar-se irritante em cada visita à página.
  const [interacted, setInteracted] = useState(false);
  const selectRef = useRef(null);
  const cardRef = useRef(null);

  const connected = role === "data";
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

  // Expandido + clique fora do cartão inteiro → recolhe.
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
        @keyframes dlmAvisoCalloutIn { 0% { opacity:0; transform:translateY(16px); } 100% { opacity:1; transform:translateY(0); } }
        @keyframes dlmAvisoMenuIn { 0% { opacity:0; transform:translateY(-6px) scale(0.98); } 100% { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes dlmAvisoSoftPulse { 0%,100% { box-shadow:0 0 0 0 rgba(201,162,39,0); } 50% { box-shadow:0 0 0 8px rgba(201,162,39,0.13); } }
        @keyframes dlmAvisoPopIn { 0% { opacity:0; transform:scale(0.3); } 60% { transform:scale(1.18); } 100% { opacity:1; transform:scale(1); } }
        @keyframes dlmAvisoHintFloat { 0%,100% { transform:translateY(0); opacity:0.8; } 50% { transform:translateY(3px); opacity:1; } }
        @keyframes dlmAvisoInviteGlow { 0%,100% { box-shadow:0 26px 62px -34px rgba(150,115,35,0.45), 0 0 0 0 rgba(201,162,39,0); } 50% { box-shadow:0 26px 62px -34px rgba(150,115,35,0.45), 0 0 0 7px rgba(201,162,39,0.16); } }
        @keyframes dlmAvisoInviteBounce { 0%,100% { transform:translateY(0); } 50% { transform:translateY(3px); } }
        .dlm-aviso-header:hover { background: rgba(201,162,39,0.04); }
        .dlm-aviso-select:hover { border-color: ${C.borda5}; }
        .dlm-aviso-opcao:hover { background: #f4f0e7; }
        .dlm-aviso-opcao-selecionada:hover { background: ${C.fundo8} !important; }
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
            ? "dlmAvisoCalloutIn 0.7s cubic-bezier(0.16,1,0.3,1) both, dlmAvisoInviteGlow 2.4s ease-in-out 0.7s infinite"
            : "dlmAvisoCalloutIn 0.7s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        {/* cabeçalho — clicável para recolher/expandir */}
        <div
          role="button"
          tabIndex={0}
          aria-expanded={!collapsed}
          onClick={toggleCollapse}
          onKeyDown={onHeaderKeyDown}
          className="dlm-aviso-header"
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
            <IconCalendario />
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
                  animation: "dlmAvisoPopIn 0.45s cubic-bezier(0.16,1,0.3,1) both",
                }}
              >
                <IconCheck />
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {collapsed ? (
              <span style={{ fontSize: "13.5px", fontWeight: "600", color: "var(--gray-mid)", fontFamily: SANS }}>
                {connected ? "Data do evento ligada ao Dashboard e ao Funil." : "Tens data do evento no modelo? Marca o papel do campo."}
              </span>
            ) : connected ? (
              <div>
                <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.15em", color: C.ouro, fontFamily: SANS, marginBottom: "2px" }}>DESBLOQUEADO</div>
                <div style={{ fontFamily: SERIF, fontSize: "22px", fontWeight: "600", color: "var(--charcoal)", lineHeight: "1.15" }}>Data ligada ao teu sistema</div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.15em", color: C.ouroLabel, fontFamily: SANS, marginBottom: "2px" }}>LEMBRETE DE CONFIGURAÇÃO</div>
                <div style={{ fontFamily: SERIF, fontSize: "22px", fontWeight: "600", color: "var(--charcoal)", lineHeight: "1.15" }}>Este campo é a data do evento?</div>
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
              animation: inviteToExpand ? "dlmAvisoInviteBounce 1.6s ease-in-out infinite" : "none",
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
                ? "O papel está definido. Esta data passa a alimentar, automaticamente:"
                : "Se o modelo tem um campo com a data do evento, marca aqui o papel dele. É esse passo que desbloqueia o resto:"}
            </p>

            {/* seletor de demonstração — "Papel deste campo" */}
            <div ref={selectRef} style={{ position: "relative", marginBottom: "18px" }}>
              <div style={{ fontSize: "10.5px", fontWeight: "700", letterSpacing: "0.15em", color: C.label, fontFamily: SANS, margin: "0 0 8px 2px" }}>
                PAPEL DESTE CAMPO
              </div>
              <div style={{ position: "relative" }}>
                {showGuide && (
                  <div style={{ position: "absolute", inset: 0, borderRadius: "12px", animation: "dlmAvisoSoftPulse 1.9s ease-in-out infinite", pointerEvents: "none" }} />
                )}
                <button
                  type="button"
                  onClick={() => setOpen((o) => !o)}
                  aria-haspopup="listbox"
                  aria-expanded={open}
                  className="dlm-aviso-select"
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
                      Data do evento
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
                      animation: "dlmAvisoMenuIn 0.16s ease both",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => { setRole("nenhum"); setOpen(false); }}
                      className="dlm-aviso-opcao"
                      style={{ width: "100%", display: "block", textAlign: "left", padding: "11px 12px", borderRadius: "8px", fontSize: "14px", color: C.opcaoTexto, background: "none", border: "none", cursor: "pointer", fontFamily: SANS }}
                    >
                      Nenhum
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRole("data"); setOpen(false); }}
                      className="dlm-aviso-opcao-selecionada"
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: "9px", textAlign: "left", padding: "11px 12px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: C.ouroTexto2, background: C.fundo7, border: "none", cursor: "pointer", fontFamily: SANS }}
                    >
                      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: C.ouroPonto }} />
                      Data do evento
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* destinos: Dashboard e Funil, bloqueados → desbloqueados */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <LinhaDestino
                icon={IconDashboard}
                titulo="Dashboard"
                conectado={connected}
                subtituloBloqueado="à espera da data"
                subtituloDesbloqueado="recebe a data — métricas pela data certa"
              />
              <LinhaDestino
                icon={IconFunil}
                titulo="Funil"
                conectado={connected}
                subtituloBloqueado="à espera da data"
                subtituloDesbloqueado="recebe a data — cada lead no tempo certo"
                delay={0.1}
              />
            </div>

            {showGuide && (
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginTop: "14px", animation: "dlmAvisoHintFloat 1.9s ease-in-out infinite" }}>
                <IconHintArrow />
                <span style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "15px", color: C.ouroItalico }}>
                  escolhe «Data do evento» para desbloquear
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
