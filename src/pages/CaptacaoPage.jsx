import { useEffect, useRef, useState } from "react";
import { motion, useScroll, AnimatePresence } from "framer-motion";
import logoUrl from "../assets/logo.png";
import CaptacaoForm from "../components/captacao/CaptacaoForm";

// ============================================================
// CaptacaoPage — a página pública /interesse: a porta do funil.
// Sem código de acesso, fricção zero: a Nádia cola o link na bio do
// Instagram ou envia-o na conversa; a pessoa preenche em 2 minutos.
// Ao submeter, nasce a pessoa (clientes) + o evento (fase interessado)
// e o interessado aparece no funil do admin.
//
// Redesign "hero + barra dourada" (v9):
//   • Halo de champanhe: só a área atrás do logo ganha um tom mais
//     profundo da paleta (#E8D5A3 translúcido, ancorado ao logo) que
//     se dissolve no cream sem borda — luz de vela sobre linho, não
//     é uma forma. Um raio cónico gira sobre o halo como ponteiro
//     de relógio (24s/volta, luz difusa). O logo ganha um drop-shadow suave que
//     levanta as letras do fundo.
//   • Brilho de joalharia: um feixe de luz varre as LETRAS do logo
//     (máscara com o próprio PNG — o brilho só existe onde há ouro),
//     como o reflexo num anel dentro da montra. Passa, descansa,
//     volta a passar.
//   • Poeira de ouro: partículas ✦ sobem devagar à volta do halo,
//     acendem e apagam em tempos desencontrados — champanhe vivo.
//   • Tagline em serifa (Playfair) emoldurada por hairlines douradas
//     que crescem do centro.
//   • Fio de progresso dourado no topo acompanha o scroll.
//   • Barra fixa no fundo que se enche de ouro com os obrigatórios.
//   • Guarda dos opcionais: pílula sobre a barra quando falta ver o
//     fundo da página (toque = scroll suave; some ao chegar lá).
// ============================================================

// Easing da casa: começa decidido, assenta devagar. O luxo move-se devagar.
const EASE_LUXO = [0.22, 1, 0.36, 1];

// Poeira de ouro à volta do halo: posições em % do contentor do logo.
// Tempos primos entre si — os ciclos nunca sincronizam, o brilho
// parece vivo em vez de coreografado.
const POEIRA = [
  { left: "6%", top: "22%", size: 11, delay: 0.8, dur: 5.2, drift: -22 },
  { left: "93%", top: "30%", size: 9, delay: 2.1, dur: 6.1, drift: -18 },
  { left: "-4%", top: "62%", size: 8, delay: 3.4, dur: 5.7, drift: -20 },
  { left: "101%", top: "68%", size: 12, delay: 1.5, dur: 6.7, drift: -26 },
  { left: "14%", top: "88%", size: 7, delay: 4.6, dur: 5.3, drift: -16 },
  { left: "84%", top: "94%", size: 9, delay: 0.2, dur: 7.1, drift: -24 },
  { left: "50%", top: "-6%", size: 8, delay: 2.9, dur: 6.3, drift: -14 },
];

