import logoUrl from "../../assets/logo.png";

// ============================================================
// Navegacao — a casca de navegação da app.
// Desktop: sidebar lateral coroada pelo logo, tudo visível.
// Telemóvel: barra inferior + folha "Mais".
//
// Ícones de LINHA FINA desenhados à medida (stroke 1.5, dourado por
// herança de cor) — nada de emoji: a marca é "Do Luxo à Mesa", e a
// interface tem de estar à altura da etiqueta.
// Os ids dos separadores NUNCA mudam (regra de ouro).
// ============================================================

export const NAV_PRINCIPAL = [
  { id: "inicio", label: "Início", icone: "inicio" },
  { id: "clientes", label: "Clientes", icone: "contactos" },
  { id: "calendario", label: "Agenda", icone: "agenda" },
  { id: "orcamentos", label: "Documentos", icone: "documentos" },
];

export const NAV_GESTAO = [
  { id: "operacional", label: "Logística", icone: "logistica" },
  { id: "convites", label: "Formulários", icone: "formularios" },
  { id: "mensagens", label: "Mensagens", icone: "mensagens" },
  { id: "dashboard", label: "Dashboard", icone: "dashboard" },
];

export const NAV_CONFIG = [
  { id: "tiposEvento", label: "Modelos de Evento", icone: "modelos" },
];

export const IDS_NO_MAIS = [...NAV_GESTAO, ...NAV_CONFIG].map((n) => n.id);

// ------------------------------------------------------------
// Ícones de linha fina (herdam a cor do texto via currentColor)
// ------------------------------------------------------------
export function Icone({ nome, tamanho = 18 }) {
  const t = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const desenhos = {
    inicio: (
      <>
        <path {...t} d="M3.5 11.5 12 4.5l8.5 7" />
        <path {...t} d="M5.5 10v10h13V10" />
      </>
    ),
    contactos: (
      <>
        <circle {...t} cx="9" cy="8" r="3.2" />
        <path {...t} d="M3.5 19.5c0-3.1 2.5-4.8 5.5-4.8s5.5 1.7 5.5 4.8" />
        <circle {...t} cx="17" cy="9" r="2.4" />
        <path {...t} d="M16.5 14.7c2.4.4 4 1.8 4 4.3" />
      </>
    ),
    agenda: (
      <>
        <rect {...t} x="4" y="5.5" width="16" height="14.5" rx="2" />
        <path {...t} d="M4 9.5h16M8 3.5v4M16 3.5v4" />
      </>
    ),
    documentos: (
      <>
        <path {...t} d="M7 3.5h7l4 4V20.5H7z" />
        <path {...t} d="M14 3.5V8h4M9.5 12.5h5M9.5 16h5" />
      </>
    ),
    logistica: (
      <>
        <path {...t} d="M12 3l8 4v10l-8 4-8-4V7z" />
        <path {...t} d="M4 7l8 4 8-4M12 11v10" />
      </>
    ),
    formularios: (
      <>
        <rect {...t} x="6" y="4.5" width="12" height="16" rx="2" />
        <rect {...t} x="9" y="3" width="6" height="3" rx="1" />
        <path {...t} d="M9 11h6M9 14.5h6" />
      </>
    ),
    funil: (
      <>
        <path {...t} d="M4.5 5h15l-5.5 6.5V17l-4 2.5v-8z" />
      </>
    ),
    mensagens: (
      <>
        <path
          {...t}
          d="M12 5c-4.1 0-7.5 2.6-7.5 5.9 0 1.5.7 2.9 1.9 3.9L5.5 18.5l3.7-1.6c.9.3 1.8.4 2.8.4 4.1 0 7.5-2.6 7.5-5.9S16.1 5 12 5z"
        />
      </>
    ),
    dashboard: (
      <>
        <path {...t} d="M5.5 19.5V12M11 19.5V6.5M16.5 19.5V10" />
        <path {...t} d="M4 20.5h16" />
      </>
    ),
    modelos: (
      <>
        <path {...t} d="M12 3.5l8 4.2-8 4.2-8-4.2z" />
        <path {...t} d="M4.5 12.5l7.5 4 7.5-4" />
        <path {...t} d="M4.5 16.5l7.5 4 7.5-4" />
      </>
    ),
    sair: (
      <>
        <path {...t} d="M14 4.5H7A1.5 1.5 0 005.5 6v12A1.5 1.5 0 007 19.5h7" />
        <path {...t} d="M16.5 8.5 20 12l-3.5 3.5M10 12h10" />
      </>
    ),
    mais: (
      <>
        <circle cx="5" cy="12" r="1.6" fill="currentColor" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        <circle cx="19" cy="12" r="1.6" fill="currentColor" />
      </>
    ),
  };
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      {desenhos[nome] || null}
    </svg>
  );
}

