import { useEffect, useRef, useState } from "react";

// ============================================================
// AvisoDataDoEvento — explicador interativo no topo de "Modelos de
// Evento", junto ao conceito de "Papel deste campo". A Nádia alterna
// um seletor de demonstração (só local, não mexe em dados reais — o
// campo real fica na edição do próprio tipo de evento, ver
// EventTypeEditor.jsx) entre "Nenhum" e "Data do evento" e vê, num
// mini-diagrama, o que essa marcação liga (ou não) ao Dashboard e ao
// Funil (ver SubmissionDrawer.jsx, FIELD_MAP_INVERSO + papel "data").
//
// Recriado a partir do handoff de design em
// Downloads/design_handoff_aviso_data_evento/ (hi-fi: cores, espaçamento,
// keyframes). Duas adaptações deliberadas para não destoar do resto da
// página: tipografia (Cormorant Garamond → Playfair Display, Hanken
// Grotesk → Inter — já carregadas na app inteira, ver index.css) e as
// cores de texto "genéricas" (headline/corpo/termos-chave usam
// var(--charcoal) / var(--gray-mid) / var(--gold-dark), como todo o
// resto da página, em vez de tons novos só para este cartão). O resto
// da paleta (tons do diagrama, chips, nós) já pertence à mesma família
// de dourados de var(--gold) — mantida fiel ao original.
// ============================================================

const C = {
  ouro: "#a8842c",
  ouroForte: "#c9a227",
  ouroMedio: "#b7902f",
  ouroPonto: "#d3a72c",
  ouroTexto1: "#9a7a22",
  ouroTexto2: "#8a6d1e",
  ouroTexto3: "#7a5f16",
  ouroLabel: "#b59a4f",
  ouroSeta: "#bd9a3a",
  ouroItalico: "#b58f36",
  legendaConectada: "#b0913e",
  fundo1: "#fffdf8",
  fundo2: "#fdf7ea",
  fundo3: "#fdf4d8",
  fundo4: "#f6e7b4",
  fundo5: "#fbf4df",
  fundo6: "#f7ebc6",
  fundo7: "#f1e0b0",
  fundo8: "#fffdf5",
  fundo9: "#fbf2d6",
  borda1: "#efe3c1",
  borda2: "#e3d5ae",
  borda3: "#ecdcae",
  borda4: "#ecd9a0",
  borda5: "#e6c65a",
  borda6: "#e7c65c",
  borda7: "#e6dab8",
  borda8: "#d6c088",
  label1: "#b6a877",
  label2: "#a99a72",
  apagadoFundo: "#f4f1ea",
  apagadoTraco: "#dcd4c3",
  apagadoIcone: "#c0b7a4",
  apagadoLabel: "#a89f8d",
  apagadoPip: "#d8d0bf",
  apagadoLinha: "#d9cfb8",
  apagadoItalico: "#bcae86",
  apagadoAnel: "#c9b06a",
  apagadoTextoLinha: "#8a7e63",
  sucesso: "#5a9d6b",
  secundario1: "#7a6a3f",
  selectTexto: "#8a8272",
  opcaoTexto: "#5c5443",
};

const SERIF = "'Playfair Display', serif";
const SANS = "'Inter', sans-serif";

/* ---------- ícones ---------- */

function IconCalendarioBadge() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.ouro} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2.6" />
      <path d="M3.5 9.5 H20.5" />
      <path d="M8 3.4 V6.4 M16 3.4 V6.4" />
      <circle cx="8.5" cy="13.5" r="0.95" fill={C.ouro} stroke="none" />
      <circle cx="12" cy="13.5" r="0.95" fill={C.ouro} stroke="none" />
      <circle cx="15.5" cy="13.5" r="0.95" fill={C.ouro} stroke="none" />
    </svg>
  );
}

function IconSeloCheck() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
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

