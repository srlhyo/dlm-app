import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  listarAvisosPendentes,
  marcarAvisoReconhecido,
} from "../../lib/avisosAtualizacao";

// ============================================================
// AvisosBloqueantes — o portão de actualizações importantes. Uso:
//
//   <AvisosBloqueantes pagina="modelos-evento">
//     ...o resto da página, normal...
//   </AvisosBloqueantes>
//
// Enquanto houver avisos por reconhecer para essa `pagina` (ver o
// registo em avisosAtualizacao.js) —
//   1. Uma barra escura e a pulsar (com um badge vermelho a contar
//      quantos faltam — o sinal universal de "tens algo por ler",
//      sem pintar o aviso inteiro de vermelho: isto não é um erro, é
//      uma boa notícia) é a ÚNICA coisa clicável da página; o
//      `children` fica desfocado e sem cliques por baixo.
//   2. Clicar na barra abre um assistente de ecrã inteiro, um aviso de
//      cada vez, com uma animação bloqueado→desbloqueado automática a
//      mostrar exactamente o que a actualização liga.
//   3. Só avança (ou fecha, no último) ao clicar "Percebi" — nunca há
//      um X para fechar sem reconhecer.
//
// Sem avisos pendentes: não renderiza nada disto — só o `children`,
// normal, sem desfoque nem barra. Reutilizável em qualquer página nova
// que ganhe uma actualização — só é preciso um `pagina` novo no
// registo e o mesmo `<AvisosBloqueantes pagina="...">` a envolver essa
// página.
// ============================================================

const SERIF = "'Playfair Display', serif";
const SANS = "'Inter', sans-serif";
const EASE = [0.22, 1, 0.36, 1];

/* ---------- ícones ---------- */

function IconAlerta() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8d5a3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.8L21.5 20H2.5z" />
      <path d="M12 9.5v5" />
      <circle cx="12" cy="17.3" r="1" fill="#e8d5a3" stroke="none" />
    </svg>
  );
}

function IconSeta() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function IconCheck({ size = 11, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l5 5 9-11" />
    </svg>
  );
}

function IconCadeado() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0b6a0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function IconCalendario({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5" width="17" height="15" rx="2.6" />
      <path d="M3.5 9.5 H20.5" />
      <path d="M8 3.4 V6.4 M16 3.4 V6.4" />
    </svg>
  );
}

