import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================
// AvisoDataDoEvento — lembrete permanente (não um tour, a Nádia não
// os lê) no topo de "Modelos de Evento": mostra, em loop, o gesto de
// marcar um campo de data com o papel "Data do evento" — o único elo
// entre um modelo e o Dashboard/Funil (ver SubmissionDrawer.jsx,
// FIELD_MAP_INVERSO + papel "data"). Criar um modelo é raro, por isso
// aparece sempre, sem depender de estado nenhum — nunca é "visto e
// esquecido" como um tour.
// ============================================================

const PASSOS = ["fechado", "aberto", "escolhido", "pausa"];
const DURACOES = { fechado: 1400, aberto: 1300, escolhido: 900, pausa: 1800 };

function useCicloDemo() {
  const [passo, setPasso] = useState(0);
  useEffect(() => {
    const nome = PASSOS[passo];
    const t = setTimeout(
      () => setPasso((p) => (p + 1) % PASSOS.length),
      DURACOES[nome],
    );
    return () => clearTimeout(t);
  }, [passo]);
  return PASSOS[passo];
}

// A miniatura do dropdown "Papel deste campo" a marcar-se sozinha.
function MiniDropdownDemo() {
  const fase = useCicloDemo();
  const aberto = fase === "aberto";
  const escolhido = fase === "escolhido" || fase === "pausa";

  return (
    <div style={{ width: "172px", flexShrink: 0 }}>
      <p
        style={{
          fontSize: "9px",
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--gray-mid)",
          margin: "0 0 4px 0",
        }}
      >
        Papel deste campo
      </p>
      <div style={{ position: "relative" }}>
        <motion.div
          animate={{
            borderColor: escolhido ? "#86EFAC" : "var(--gold-light)",
            backgroundColor: escolhido ? "#F0FDF4" : "white",
          }}
          transition={{ duration: 0.25 }}
          style={{
            border: "1.5px solid",
            borderRadius: "8px",
            padding: "8px 10px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "12px",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={escolhido ? "sel" : "none"}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              style={{
                color: escolhido ? "#166534" : "var(--charcoal)",
                fontWeight: escolhido ? "600" : "400",
              }}
            >
              {escolhido ? "Data do evento" : "Nenhum"}
            </motion.span>
          </AnimatePresence>
          <motion.span
            animate={{ rotate: aberto ? 180 : 0 }}
            transition={{ duration: 0.25 }}
            style={{ fontSize: "9px", color: "var(--gray-mid)" }}
          >
            ▾
          </motion.span>
        </motion.div>

        {/* opções — só na fase "aberto" */}
        <AnimatePresence>
          {aberto && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                backgroundColor: "white",
                border: "1px solid var(--gold-light)",
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  padding: "6px 10px",
                  fontSize: "11px",
                  color: "var(--gray-mid)",
                }}
              >
                Nenhum
              </div>
              <motion.div
                animate={{ backgroundColor: ["#FEF9EC", "#F5E4AE", "#FEF9EC"] }}
                transition={{ duration: 1, repeat: 1 }}
                style={{
                  padding: "6px 10px",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "var(--gold-dark)",
                }}
              >
                Data do evento
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ✓ a aparecer quando fica escolhido */}
        <AnimatePresence>
          {escolhido && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 16 }}
              style={{
                position: "absolute",
                right: "-22px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#16A34A",
                fontSize: "16px",
                fontWeight: "700",
              }}
            >
              ✓
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function AvisoDataDoEvento() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{
        backgroundColor: "#FFFDF7",
        border: "1px solid var(--gold-light)",
        borderRadius: "16px",
        padding: "18px 20px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        gap: "22px",
        flexWrap: "wrap",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      }}
    >
      <MiniDropdownDemo />
      <div style={{ flex: 1, minWidth: "220px" }}>
        <p
          style={{
            fontSize: "13px",
            fontWeight: "600",
            fontFamily: "Playfair Display, serif",
            color: "var(--charcoal)",
            margin: "0 0 4px 0",
          }}
        >
          🗓️ Uma data para o Dashboard saber
        </p>
        <p
          style={{
            fontSize: "12.5px",
            color: "var(--gray-mid)",
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          Sempre que um campo do modelo for a data do evento, marca o
          "Papel deste campo" como{" "}
          <strong style={{ color: "var(--gold-dark)" }}>
            Data do evento
          </strong>
          . É o que liga esse modelo ao Dashboard e ao Funil — sem isso, a
          data fica presa no formulário e nunca aparece lá fora.
        </p>
      </div>
    </motion.div>
  );
}