function IconChevron({ direction }) {
  const d = direction === "up" ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function IconSeta() {
  return (
    <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke={C.ouroSeta} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2 L2 7 L8 12" />
      <path d="M2.5 7 H18" />
    </svg>
  );
}

function IconCalendarioChip() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.ouroMedio} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M3.5 9.5H20.5M8 3.5v3M16 3.5v3" />
    </svg>
  );
}

function IconCadeado() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#c69a3a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconCheckChip() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.sucesso} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5 9-11" />
    </svg>
  );
}

function IconDashboard({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

function IconFunil({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h18l-7 8v5l-4 2v-7z" />
    </svg>
  );
}

function Sparkle({ left, top, size, duration, delay }) {
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        background: "radial-gradient(circle,#fff6d8,#e0be50 60%,transparent 75%)",
        clipPath: "polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)",
        animation: `dlmAvisoTwinkle ${duration}s ease ${delay}s infinite`,
      }}
    />
  );
}

/* ---------- diagrama ---------- */

function NoFormulario({ conectado }) {
  return (
    <div
      style={{
        position: "absolute",
        left: "6px",
        top: "56px",
        width: "172px",
        height: "88px",
        borderRadius: "14px",
        background: "#ffffff",
        border: `1px solid ${C.borda3}`,
        boxShadow: "0 8px 22px -14px rgba(150,115,35,0.45)",
        padding: "11px 12px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        zIndex: 5,
      }}
    >
      <div style={{ fontSize: "9px", letterSpacing: "0.15em", fontWeight: "700", color: C.label1, fontFamily: SANS }}>
        FORMULÁRIO
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: C.fundo5,
          border: `1px solid ${conectado ? C.borda5 : C.borda4}`,
          borderRadius: "9px",
          padding: "8px 9px",
          animation: conectado ? "none" : "dlmAvisoChipPulse 2s ease infinite",
        }}
      >
        <IconCalendarioChip />
        <span style={{ fontSize: "12.5px", fontWeight: "600", color: C.secundario1, fontFamily: SANS }}>
          12 Set 2026
        </span>
        <span
          style={{
            marginLeft: "auto",
            display: "flex",
            animation: conectado ? "dlmAvisoPopIn 0.4s ease 0.3s both" : "none",
          }}
        >
          {conectado ? <IconCheckChip /> : <IconCadeado />}
        </span>
      </div>
    </div>
  );
}

function DiagramaPorLigar() {
  return (
    <>
      <svg width="520" height="200" viewBox="0 0 520 200" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d="M182,100 C 250,100 288,58 352,58" fill="none" stroke={C.apagadoLinha} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 8" style={{ animation: "dlmAvisoMarch 20s linear infinite" }} />
        <path d="M182,100 C 250,100 288,142 352,142" fill="none" stroke={C.apagadoLinha} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 8" style={{ animation: "dlmAvisoMarch 20s linear infinite" }} />
      </svg>
      <div style={{ position: "absolute", left: "352px", top: "29px", width: "158px", height: "58px", borderRadius: "13px", background: C.apagadoFundo, border: `1px dashed ${C.apagadoTraco}`, display: "flex", alignItems: "center", gap: "11px", padding: "0 14px" }}>
        <IconDashboard color={C.apagadoIcone} />
        <span style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.05em", color: C.apagadoLabel, fontFamily: SANS }}>DASHBOARD</span>
        <span style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: C.apagadoPip }} />
      </div>
      <div style={{ position: "absolute", left: "352px", top: "113px", width: "158px", height: "58px", borderRadius: "13px", background: C.apagadoFundo, border: `1px dashed ${C.apagadoTraco}`, display: "flex", alignItems: "center", gap: "11px", padding: "0 14px" }}>
        <IconFunil color={C.apagadoIcone} />
        <span style={{ fontSize: "11px", fontWeight: "600", letterSpacing: "0.05em", color: C.apagadoLabel, fontFamily: SANS }}>FUNIL</span>
        <span style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: C.apagadoPip }} />
      </div>
      <div style={{ position: "absolute", left: "214px", top: "6px", fontFamily: SERIF, fontStyle: "italic", fontSize: "15px", color: C.apagadoItalico }}>
        …presa aqui dentro
      </div>
    </>
  );
}