export default function CaptacaoPage() {
  const [enviado, setEnviado] = useState(false);
  // Progresso dos campos obrigatórios, reportado pelo CaptacaoForm
  const [progresso, setProgresso] = useState({
    feitos: 0,
    total: 5,
    completo: false,
    enviando: false,
  });
  // Perto do fundo da página? (controla a pílula dos opcionais)
  const [pertoDoFundo, setPertoDoFundo] = useState(false);
  // O CaptacaoForm regista aqui a sua função de envio, para a barra
  // externa poder disparar a submissão (uma verdade, dois botões não)
  const submeterRef = useRef(null);
  // Fio de progresso do scroll (topo do ecrã)
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const verificar = () => {
      const distancia =
        document.documentElement.scrollHeight -
        window.innerHeight -
        window.scrollY;
      setPertoDoFundo(distancia < 140);
    };
    verificar();
    window.addEventListener("scroll", verificar, { passive: true });
    window.addEventListener("resize", verificar);
    return () => {
      window.removeEventListener("scroll", verificar);
      window.removeEventListener("resize", verificar);
    };
  }, []);

  const faltam = progresso.total - progresso.feitos;
  const pct = Math.round((progresso.feitos / progresso.total) * 100);
  const barraCheia = progresso.completo;

  const aoTocarNaBarra = () => {
    // Mesmo incompleto, deixa submeter: o validar() do formulário
    // acende os erros inline e guia a pessoa até ao que falta
    if (submeterRef.current) submeterRef.current();
  };

  const irParaOsOpcionais = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--cream)",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        justifyContent: "center",
        padding: "30px 16px 130px",
      }}
    >
      {/* Fio condutor: linha dourada finíssima que acompanha o scroll */}
      {!enviado && (
        <motion.div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "2.5px",
            backgroundColor: "var(--gold)",
            transformOrigin: "0 0",
            scaleX: scrollYProgress,
            zIndex: 60,
          }}
        />
      )}

      <div style={{ width: "100%", maxWidth: "440px" }}>
        {/* Hero: halo de champanhe — não é forma, é luz. O tom mais
            profundo atrás do logo dá corpo ao ouro e às pérolas. */}
        <div
          style={{
            textAlign: "center",
            padding: "16px 0 4px",
            marginBottom: "20px",
          }}
        >
          {/* O halo vive ancorado ao logo (inline-block relativo):
              o pico de champanhe fica exatamente atrás das pérolas e
              do "by luxury events", e centra-se via x/y do framer —
              nunca por transform manual, que o motion sobrescreve */}
          <div style={{ position: "relative", display: "inline-block" }}>
            {/* Halo base: centro a 46% — o pico atrás do título/pérolas, — a zona mais profunda
                e a cauda inferior mais clara dá contraste ao texto escuro
                "by luxury events" (texto escuro pede fundo claro) */}
            <motion.span
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.1, ease: EASE_LUXO }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                x: "-50%",
                y: "-50%",
                width: "400px",
                height: "340px",
                maxWidth: "94vw",
                background:
                  "radial-gradient(closest-side at 50% 46%, rgba(232,213,163,0.62) 0%, rgba(236,222,184,0.40) 38%, rgba(246,240,226,0.18) 60%, rgba(250,247,240,0) 78%)",
                pointerEvents: "none",
              }}
            />
            {/* Raio de relógio: um setor de luz cónico que dá uma
                volta a cada 24s. Quadrado perfeito (rotação sem
                oscilação), centrado via x/y do framer e mascarado
                radialmente para se dissolver como o halo. */}
            <motion.span
              aria-hidden="true"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              transition={{
                opacity: { delay: 0.5, duration: 1.4, ease: "easeOut" },
                rotate: { duration: 24, repeat: Infinity, ease: "linear" },
              }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                x: "-50%",
                y: "-50%",
                width: "350px",
                height: "350px",
                maxWidth: "94vw",
                background:
                  "conic-gradient(from 0deg, rgba(255,252,242,0) 0deg, rgba(255,250,235,0.16) 30deg, rgba(255,250,235,0.26) 60deg, rgba(232,213,163,0.18) 90deg, rgba(255,252,242,0) 130deg, rgba(255,252,242,0) 360deg)",
                WebkitMaskImage:
                  "radial-gradient(circle closest-side, black 38%, transparent 74%)",
                maskImage:
                  "radial-gradient(circle closest-side, black 38%, transparent 74%)",
                pointerEvents: "none",
              }}
            />
            {/* Poeira de ouro: partículas que sobem e cintilam à volta
                do logo — nunca por cima das letras (posições na orla) */}
            {POEIRA.map((p, i) => (
              <motion.span
                key={i}
                aria-hidden="true"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.85, 0], y: [6, p.drift] }}
                transition={{
                  delay: p.delay,
                  duration: p.dur,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  position: "absolute",
                  left: p.left,
                  top: p.top,
                  fontSize: `${p.size}px`,
                  lineHeight: 1,
                  color: "var(--gold)",
                  textShadow: "0 0 6px rgba(232,213,163,0.9)",
                  pointerEvents: "none",
                  userSelect: "none",
                }}
              >
                ✦
              </motion.span>
            ))}
            <motion.img
              src={logoUrl}
              alt="Do Luxo à Mesa"
              initial={{ opacity: 0, scale: 0.94, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE_LUXO }}
              style={{
                width: "200px",
                height: "auto",
                display: "block",
                position: "relative",
                // saturate/contrast levíssimos: dão corpo ao ouro e ao
                // "by luxury events" sem o logo parecer editado
                filter:
                  "saturate(1.08) contrast(1.06) drop-shadow(0 2px 10px rgba(201,168,76,0.35)) drop-shadow(0 1px 2px rgba(160,120,48,0.25))",
              }}
            />
            {/* Brilho de joalharia: o próprio PNG do logo serve de
                máscara, por isso o feixe de luz só acende as LETRAS —
                varre, descansa uns segundos, volta a varrer */}
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                WebkitMaskImage: `url(${logoUrl})`,
                maskImage: `url(${logoUrl})`,
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                pointerEvents: "none",
              }}
            >
              <motion.span
                initial={{ x: "-160%" }}
                animate={{ x: "260%" }}
                transition={{
                  delay: 1.2,
                  duration: 1.9,
                  repeat: Infinity,
                  repeatDelay: 4.2,
                  ease: "easeInOut",
                }}
                style={{
                  position: "absolute",
                  top: "-25%",
                  bottom: "-25%",
                  left: 0,
                  width: "55%",
                  skewX: -16,
                  background:
                    "linear-gradient(105deg, rgba(255,253,244,0) 0%, rgba(255,252,240,0.55) 38%, rgba(255,255,250,0.95) 50%, rgba(255,252,240,0.55) 62%, rgba(255,253,244,0) 100%)",
                  filter: "blur(4px)",
                }}
              />
            </span>
          </div>
          {!enviado && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35, duration: 0.8, ease: "easeOut" }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                maxWidth: "360px",
                margin: "20px auto 0",
                position: "relative",
              }}
            >
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.55, duration: 0.9, ease: EASE_LUXO }}
                style={{
                  flex: 1,
                  height: "1px",
                  transformOrigin: "100% 50%",
                  background:
                    "linear-gradient(to left, var(--gold), rgba(232,213,163,0))",
                }}
              />
              <p
                style={{
                  fontSize: "15px",
                  fontFamily: "Playfair Display, serif",
                  fontStyle: "italic",
                  color: "var(--charcoal)",
                  letterSpacing: "0.02em",
                  margin: 0,
                  lineHeight: 1.6,
                  whiteSpace: "nowrap",
                }}
              >
                Conta-nos sobre o teu evento 🤍
              </p>
              <motion.span
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.55, duration: 0.9, ease: EASE_LUXO }}
                style={{
                  flex: 1,
                  height: "1px",
                  transformOrigin: "0% 50%",
                  background:
                    "linear-gradient(to right, var(--gold), rgba(232,213,163,0))",
                }}
              />
            </motion.div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6, ease: EASE_LUXO }}
          style={{
            backgroundColor: "white",
            borderRadius: "16px",
            padding: "24px 20px",
            border: "1px solid var(--gold-light)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
          }}
        >
          {enviado ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              style={{ textAlign: "center", padding: "24px 8px" }}
            >
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.15, duration: 0.5, ease: EASE_LUXO }}
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "#FBF7EF",
                  border: "1.5px solid var(--gold-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "26px",
                  margin: "0 auto 14px",
                  color: "var(--gold-dark)",
                }}
              >
                ✓
              </motion.div>
              <h2
                style={{
                  fontSize: "18px",
                  fontFamily: "Playfair Display, serif",
                  color: "var(--charcoal)",
                  margin: "0 0 8px 0",
                }}
              >
                Pedido recebido 🤍
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--gray-mid)",
                  margin: 0,
                  lineHeight: 1.7,
                }}
              >
                Obrigada! Vamos analisar o teu pedido e entramos em contacto
                muito em breve.
              </p>
            </motion.div>
          ) : (
            <CaptacaoForm
              onSubmetido={() => setEnviado(true)}
              ocultarBotao
              onProgresso={setProgresso}
              registarSubmeter={(fn) => {
                submeterRef.current = fn;
              }}
            />
          )}
        </motion.div>

        <p
          style={{
            textAlign: "center",
            fontSize: "10px",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--gray-mid)",
            margin: "18px 0 0 0",
          }}
        >
          Do Luxo à Mesa · by Nádia Schultz
        </p>
      </div>

      {/* Guarda dos opcionais: com tudo obrigatório preenchido mas o
          fundo ainda por ver, uma pílula convida a descer antes de
          enviar — desaparece sozinha ao chegar lá */}
      <AnimatePresence>
        {!enviado &&
          barraCheia &&
          !pertoDoFundo &&
          !progresso.enviando && (
            <motion.button
              key="guarda-opcionais"
              onClick={irParaOsOpcionais}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.45, ease: EASE_LUXO }}
              style={{
                position: "fixed",
                bottom: "calc(88px + env(safe-area-inset-bottom))",
                left: "50%",
                transform: "translateX(-50%)",
                padding: "8px 16px",
                borderRadius: "999px",
                border: "1px solid var(--gold-light)",
                backgroundColor: "white",
                color: "var(--gold-dark)",
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.02em",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(201,168,76,0.25)",
                zIndex: 55,
                whiteSpace: "nowrap",
              }}
            >
              Ainda há detalhes opcionais em baixo ↓
            </motion.button>
          )}
      </AnimatePresence>

      {/* Barra dourada: o envio nunca se esconde — enche-se de ouro
          à medida que os detalhes obrigatórios ficam completos */}
      <AnimatePresence>
        {!enviado && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0, transition: { duration: 0.4 } }}
            transition={{ delay: 0.55, duration: 0.6, ease: EASE_LUXO }}
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              padding: "12px 16px calc(14px + env(safe-area-inset-bottom))",
              backgroundColor: "rgba(250,247,240,0.9)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderTop: "1px solid #F0E6D0",
              display: "flex",
              justifyContent: "center",
              zIndex: 50,
            }}
          >
            <motion.button
              onClick={aoTocarNaBarra}
              disabled={progresso.enviando}
              animate={
                barraCheia && !progresso.enviando
                  ? { scale: [1, 1.015, 1] }
                  : { scale: 1 }
              }
              transition={
                barraCheia && !progresso.enviando
                  ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.3 }
              }
              style={{
                position: "relative",
                width: "100%",
                maxWidth: "440px",
                padding: "15px",
                borderRadius: "999px",
                border: "none",
                overflow: "hidden",
                backgroundColor: "#EFE7D3",
                cursor: progresso.enviando ? "wait" : "pointer",
                boxShadow: barraCheia
                  ? "0 6px 22px rgba(201,168,76,0.45)"
                  : "0 2px 10px rgba(201,168,76,0.18)",
                transition: "box-shadow 0.6s ease",
              }}
            >
              {/* O copo a encher-se de ouro */}
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: `${pct}%`,
                  backgroundColor: "var(--gold)",
                  transition: "width 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              />
              <span
                style={{
                  position: "relative",
                  fontSize: "14px",
                  fontWeight: "600",
                  letterSpacing: "0.03em",
                  color:
                    barraCheia || pct > 55 ? "white" : "var(--gold-dark)",
                  transition: "color 0.5s ease",
                }}
              >
                {progresso.enviando
                  ? "A enviar..."
                  : barraCheia
                    ? "Enviar pedido"
                    : `Faltam ${faltam} ${faltam === 1 ? "detalhe" : "detalhes"} ✧`}
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}