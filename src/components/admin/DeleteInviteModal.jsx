import { motion, AnimatePresence } from "framer-motion";

// Confirmação de remoção de convite — extraída do AdminPage sem mudar
// comportamento. É apresentação pura: não toca em dados, só mostra a UI e
// chama callbacks. A query de remoção fica no pai (onConfirm).
//
// Props:
//   invite    — o convite a remover (null = fechado)
//   onCancel  — fecha sem remover
//   onConfirm — confirma a remoção (o pai corre a query)
//   getTitulo(invite) — título legível do convite
export default function DeleteInviteModal({
  invite,
  onCancel,
  onConfirm,
  getTitulo,
}) {
  return (
    <AnimatePresence>
      {invite && (
        <motion.div
          onClick={onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "28px 24px",
              width: "100%",
              maxWidth: "380px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "50%",
                backgroundColor: "#FEF2F2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#DC2626"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </div>
            <h3
              style={{
                fontSize: "16px",
                color: "var(--charcoal)",
                margin: "0 0 8px 0",
                fontFamily: "Playfair Display, serif",
              }}
            >
              Remover convite?
            </h3>
            <p
              style={{
                fontSize: "13px",
                color: "var(--gray-mid)",
                margin: "0 0 22px 0",
                lineHeight: "1.6",
              }}
            >
              O convite de <strong>{getTitulo(invite)}</strong> será removido.
              Esta ação não pode ser anulada.
            </p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={onCancel}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "500",
                  border: "1.5px solid var(--gold-light)",
                  color: "var(--gray-mid)",
                  backgroundColor: "white",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                style={{
                  flex: 1,
                  padding: "11px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "600",
                  border: "none",
                  color: "white",
                  backgroundColor: "#DC2626",
                  cursor: "pointer",
                }}
              >
                Remover
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