function DiagramaLigado() {
  return (
    <>
      <svg width="520" height="200" viewBox="0 0 520 200" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path d="M182,100 C 250,100 288,58 352,58" fill="none" stroke={C.ouroForte} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="320" strokeDashoffset="320" style={{ animation: "dlmAvisoDrawLine 0.9s cubic-bezier(0.16,1,0.3,1) forwards", filter: "drop-shadow(0 1px 4px rgba(201,162,39,0.55))" }} />
        <path d="M182,100 C 250,100 288,142 352,142" fill="none" stroke={C.ouroForte} strokeWidth="2.2" strokeLinecap="round" strokeDasharray="320" strokeDashoffset="320" style={{ animation: "dlmAvisoDrawLine 0.9s cubic-bezier(0.16,1,0.3,1) 0.12s forwards", filter: "drop-shadow(0 1px 4px rgba(201,162,39,0.55))" }} />
      </svg>

      <div style={{ position: "absolute", left: "182px", top: "100px", width: "12px", height: "12px", margin: "-6px 0 0 -6px", borderRadius: "50%", background: "radial-gradient(circle,#fff4cf,#d9a92e 65%,transparent 78%)", boxShadow: "0 0 10px 2px rgba(217,169,46,0.6)", animation: "dlmAvisoPopIn 0.4s ease both", zIndex: 6 }} />
      <div style={{ position: "absolute", left: "182px", top: "100px", width: "14px", height: "14px", borderRadius: "50%", border: "2px solid rgba(211,167,44,0.6)", animation: "dlmAvisoRingPulse 1.8s ease-out infinite" }} />

      <div style={{ position: "absolute", top: 0, left: 0, width: "9px", height: "9px", borderRadius: "50%", background: "radial-gradient(circle,#fff6d8,#e9c247 60%,transparent 74%)", boxShadow: "0 0 9px 2px rgba(224,190,80,0.75)", offsetPath: "path('M182,100 C 250,100 288,58 352,58')", offsetAnchor: "center", animation: "dlmAvisoFlow 2.2s linear 0.9s infinite" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: "9px", height: "9px", borderRadius: "50%", background: "radial-gradient(circle,#fff6d8,#e9c247 60%,transparent 74%)", boxShadow: "0 0 9px 2px rgba(224,190,80,0.75)", offsetPath: "path('M182,100 C 250,100 288,142 352,142')", offsetAnchor: "center", animation: "dlmAvisoFlow 2.2s linear 1.35s infinite" }} />

      <div style={{ position: "absolute", left: "352px", top: "29px", width: "158px", height: "58px", borderRadius: "13px", background: `linear-gradient(135deg,${C.fundo8},${C.fundo9})`, border: `1px solid ${C.borda6}`, boxShadow: "0 10px 26px -14px rgba(180,140,40,0.6)", display: "flex", alignItems: "center", gap: "11px", padding: "0 14px", animation: "dlmAvisoNodeRise 0.5s cubic-bezier(0.16,1,0.3,1) 0.45s both" }}>
        <IconDashboard color={C.ouro} />
        <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.05em", color: C.ouroTexto3, fontFamily: SANS }}>DASHBOARD</span>
        <span style={{ marginLeft: "auto", width: "7px", height: "7px", borderRadius: "50%", background: C.ouroPonto, animation: "dlmAvisoMiniPulse 1.6s ease infinite" }} />
      </div>
      <div style={{ position: "absolute", left: "352px", top: "113px", width: "158px", height: "58px", borderRadius: "13px", background: `linear-gradient(135deg,${C.fundo8},${C.fundo9})`, border: `1px solid ${C.borda6}`, boxShadow: "0 10px 26px -14px rgba(180,140,40,0.6)", display: "flex", alignItems: "center", gap: "11px", padding: "0 14px", animation: "dlmAvisoNodeRise 0.5s cubic-bezier(0.16,1,0.3,1) 0.57s both" }}>
        <IconFunil color={C.ouro} />
        <span style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "0.05em", color: C.ouroTexto3, fontFamily: SANS }}>FUNIL</span>
        <span style={{ marginLeft: "auto", width: "7px", height: "7px", borderRadius: "50%", background: C.ouroPonto, animation: "dlmAvisoMiniPulse 1.6s ease 0.3s infinite" }} />
      </div>

      <Sparkle left="340px" top="20px" size="11px" duration={2.6} delay={0.9} />
      <Sparkle left="498px" top="52px" size="9px" duration={3} delay={1.4} />
      <Sparkle left="340px" top="170px" size="9px" duration={2.8} delay={1.1} />
      <Sparkle left="498px" top="120px" size="11px" duration={3.2} delay={1.7} />
    </>
  );
}