function IconPin({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.1-7-11a7 7 0 0114 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
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

function IconEtiqueta({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.6 3.5H6a1 1 0 00-1 1v6.6a1 1 0 00.3.7l9.8 9.8a1 1 0 001.4 0l6.6-6.6a1 1 0 000-1.4l-9.8-9.8a1 1 0 00-.7-.3z" />
      <circle cx="9" cy="9" r="1.3" fill={color} stroke="none" />
    </svg>
  );
}

function IconLixo({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7h14" />
      <path d="M9.5 7V5a1.5 1.5 0 011.5-1.5h2A1.5 1.5 0 0114.5 5v2" />
      <path d="M7 7l.8 12.2A2 2 0 009.8 21h4.4a2 2 0 002-1.8L17 7" />
    </svg>
  );
}

function IconLapis({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20l.9-4L16 4.9a1.6 1.6 0 012.3 0l.8.8a1.6 1.6 0 010 2.3L8 19l-4 1z" />
      <path d="M14 6.9L17.1 10" />
    </svg>
  );
}

// Mapa nome→ícone — cada aviso no registo (avisosAtualizacao.js) só
// precisa de referir o NOME; acrescentar um aviso novo com um ícone já
// existente nunca exige tocar neste ficheiro. Um ícone novo, sim.
const ICONES = {
  calendario: IconCalendario,
  pin: IconPin,
  dashboard: IconDashboard,
  funil: IconFunil,
  deslocacao: IconDeslocacao,
  contrato: IconContrato,
  etiqueta: IconEtiqueta,
  lixo: IconLixo,
  lapis: IconLapis,
};

/* ---------- linha de destino (bloqueado → desbloqueado, automático) ---------- */

function LinhaDestino({ icon, nome, sub, desbloqueado, delay = 0 }) {
  const Icon = ICONES[icon] || IconEtiqueta;
  if (!desbloqueado) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "#f6f3ec", border: "1px dashed #ddd5c4", borderRadius: "12px", padding: "12px 14px" }}>
        <div style={{ flex: "0 0 auto", width: "34px", height: "34px", borderRadius: "10px", background: "#efe9dd", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon color="#b3a88f" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#9a9080", fontFamily: SANS }}>{nome}</div>
          <div style={{ fontSize: "12px", color: "#a79c86", fontFamily: SANS }}>à espera</div>
        </div>
        <IconCadeado />
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      style={{ display: "flex", alignItems: "center", gap: "12px", background: "linear-gradient(160deg, #fffdf5, #fbf2d6)", border: "1px solid #e7c65c", borderRadius: "12px", padding: "12px 14px", boxShadow: "0 10px 24px -16px rgba(180,140,40,0.6)" }}
    >
      <div style={{ flex: "0 0 auto", width: "34px", height: "34px", borderRadius: "10px", background: "#f7efd6", border: "1px solid #ecd9a0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon color="#a8842c" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#7a5f16", fontFamily: SANS }}>{nome}</div>
        <div style={{ fontSize: "12px", color: "#a08a3e", fontFamily: SANS }}>recebe — {sub}</div>
      </div>
      <div style={{ flex: "0 0 auto", width: "20px", height: "20px", borderRadius: "50%", background: "linear-gradient(135deg,#e0b93f,#c39420)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IconCheck />
      </div>
    </motion.div>
  );
}

/* ---------- extras opcionais: vantagens + demonstração de cálculo ----------
   Reservados a avisos "em destaque" (ver `vantagens`/`demoCalculo` no
   registo) — a funcionalidade mais importante de cada leva merece mais
   do que uma linha de destino a desbloquear; merece mostrar-se a
   funcionar. */

function ListaVantagens({ itens }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "9px", margin: "4px 0 18px" }}>
      {itens.map((texto, i) => (
        <motion.div
          key={texto}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.09, duration: 0.35, ease: EASE }}
          style={{ display: "flex", alignItems: "flex-start", gap: "10px" }}
        >
          <span
            style={{
              flexShrink: 0,
              marginTop: "2px",
              width: "17px",
              height: "17px",
              borderRadius: "50%",
              background: "linear-gradient(135deg,#e0b93f,#c39420)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconCheck size={9} />
          </span>
          <span style={{ fontSize: "13.5px", lineHeight: 1.55, color: "var(--charcoal)", fontFamily: SANS }}>
            {texto}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function Pastilha({ children, resultado }) {
  return (
    <span
      style={{
        padding: resultado ? "6px 13px" : "5px 11px",
        borderRadius: "8px",
        fontSize: resultado ? "15px" : "12px",
        fontWeight: "700",
        whiteSpace: "nowrap",
        fontFamily: resultado ? SERIF : SANS,
        ...(resultado
          ? { background: "linear-gradient(160deg,#fffdf5,#fbf2d6)", border: "1px solid var(--gold)", color: "#7a5f16" }
          : { background: "#fbf7ef", border: "1px solid #f0e6d0", color: "var(--charcoal)" }),
      }}
    >
      {children}
    </span>
  );
}

function DemoCalculo({ demo }) {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMostrar(true), 550);
    return () => clearTimeout(t);
  }, []);

  const pctTramado = Math.min(100, (demo.kmIncluidos / demo.distanciaKm) * 100);
  const pctDourado = 100 - pctTramado;

  return (
    <div style={{ background: "#fffdf5", border: "1px solid #e7c65c", borderRadius: "14px", padding: "16px 16px 14px", marginBottom: "18px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10.5px", color: "var(--gray-mid)", marginBottom: "7px", fontFamily: SANS, letterSpacing: "0.04em" }}>
        <span>BASE · 0 KM</span>
        <span>EVENTO · {demo.distanciaKm} KM</span>
      </div>
      <div style={{ display: "flex", height: "10px", borderRadius: "999px", overflow: "hidden", border: "1px solid #ece3ce", marginBottom: "14px" }}>
        <div
          style={{
            width: `${pctTramado}%`,
            backgroundImage: "repeating-linear-gradient(135deg, #ede2c0 0px, #ede2c0 5px, #f7f0dd 5px, #f7f0dd 10px)",
          }}
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: mostrar ? `${pctDourado}%` : 0 }}
          transition={{ duration: 0.8, ease: EASE }}
          style={{ background: "linear-gradient(90deg, #e8d5a3, #a8842c)" }}
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap", justifyContent: "center" }}>
        <Pastilha>{demo.kmIncluidos} km incluídos</Pastilha>
        <span style={{ fontSize: "12px", color: "var(--gray-mid)" }}>+</span>
        <Pastilha>{demo.kmForaDoRaio} km fora do raio</Pastilha>
        <span style={{ fontSize: "12px", color: "var(--gray-mid)" }}>×</span>
        <Pastilha>{demo.euroPorKm} €/km</Pastilha>
        <span style={{ fontSize: "12px", color: "var(--gray-mid)" }}>=</span>
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: mostrar ? 1 : 0.7, opacity: mostrar ? 1 : 0 }}
          transition={{ delay: 0.65, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ display: "inline-flex" }}
        >
          <Pastilha resultado>{demo.custo} €</Pastilha>
        </motion.span>
      </div>
    </div>
  );
}