// ------------------------------------------------------------
// Item de navegação (partilhado entre sidebar e folha Mais)
// ------------------------------------------------------------
function ItemNav({ item, ativo, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        width: "100%",
        padding: "10px 14px",
        borderRadius: "10px",
        cursor: "pointer",
        textAlign: "left",
        backgroundColor: ativo ? "#FBF7EF" : "transparent",
        color: ativo ? "var(--gold-dark)" : "var(--gray-mid)",
        transition: "all 0.15s",
      }}
    >
      <Icone nome={item.icone} tamanho={18} />
      <span
        style={{
          fontSize: "14px",
          fontWeight: ativo ? "600" : "400",
          letterSpacing: "0.02em",
          whiteSpace: "nowrap",
        }}
      >
        {item.label}
      </span>
    </button>
  );
}

function TituloSeccao({ children }) {
  return (
    <p
      style={{
        fontSize: "9px",
        fontWeight: "600",
        color: "var(--gold)",
        textTransform: "uppercase",
        letterSpacing: "0.22em",
        margin: "22px 0 8px 14px",
      }}
    >
      {children}
    </p>
  );
}

// ------------------------------------------------------------
// SIDEBAR — desktop
// ------------------------------------------------------------
export function SidebarNav({ activeTab, onNavegar, onSair }) {
  return (
    <div
      style={{
        width: "248px",
        flexShrink: 0,
        backgroundColor: "white",
        borderRight: "1px solid #F0E6D0",
        height: "100vh",
        position: "sticky",
        top: 0,
        display: "flex",
        flexDirection: "column",
        padding: "28px 14px 18px",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      {/* O logo coroa a sidebar */}
      <div style={{ textAlign: "center", marginBottom: "26px" }}>
        <img
          src={logoUrl}
          alt="Do Luxo à Mesa"
          style={{ width: "132px", height: "auto", margin: "0 auto" }}
        />
      </div>

      {NAV_PRINCIPAL.map((item) => (
        <ItemNav
          key={item.id}
          item={item}
          ativo={activeTab === item.id}
          onClick={() => onNavegar(item.id)}
        />
      ))}

      <TituloSeccao>Gestão</TituloSeccao>
      {NAV_GESTAO.map((item) => (
        <ItemNav
          key={item.id}
          item={item}
          ativo={activeTab === item.id}
          onClick={() => onNavegar(item.id)}
        />
      ))}

      <div
        style={{
          marginTop: "auto",
          borderTop: "1px solid #F0E6D0",
          paddingTop: "10px",
        }}
      >
        {NAV_CONFIG.map((item) => (
          <ItemNav
            key={item.id}
            item={item}
            ativo={activeTab === item.id}
            onClick={() => onNavegar(item.id)}
          />
        ))}
        <ItemNav
          item={{ id: "__sair", label: "Sair", icone: "sair" }}
          ativo={false}
          onClick={onSair}
        />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// BARRA INFERIOR — telemóvel
// ------------------------------------------------------------
export function BottomNavMovel({ activeTab, onNavegar, onAbrirMais }) {
  const maisAtivo = IDS_NO_MAIS.includes(activeTab);
  const itens = [
    ...NAV_PRINCIPAL.map((n) => ({ ...n, acao: () => onNavegar(n.id) })),
    { id: "__mais", label: "Mais", icone: "mais", acao: onAbrirMais },
  ];
  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        backgroundColor: "white",
        borderTop: "1px solid #F0E6D0",
        display: "flex",
        padding: "8px 4px calc(8px + env(safe-area-inset-bottom))",
      }}
    >
      {itens.map((item) => {
        const ativo =
          item.id === "__mais" ? maisAtivo : activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={item.acao}
            style={{
              flex: 1,
              border: "none",
              background: "none",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              color: ativo ? "var(--gold-dark)" : "var(--gray-mid)",
            }}
          >
            <Icone nome={item.icone} tamanho={19} />
            <span
              style={{
                fontSize: "10px",
                fontWeight: ativo ? "600" : "400",
                letterSpacing: "0.02em",
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// FOLHA "MAIS" — telemóvel
// ------------------------------------------------------------
export function SheetMais({ activeTab, onNavegar, onSair, onFechar }) {
  return (
    <div
      onClick={onFechar}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 45,
        backgroundColor: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          backgroundColor: "white",
          borderRadius: "18px 18px 0 0",
          padding: "10px 14px calc(18px + env(safe-area-inset-bottom))",
          boxShadow: "0 -6px 24px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "4px",
            borderRadius: "999px",
            backgroundColor: "#F0E6D0",
            margin: "0 auto 12px",
          }}
        />
        {[...NAV_GESTAO, ...NAV_CONFIG].map((item) => (
          <ItemNav
            key={item.id}
            item={item}
            ativo={activeTab === item.id}
            onClick={() => {
              onNavegar(item.id);
              onFechar();
            }}
          />
        ))}
        <div
          style={{
            borderTop: "1px solid #F0E6D0",
            marginTop: "8px",
            paddingTop: "8px",
          }}
        >
          <ItemNav
            item={{ id: "__sair", label: "Sair", icone: "sair" }}
            ativo={false}
            onClick={onSair}
          />
        </div>
      </div>
    </div>
  );
}