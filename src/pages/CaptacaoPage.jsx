import { useState } from "react";
import { motion } from "framer-motion";
import logoUrl from "../assets/logo.png";
import CaptacaoForm from "../components/captacao/CaptacaoForm";

// ============================================================
// CaptacaoPage — a página pública /interesse: a porta do funil.
// Sem código de acesso, fricção zero: a Nádia cola o link na bio do
// Instagram ou envia-o na conversa; a pessoa preenche em 2 minutos.
// Ao submeter, nasce a pessoa (clientes) + o evento (fase interessado)
// e o interessado aparece no funil do admin.
// ============================================================

export default function CaptacaoPage() {
  const [enviado, setEnviado] = useState(false);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--cream)",
        fontFamily: "Inter, sans-serif",
        display: "flex",
        justifyContent: "center",
        padding: "24px 16px 48px",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ width: "100%", maxWidth: "440px" }}
      >
        {/* Cabeçalho da marca */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <img
            src={logoUrl}
            alt="Do Luxo à Mesa"
            style={{ width: "84px", height: "auto", margin: "0 auto 10px" }}
          />
          <h1
            style={{
              fontSize: "18px",
              color: "var(--gold)",
              fontFamily: "Playfair Display, serif",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              margin: "0 0 4px 0",
            }}
          >
            Do Luxo à Mesa
          </h1>
          {!enviado && (
            <p
              style={{
                fontSize: "13px",
                color: "var(--gray-mid)",
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Conta-nos sobre o teu evento — respondemos em breve 🤍
            </p>
          )}
        </div>

        <div
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
              <div
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
                }}
              >
                ✓
              </div>
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
            <CaptacaoForm onSubmetido={() => setEnviado(true)} />
          )}
        </div>

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
      </motion.div>
    </div>
  );
}