export default function AvisoDataDoEvento({
  startConnected = false,
  collapsedByDefault = false,
  showNudge: showNudgeProp = true,
}) {
  const [role, setRole] = useState(startConnected ? "data" : "nenhum");
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(collapsedByDefault);
  const wrapRef = useRef(null);

  const connected = role === "data";
  const showNudge = showNudgeProp && !connected && !open && !collapsed;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
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

  return (
    <div style={{ maxWidth: "660px", marginBottom: "28px" }}>
      <style>{`
        @keyframes dlmAvisoCalloutIn { 0% { opacity:0; transform:translateY(14px); } 100% { opacity:1; transform:translateY(0); } }
        @keyframes dlmAvisoMenuIn { 0% { opacity:0; transform:translateY(-6px) scale(0.98); } 100% { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes dlmAvisoDrawLine { from { stroke-dashoffset:320; } to { stroke-dashoffset:0; } }
        @keyframes dlmAvisoFlow { 0% { offset-distance:0%; opacity:0; } 14% { opacity:1; } 86% { opacity:1; } 100% { offset-distance:100%; opacity:0; } }
        @keyframes dlmAvisoPopIn { 0% { opacity:0; transform:scale(0.3); } 60% { transform:scale(1.18); } 100% { opacity:1; transform:scale(1); } }
        @keyframes dlmAvisoNodeRise { 0% { opacity:0; transform:translateX(-8px); } 100% { opacity:1; transform:translateX(0); } }
        @keyframes dlmAvisoTwinkle { 0%,100% { opacity:0; transform:scale(0.3) rotate(0deg); } 50% { opacity:1; transform:scale(1) rotate(90deg); } }
        @keyframes dlmAvisoChipPulse { 0%,100% { box-shadow:0 0 0 0 rgba(206,140,52,0); } 50% { box-shadow:0 0 0 7px rgba(210,150,60,0.10); } }
        @keyframes dlmAvisoMarch { to { stroke-dashoffset:-120; } }
        @keyframes dlmAvisoMiniPulse { 0%,100% { opacity:0.55; transform:scale(1); } 50% { opacity:1; transform:scale(1.3); } }
        @keyframes dlmAvisoRingPulse { 0% { transform:translate(-50%,-50%) scale(0.6); opacity:0.6; } 100% { transform:translate(-50%,-50%) scale(1.9); opacity:0; } }
        @keyframes dlmAvisoNudge { 0%,100% { transform:translateX(0); opacity:0.85; } 50% { transform:translateX(-5px); opacity:1; } }
        .dlm-aviso-select:hover { border-color: ${C.borda8}; }
        .dlm-aviso-opcao:hover { background: #f4f0e7; }
        .dlm-aviso-opcao-selecionada:hover { background: ${C.fundo7} !important; }
        .dlm-aviso-chevron-btn:hover { background: #f6eecf; }
      `}</style>

      {/* ===== seletor de demonstração — "Papel deste campo" ===== */}
      <div ref={wrapRef} style={{ position: "relative", width: "300px", maxWidth: "100%" }}>
        <div style={{ fontSize: "10.5px", fontWeight: "600", letterSpacing: "0.15em", color: C.label2, fontFamily: SANS, margin: "0 0 8px 2px" }}>
          PAPEL DESTE CAMPO
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="dlm-aviso-select"
          style={{
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
            <span style={{ fontSize: "14px", color: C.selectTexto }}>Nenhum</span>
          )}
          <IconChevronSelect />
        </button>

        {open && (
          <div className="dlm-aviso-menu" style={{ position: "absolute", left: 0, top: "calc(100% + 6px)", width: "100%", background: "#ffffff", border: `1px solid ${C.borda7}`, borderRadius: "12px", boxShadow: "0 20px 44px -18px rgba(120,90,20,0.5)", padding: "6px", zIndex: 30, animation: "dlmAvisoMenuIn 0.16s ease both" }}>
            <button type="button" onClick={() => { setRole("nenhum"); setOpen(false); }} className="dlm-aviso-opcao" style={{ width: "100%", display: "block", textAlign: "left", padding: "11px 12px", borderRadius: "8px", fontSize: "14px", color: C.opcaoTexto, background: "none", border: "none", cursor: "pointer", fontFamily: SANS }}>
              Nenhum
            </button>
            <button type="button" onClick={() => { setRole("data"); setOpen(false); }} className="dlm-aviso-opcao-selecionada" style={{ width: "100%", display: "flex", alignItems: "center", gap: "9px", textAlign: "left", padding: "11px 12px", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: C.ouroTexto2, background: C.fundo6, border: "none", cursor: "pointer", fontFamily: SANS }}>
              <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: C.ouroPonto }} />
              Data do evento
            </button>
          </div>
        )}

        {showNudge && (
          <div style={{ position: "absolute", left: "calc(100% + 16px)", top: "31px", display: "flex", alignItems: "center", gap: "8px", whiteSpace: "nowrap", pointerEvents: "none", animation: "dlmAvisoNudge 1.5s ease-in-out infinite" }}>
            <IconSeta />
            <span style={{ fontSize: "15px", fontStyle: "italic", color: C.ouroItalico, fontFamily: SERIF }}>escolhe aqui</span>
          </div>
        )}
      </div>

      {/* ===== o callout ===== */}
      <div style={{ position: "relative", marginTop: "26px", background: `linear-gradient(160deg, ${C.fundo1} 0%, ${C.fundo2} 100%)`, border: `1px solid ${C.borda1}`, borderRadius: "18px", boxShadow: "0 26px 62px -32px rgba(150,115,35,0.4)", padding: "22px 24px 24px", animation: "dlmAvisoCalloutIn 0.7s cubic-bezier(0.16,1,0.3,1) both" }}>
        <div style={{ position: "absolute", top: "-9px", left: "132px", width: "17px", height: "17px", background: C.fundo1, borderLeft: `1px solid ${C.borda1}`, borderTop: `1px solid ${C.borda1}`, transform: "rotate(45deg)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{ position: "relative", width: "46px", height: "46px", borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, ${C.fundo3}, ${C.fundo4})`, border: `1px solid ${C.borda4}`, display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", boxShadow: "inset 0 1px 2px rgba(255,255,255,0.7), 0 6px 16px -10px rgba(180,140,40,0.6)" }}>
            <IconCalendarioBadge />
            {connected && (
              <div style={{ position: "absolute", right: "-3px", bottom: "-3px", width: "19px", height: "19px", borderRadius: "50%", background: "linear-gradient(135deg,#e0b93f,#c39420)", border: "2px solid #fffdf8", display: "flex", alignItems: "center", justifyContent: "center", animation: "dlmAvisoPopIn 0.45s cubic-bezier(0.16,1,0.3,1) both" }}>
                <IconSeloCheck />
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {!collapsed ? (
              connected ? (
                <div>
                  <div style={{ fontSize: "10.5px", fontWeight: "600", letterSpacing: "0.16em", color: C.ouro, fontFamily: SANS }}>PAPEL DO CAMPO · LIGADO</div>
                  <div style={{ fontFamily: SERIF, fontSize: "25px", fontWeight: "600", color: "var(--charcoal)", lineHeight: "1.14", marginTop: "2px" }}>Data ligada ao Dashboard e ao Funil</div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: "10.5px", fontWeight: "600", letterSpacing: "0.16em", color: C.ouroLabel, fontFamily: SANS }}>PAPEL DO CAMPO · POR LIGAR</div>
                  <div style={{ fontFamily: SERIF, fontSize: "25px", fontWeight: "600", color: "var(--charcoal)", lineHeight: "1.14", marginTop: "2px" }}>Esta data ainda não sai do formulário</div>
                </div>
              )
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {connected ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: C.secundario1, fontFamily: SANS }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: C.ouroPonto, boxShadow: "0 0 7px rgba(211,167,44,0.7)" }} />
                    Data ligada ao Dashboard e ao Funil
                  </span>
                ) : (
                  <span style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: C.apagadoTextoLinha, fontFamily: SANS }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", border: `1.5px solid ${C.apagadoAnel}`, animation: "dlmAvisoMiniPulse 1.8s ease infinite" }} />
                    Liga a data ao Dashboard — falta definir o papel do campo
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            title="Recolher / expandir"
            aria-expanded={!collapsed}
            className="dlm-aviso-chevron-btn"
            style={{ flex: "0 0 auto", width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.ouro, background: "none", border: "none", padding: 0 }}
          >
            <IconChevron direction={collapsed ? "down" : "up"} />
          </button>
        </div>

        {/* região expansível */}
        <div
          style={{
            maxHeight: collapsed ? "0px" : "760px",
            opacity: collapsed ? 0 : 1,
            overflow: "hidden",
            paddingTop: collapsed ? 0 : "14px",
            transition: collapsed
              ? "max-height 0.45s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease"
              : "max-height 0.6s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease 0.05s",
          }}
        >
          <p style={{ margin: 0, fontSize: "14.5px", lineHeight: "1.62", color: "var(--gray-mid)", maxWidth: "520px", fontFamily: SANS }}>
            {connected ? (
              <>
                Perfeito. Esta data passa a alimentar o <strong style={{ color: "var(--gold-dark)" }}>Dashboard</strong> e o{" "}
                <strong style={{ color: "var(--gold-dark)" }}>Funil</strong> automaticamente — sempre atualizada, sem trabalho manual.
              </>
            ) : (
              <>
                Marca o <strong style={{ color: "var(--gold-dark)" }}>Papel deste campo</strong> como{" "}
                <strong style={{ color: "var(--gold-dark)" }}>Data do evento</strong>. Sem isso, a data fica presa no formulário — nunca chega ao{" "}
                <strong style={{ color: "var(--gold-dark)" }}>Dashboard</strong> nem ao <strong style={{ color: "var(--gold-dark)" }}>Funil</strong>.
              </>
            )}
          </p>

          <div style={{ height: "1px", margin: "20px 0 4px", background: `linear-gradient(90deg, transparent, ${C.borda3} 22%, ${C.borda3} 78%, transparent)` }} />

          <div style={{ position: "relative", width: "520px", height: "200px", maxWidth: "100%", margin: "6px auto 0" }}>
            <NoFormulario conectado={connected} />
            {connected ? <DiagramaLigado /> : <DiagramaPorLigar />}
          </div>

          <div style={{ textAlign: "center", marginTop: "8px", fontFamily: SERIF, fontStyle: "italic", fontSize: "15px" }}>
            {connected ? (
              <span style={{ color: C.legendaConectada }}>a fluir em tempo real</span>
            ) : (
              <span style={{ color: C.apagadoItalico }}>à espera de ligação</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