/* ---------- o conteúdo de um aviso, dentro do assistente ---------- */

function ConteudoAviso({ aviso }) {
  const [desbloqueado, setDesbloqueado] = useState(false);
  const Icon = ICONES[aviso.icon] || IconEtiqueta;

  // Remonta a cada troca de aviso (key={aviso.id} no pai) — o estado já
  // nasce false sozinho; só falta agendar a revelação.
  useEffect(() => {
    const t = setTimeout(() => setDesbloqueado(true), 650);
    return () => clearTimeout(t);
  }, [aviso.id]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "16px" }}>
        <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "radial-gradient(circle at 35% 30%, #fdf4d8, #f6e7b4)", border: "1px solid #ecd9a0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon color="#a8842c" />
        </div>
        <div style={{ fontFamily: SERIF, fontSize: "21px", fontWeight: "600", color: "var(--charcoal)", lineHeight: 1.2 }}>
          {aviso.titulo}
        </div>
      </div>

      <p style={{ fontSize: "14px", lineHeight: 1.65, color: "var(--gray-mid)", fontFamily: SANS, margin: "0 0 16px" }}>
        {aviso.resumo}
      </p>

      {aviso.vantagens && <ListaVantagens itens={aviso.vantagens} />}
      {aviso.demoCalculo && <DemoCalculo demo={aviso.demoCalculo} />}

      {aviso.destinos?.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {aviso.destinos.map((d, i) => (
            <LinhaDestino key={d.nome} {...d} desbloqueado={desbloqueado} delay={i * 0.12} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- o assistente de ecrã inteiro ---------- */

function Assistente({ avisos, onFechar, onReconhecerUm }) {
  const [indice, setIndice] = useState(0);
  const aviso = avisos[indice];
  const ultimo = indice === avisos.length - 1;

  const avancar = () => {
    onReconhecerUm(aviso.id);
    if (ultimo) {
      onFechar();
    } else {
      setIndice((i) => i + 1);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(20,16,8,0.6)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <motion.div
        key={aviso.id}
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
        style={{
          width: "100%",
          maxWidth: "520px",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "linear-gradient(160deg, #fffdf8 0%, #fdf7ea 100%)",
          border: "1px solid #efe3c1",
          borderRadius: "20px",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.5)",
          padding: "26px 26px 22px",
        }}
      >
        {/* progresso */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "18px" }}>
          <span style={{ fontSize: "10.5px", fontWeight: "700", letterSpacing: "0.14em", textTransform: "uppercase", color: "#b59a4f", fontFamily: SANS }}>
            Actualização {indice + 1} de {avisos.length}
          </span>
          <div style={{ display: "flex", gap: "5px", marginLeft: "4px" }}>
            {avisos.map((a, i) => (
              <span
                key={a.id}
                style={{
                  width: "16px",
                  height: "3px",
                  borderRadius: "2px",
                  background: i <= indice ? "var(--gold)" : "#e6dab8",
                  transition: "background 0.3s",
                }}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={aviso.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.25, ease: EASE }}
          >
            <ConteudoAviso aviso={aviso} />
          </motion.div>
        </AnimatePresence>

        <button
          type="button"
          onClick={avancar}
          style={{
            width: "100%",
            marginTop: "22px",
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            background: "linear-gradient(135deg, #c9a227, #a8842c)",
            color: "#fff",
            fontSize: "13.5px",
            fontWeight: "700",
            letterSpacing: "0.02em",
            cursor: "pointer",
            boxShadow: "0 10px 26px -12px rgba(150,115,35,0.7)",
          }}
        >
          {ultimo ? "Percebi — vou usar assim ✓" : "Percebi — próxima actualização →"}
        </button>
        <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: "11px", color: "var(--gray-mid)", fontFamily: SANS }}>
          Isto ajuda o negócio — vale a pena perceber antes de continuar.
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ---------- a barra "gritante" ---------- */

function BarraAviso({ pendentes, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className="avisos-barra"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0, scale: [1, 1.012, 1] }}
      transition={{
        opacity: { duration: 0.4, ease: EASE },
        y: { duration: 0.4, ease: EASE },
        scale: { duration: 2.6, repeat: Infinity, ease: "easeInOut" },
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px 20px",
        borderRadius: "14px",
        border: "1.5px solid #e8c65c",
        background: "linear-gradient(135deg, #1c1710 0%, #2b2313 100%)",
        color: "#fff",
        cursor: "pointer",
        marginBottom: "10px",
        textAlign: "left",
        animation: "avisosBloqPulse 2.2s ease-in-out infinite",
      }}
    >
      {/* feixe de luz a percorrer a barra — a mesma ideia do brilho do
          logo (LogoDourado.jsx): "importante" lido como precioso, não
          como alarme. Passa, descansa, volta a passar. */}
      <motion.span
        aria-hidden="true"
        initial={{ x: "-30%" }}
        animate={{ x: "230%" }}
        transition={{ delay: 1, duration: 1.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "-40%",
          bottom: "-40%",
          left: 0,
          width: "26%",
          skewX: -18,
          background:
            "linear-gradient(105deg, rgba(232,213,163,0) 0%, rgba(232,213,163,0.4) 42%, rgba(255,250,235,0.65) 50%, rgba(232,213,163,0.4) 58%, rgba(232,213,163,0) 100%)",
          filter: "blur(3px)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        animate={{ rotate: [0, -13, 11, -8, 5, 0] }}
        transition={{ duration: 0.65, repeat: Infinity, repeatDelay: 2.3, ease: "easeInOut" }}
        style={{
          position: "relative",
          flexShrink: 0,
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "rgba(232,213,163,0.14)",
          border: "1px solid rgba(232,213,163,0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <IconAlerta />
        {/* o badge vermelho — o sinal universal de "por ler", tipo
            notificação de telemóvel. É a única coisa vermelha aqui de
            propósito: não é um erro, é uma contagem. */}
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            position: "absolute",
            top: "-5px",
            right: "-5px",
            minWidth: "19px",
            height: "19px",
            padding: "0 4px",
            borderRadius: "999px",
            background: "#e0483f",
            border: "2px solid #1c1710",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "10.5px",
            fontWeight: "800",
            color: "#fff",
            fontFamily: SANS,
            animation: "avisosBadgePulse 1.8s ease-in-out infinite",
          }}
        >
          {pendentes.length}
        </motion.span>
      </motion.div>
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <div style={{ fontSize: "10.5px", fontWeight: "700", letterSpacing: "0.14em", textTransform: "uppercase", color: "#e8d5a3", fontFamily: SANS, marginBottom: "2px" }}>
          Acção necessária
        </div>
        <div style={{ fontFamily: SERIF, fontSize: "18px", fontWeight: "600", lineHeight: 1.2 }}>
          {pendentes.length}{" "}
          {pendentes.length === 1 ? "actualização importante" : "actualizações importantes"} por reconhecer
        </div>
      </div>
      <div
        className="avisos-seta-pill"
        style={{
          position: "relative",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 16px",
          borderRadius: "999px",
          border: "1px solid rgba(232,213,163,0.5)",
          fontSize: "12px",
          fontWeight: "600",
          color: "#e8d5a3",
          whiteSpace: "nowrap",
          transition: "transform 0.25s ease, background 0.25s ease",
        }}
      >
        Ver e reconhecer
        <IconSeta />
      </div>
    </motion.button>
  );
}

/* ---------- o componente exportado ---------- */

export default function AvisosBloqueantes({ pagina, children }) {
  const [pendentes, setPendentes] = useState(() => listarAvisosPendentes(pagina));
  const [aberto, setAberto] = useState(false);
  const [avisosDaSessao, setAvisosDaSessao] = useState([]);
  const bloqueado = pendentes.length > 0;

  const handleReconhecerUm = (id) => {
    marcarAvisoReconhecido(id);
    setPendentes((prev) => prev.filter((a) => a.id !== id));
  };

  const abrir = () => {
    setAvisosDaSessao(pendentes);
    setAberto(true);
  };

  return (
    <>
      {bloqueado && (
        <style>{`
          @keyframes avisosBloqPulse {
            0%, 100% { box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 0 0 0 rgba(232,213,163,0.35); }
            50% { box-shadow: 0 8px 32px rgba(0,0,0,0.35), 0 0 0 8px rgba(232,213,163,0); }
          }
          @keyframes avisosBadgePulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(224,72,63,0.55); }
            50% { box-shadow: 0 0 0 5px rgba(224,72,63,0); }
          }
          .avisos-barra:hover .avisos-seta-pill {
            transform: translateX(4px);
            background: rgba(232,213,163,0.14);
          }
        `}</style>
      )}

      {bloqueado && (
        <>
          <BarraAviso pendentes={pendentes} onClick={abrir} />
          {/* o texto que pede, sem pedir desculpa, para ser lido — ganha
              o seu próprio cartão (não é uma legenda pequena por baixo
              da barra: é a segunda voz a falar, e tem de se notar tanto
              quanto a primeira). */}
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
            style={{
              position: "relative",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "14px 18px",
              marginBottom: "20px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #fdf7ea 0%, #fbf0d4 100%)",
              border: "1.5px solid #e0b93f",
              boxShadow: "0 10px 26px -16px rgba(180,140,40,0.55)",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                fontFamily: SERIF,
                fontSize: "30px",
                lineHeight: "0.6",
                color: "#c9a227",
                marginTop: "10px",
              }}
            >
              “
            </span>
            <p
              style={{
                margin: 0,
                fontFamily: SERIF,
                fontStyle: "italic",
                fontSize: "15px",
                lineHeight: 1.55,
                color: "#7a5f16",
              }}
            >
              Sei que parece só mais um aviso —{" "}
              <strong
                style={{
                  fontStyle: "normal",
                  fontWeight: 700,
                  color: "#5c4610",
                  boxShadow: "inset 0 -0.4em 0 rgba(211,167,44,0.35)",
                }}
              >
                mas este não
              </strong>
              . Lê-o, a sério: são segundos hoje que poupam horas mais tarde.
            </p>
          </motion.div>
        </>
      )}

      <AnimatePresence>
        {aberto && (
          <Assistente
            avisos={avisosDaSessao}
            onReconhecerUm={handleReconhecerUm}
            onFechar={() => setAberto(false)}
          />
        )}
      </AnimatePresence>

      <div
        aria-hidden={bloqueado}
        style={{
          pointerEvents: bloqueado ? "none" : "auto",
          filter: bloqueado ? "blur(3px) grayscale(0.25)" : "none",
          opacity: bloqueado ? 0.5 : 1,
          userSelect: bloqueado ? "none" : "auto",
          transition: "filter 0.4s ease, opacity 0.4s ease",
        }}
      >
        {children}
      </div>
    </>
  );
}
