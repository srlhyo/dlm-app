import { useMemo } from "react";
import { getResumoSubmissao } from "../../lib/submissionFields";

// Formata uma janela de datas de forma legível, ao dia.
// Ex: "10 – 14 de julho" (mesmo mês) ou "28 jun – 2 jul" (meses diferentes).
const formatarJanela = (janela) => {
  if (!janela || !janela.inicio || !janela.fim) return "";
  const opt = { day: "2-digit", month: "long" };
  const optCurto = { day: "2-digit", month: "short" };
  const ini = new Date(janela.inicio);
  const fim = new Date(janela.fim);
  const mesmoMes = ini.getUTCMonth() === fim.getUTCMonth();
  if (mesmoMes) {
    const dia1 = ini.getUTCDate();
    const resto = fim.toLocaleDateString("pt-PT", { ...opt, timeZone: "UTC" });
    return `${dia1} – ${resto}`;
  }
  return `${ini.toLocaleDateString("pt-PT", { ...optCurto, timeZone: "UTC" })} – ${fim.toLocaleDateString("pt-PT", { ...optCurto, timeZone: "UTC" })}`;
};

const formatarDataCurta = (data) => {
  if (!data) return "sem data";
  return new Date(data).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
};

// ============================================================
// AlertasTab — sub-tab "Alertas" da OperacionalTab (Fase C).
//
// Apresentação pura: NÃO carrega nem calcula. Recebe os alertas já
// prontos do OperacionalTab (que os calcula uma vez, partilhados com o
// badge da sub-navegação), e desenha.
//
// Distingue dois casos:
//   • Rutura real (stock > 0 mas insuficiente) → vermelho, "faltam X"
//   • Stock por definir (stock = 0)            → âmbar, "sem stock definido"
//
// Props:
//   alertas      — lista já calculada (calcularAlertas)
//   loading      — se os dados ainda estão a carregar
//   submissions  — eventos (para títulos legíveis)
//   eventTypes   — tipos de evento (para getResumoSubmissao)
// ============================================================
export default function AlertasTab({
  alertas = [],
  loading = false,
  submissions = [],
  eventTypes = [],
}) {
  // Título legível de um evento (genérico, funciona para qualquer tipo)
  const tituloEvento = useMemo(() => {
    const cache = new Map();
    return (submissionId) => {
      if (cache.has(submissionId)) return cache.get(submissionId);
      const sub = submissions.find((s) => s.id === submissionId);
      const titulo = sub
        ? getResumoSubmissao(sub, eventTypes).titulo
        : "Evento";
      cache.set(submissionId, titulo);
      return titulo;
    };
  }, [submissions, eventTypes]);

  if (loading) {
    return (
      <p
        style={{
          textAlign: "center",
          padding: "60px",
          color: "var(--gray-mid)",
          fontSize: "14px",
        }}
      >
        A analisar o stock...
      </p>
    );
  }

  // Estado bom — sem conflitos. Acolhedor, não parece erro.
  if (alertas.length === 0) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "50px 24px",
          backgroundColor: "#F0FDF4",
          borderRadius: "16px",
          border: "1px solid #BBF7D0",
        }}
      >
        <p style={{ fontSize: "36px", margin: "0 0 12px 0" }}>✓</p>
        <p
          style={{
            fontSize: "15px",
            fontWeight: "600",
            color: "#166534",
            margin: "0 0 6px 0",
            fontFamily: "Playfair Display, serif",
          }}
        >
          Sem conflitos de stock
        </p>
        <p
          style={{
            fontSize: "13px",
            color: "#166534",
            margin: 0,
            maxWidth: "360px",
            marginInline: "auto",
            lineHeight: 1.5,
          }}
        >
          Tudo o que os teus eventos pedem cabe no que tens. Se adicionares
          eventos ou materiais, os avisos aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Intro */}
      <p
        style={{
          fontSize: "13px",
          color: "var(--gray-mid)",
          margin: "0 0 20px 0",
          maxWidth: "560px",
          lineHeight: 1.5,
        }}
      >
        Materiais pedidos por eventos próximos em maior quantidade do que tens
        em stock. Cada aviso junta os eventos que partilham o mesmo período.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {alertas.map((alerta, idx) => (
          <AlertaCard
            key={`${alerta.materialId}-${idx}`}
            alerta={alerta}
            tituloEvento={tituloEvento}
          />
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Cartão de um alerta (material × janela)
// ------------------------------------------------------------
function AlertaCard({ alerta, tituloEvento }) {
  // Stock a 0 → "por definir" (âmbar). Stock > 0 mas insuficiente → rutura (vermelho).
  const porDefinir = alerta.stock <= 0;

  const cor = porDefinir
    ? {
        borda: "var(--gold-light)",
        fundo: "#FEF9EC",
        forte: "var(--gold-dark)",
        tenue: "#FBF7EF",
      }
    : {
        borda: "#FECACA",
        fundo: "#FEF2F2",
        forte: "#DC2626",
        tenue: "#FFF5F5",
      };

  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "14px",
        border: `1px solid ${cor.borda}`,
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}
    >
      {/* Cabeçalho: material + estado */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
          padding: "16px 18px",
          backgroundColor: cor.fundo,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontSize: "15px",
              fontWeight: "600",
              color: "var(--charcoal)",
              margin: "0 0 2px 0",
            }}
          >
            {alerta.material?.nome || "Material"}
          </p>
          <p style={{ fontSize: "12px", color: "var(--gray-mid)", margin: 0 }}>
            {formatarJanela(alerta.janela)}
          </p>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {porDefinir ? (
            <span
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: cor.forte,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              sem stock definido
            </span>
          ) : (
            <>
              <p
                style={{
                  fontSize: "22px",
                  fontWeight: "700",
                  color: cor.forte,
                  margin: 0,
                  lineHeight: 1,
                  fontFamily: "Playfair Display, serif",
                }}
              >
                −{alerta.falta}
              </p>
              <p
                style={{
                  fontSize: "10px",
                  color: cor.forte,
                  margin: "2px 0 0 0",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                em falta
              </p>
            </>
          )}
        </div>
      </div>

      {/* Aritmética */}
      <div
        style={{
          padding: "12px 18px",
          fontSize: "12px",
          color: "var(--gray-mid)",
          borderBottom: `1px solid ${cor.borda}`,
        }}
      >
        {porDefinir ? (
          <>
            Os eventos pedem <strong>{alerta.necessario}</strong> unidades, mas
            este material ainda não tem stock registado. Define o stock no
            catálogo para saber se chega.
          </>
        ) : (
          <>
            Precisas de <strong>{alerta.necessario}</strong> · tens{" "}
            <strong>{alerta.stock}</strong>
          </>
        )}
      </div>

      {/* Eventos envolvidos */}
      <div style={{ padding: "10px 18px 14px" }}>
        {alerta.eventos.map((ev) => (
          <div
            key={ev.submissionId}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              padding: "6px 0",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--charcoal)",
                  fontWeight: "500",
                }}
              >
                {tituloEvento(ev.submissionId)}
              </span>
              <span
                style={{
                  fontSize: "11px",
                  color: "var(--gray-mid)",
                  marginLeft: "8px",
                }}
              >
                {formatarDataCurta(ev.dataEvento)}
              </span>
            </div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "var(--charcoal)",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {ev.quantidade}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
