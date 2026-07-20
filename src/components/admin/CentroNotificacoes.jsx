import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { linkWhatsApp } from "../../lib/mensagens";

// ============================================================
// CentroNotificacoes — a Caixa de Entrada da Nádia.
//
// Duas peças, uma experiência (o estado vivo — useNotificacoes —
// mora em lib/notificacoes.js):
//   • PainelNotificacoes — o painel lateral com os pedidos, cada um
//     expansível com TODOS os dados que o interessado preencheu;
//   • ToastNotificacao — o momento WOW: quando um pedido chega com a
//     app aberta, desce um cartão dourado com shimmer e um sino suave.
//
// A estética segue a casa: Playfair nos nomes, dourado na moldura,
// linhas finas, nada de emoji nos elementos permanentes.
// ============================================================

// ------------------------------------------------------------
// O sino sonoro — duas notas suaves geradas no browser (WebAudio),
// sem ficheiros. Falha em silêncio se o browser não deixar tocar.
// ------------------------------------------------------------
let audioCtx = null;
const tocarSino = () => {
  try {
    audioCtx =
      audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const nota = (freq, quando, dur = 0.9, vol = 0.08) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, quando);
      gain.gain.exponentialRampToValueAtTime(vol, quando + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, quando + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(quando);
      osc.stop(quando + dur + 0.05);
    };
    const t = audioCtx.currentTime;
    nota(987.77, t); // Si5
    nota(1318.51, t + 0.14); // Mi6 — o intervalo "campainha de hotel"
  } catch {
    /* sem áudio — sem drama */
  }
};

// ------------------------------------------------------------
// Tempo relativo humano ("agora mesmo", "há 20 min", "ontem"...)
// ------------------------------------------------------------
const tempoRelativo = (iso) => {
  if (!iso) return "";
  const seg = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seg < 60) return "agora mesmo";
  const min = Math.floor(seg / 60);
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} ${h === 1 ? "hora" : "horas"}`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  if (d < 7) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-PT", {
    day: "numeric",
    month: "short",
  });
};

const dataLonga = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const iniciais = (nome) =>
  (nome || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");

// Nome do tipo de evento: modelo conhecido OU o texto livre do cliente.
const nomeDoTipo = (n, eventTypes) => {
  const tipo = (eventTypes || []).find((et) => et.id === n.event_type_id);
  if (tipo) return tipo.nome;
  return n.dados?.respostas?.tipoEventoOutro || null;
};

// ------------------------------------------------------------
// Blocos de apresentação do pedido
// ------------------------------------------------------------
function Rotulo({ children }) {
  return (
    <p
      style={{
        fontSize: "9px",
        fontWeight: "600",
        color: "var(--gray-mid)",
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        margin: "0 0 3px 0",
      }}
    >
      {children}
    </p>
  );
}

function Valor({ children }) {
  return (
    <p
      style={{
        fontSize: "13px",
        color: "var(--charcoal)",
        margin: 0,
        lineHeight: 1.5,
        overflowWrap: "anywhere",
      }}
    >
      {children}
    </p>
  );
}

function Chip({ children, cheio }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 11px",
        borderRadius: "999px",
        fontSize: "11.5px",
        fontWeight: "500",
        backgroundColor: cheio ? "#FBF7EF" : "white",
        border: "1px solid var(--gold-light)",
        color: "var(--gold-dark)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

// O retrato completo do pedido — tudo o que o interessado preencheu,
// em leitura confortável: grelha de pares rótulo/valor, chips para os
// serviços, a mensagem em citação e as fotos de inspiração em fila.
function DetalhePedido({ n }) {
  const r = n.dados?.respostas || {};
  const dataEvento = n.dados?.data_evento || r.dataEvento || null;
  const convidados = n.dados?.numero_convidados ?? r.numeroConvidados ?? null;
  const servicos = [
    ...(Array.isArray(r.servicos) ? r.servicos : []),
    ...(Array.isArray(r.servicosBalcao) ? r.servicosBalcao : []),
    ...(Array.isArray(r.pretende) ? r.pretende : []),
  ];
  const imagens = Array.isArray(r.imagensReferencia) ? r.imagensReferencia : [];
  const contacto = r.contactoPrincipal || null;
  const whatsapp = r.numeroWhatsapp || null;
  const wa = linkWhatsApp(whatsapp || contacto);

  const pares = [
    ["Data do evento", dataLonga(dataEvento)],
    ["Convidados", convidados ? `${convidados} pessoas` : null],
    ["Local", r.localEvento],
    ["Espaço", r.tipoLocal],
    ["Contacto", contacto],
    ["WhatsApp", whatsapp],
  ].filter(([, v]) => v);

  return (
    <div
      style={{
        borderTop: "1px solid #F5ECD7",
        marginTop: "12px",
        paddingTop: "14px",
      }}
    >
      {/* Grelha dos factos */}
      {pares.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 16px",
            marginBottom: servicos.length > 0 ? "14px" : 0,
          }}
        >
          {pares.map(([rotulo, valor]) => (
            <div
              key={rotulo}
              style={
                rotulo === "Data do evento" ? { gridColumn: "1 / -1" } : null
              }
            >
              <Rotulo>{rotulo}</Rotulo>
              <Valor>{valor}</Valor>
            </div>
          ))}
        </div>
      )}

      {/* Serviços pedidos */}
      {servicos.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <Rotulo>Serviços pedidos</Rotulo>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginTop: "5px",
            }}
          >
            {servicos.map((s) => (
              <Chip key={s} cheio>
                {s}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* A mensagem, nas palavras da pessoa */}
      {(r.mensagemInicial || r.maisDetalhes) && (
        <div style={{ marginBottom: "14px" }}>
          <Rotulo>Mensagem</Rotulo>
          <p
            style={{
              margin: "5px 0 0 0",
              padding: "10px 14px",
              borderLeft: "2px solid var(--gold)",
              backgroundColor: "#FBF7EF",
              borderRadius: "0 10px 10px 0",
              fontSize: "13px",
              fontStyle: "italic",
              color: "var(--charcoal)",
              lineHeight: 1.6,
              overflowWrap: "anywhere",
            }}
          >
            “{r.mensagemInicial || r.maisDetalhes}”
          </p>
        </div>
      )}

      {/* Fotos de inspiração */}
      {imagens.length > 0 && (
        <div style={{ marginBottom: "14px" }}>
          <Rotulo>Inspiração ({imagens.length})</Rotulo>
          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "5px",
              overflowX: "auto",
              paddingBottom: "4px",
            }}
          >
            {imagens.map((url, i) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{ flexShrink: 0 }}
              >
                <img
                  src={url}
                  alt={`Referência ${i + 1}`}
                  style={{
                    width: "76px",
                    height: "76px",
                    objectFit: "cover",
                    borderRadius: "10px",
                    border: "1px solid var(--gold-light)",
                    display: "block",
                  }}
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Ações */}
      <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              padding: "10px 16px",
              borderRadius: "999px",
              fontSize: "12px",
              fontWeight: "600",
              border: "1px solid var(--gold)",
              color: "var(--gold-dark)",
              backgroundColor: "white",
              textDecoration: "none",
            }}
          >
            WhatsApp
          </a>
        )}
        <button
          onClick={() => n.__abrirFicha?.()}
          style={{
            flex: 1,
            padding: "10px 16px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: "600",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            border: "none",
            backgroundColor: "var(--gold)",
            color: "white",
            cursor: "pointer",
            boxShadow: "0 3px 10px rgba(201,168,76,0.3)",
          }}
        >
          Abrir ficha completa →
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Um cartão da Caixa de Entrada — fechado é um relance (quem, o quê,
// quando); aberto é o pedido inteiro. Abrir marca como lida.
// ------------------------------------------------------------
function CartaoNotificacao({
  n,
  eventTypes,
  expandida,
  onToggle,
  onAbrirEvento,
}) {
  const naoLida = !n.lida_em;
  const tipo = nomeDoTipo(n, eventTypes);
  const dataEvento =
    n.dados?.data_evento || n.dados?.respostas?.dataEvento || null;
  const convidados =
    n.dados?.numero_convidados ?? n.dados?.respostas?.numeroConvidados ?? null;

  return (
    <motion.div
      layout="position"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      onClick={onToggle}
      style={{
        position: "relative",
        backgroundColor: naoLida ? "#FFFDF6" : "white",
        border: naoLida ? "1px solid var(--gold-light)" : "1px solid #F0E6D0",
        borderRadius: "14px",
        padding: "14px 16px",
        marginBottom: "10px",
        cursor: "pointer",
        overflow: "hidden",
        boxShadow: naoLida ? "0 2px 12px rgba(201,168,76,0.12)" : "none",
      }}
    >
      {/* fio dourado à esquerda enquanto não for lida */}
      {naoLida && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: "3px",
            background:
              "linear-gradient(180deg, var(--gold-light), var(--gold))",
          }}
        />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {/* Iniciais em medalhão dourado */}
        <span
          style={{
            flexShrink: 0,
            width: "42px",
            height: "42px",
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, #E8D5A3 0%, #C9A84C 60%, #A07830 100%)",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "15px",
            fontFamily: "Playfair Display, serif",
            letterSpacing: "0.03em",
          }}
        >
          {iniciais(n.titulo)}
        </span>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "10px",
            }}
          >
            <p
              style={{
                fontSize: "15px",
                fontWeight: "600",
                fontFamily: "Playfair Display, serif",
                color: "var(--charcoal)",
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {n.titulo || "Novo interessado"}
            </p>
            <span
              style={{
                flexShrink: 0,
                fontSize: "10.5px",
                color: naoLida ? "var(--gold-dark)" : "var(--gray-mid)",
                fontWeight: naoLida ? "600" : "400",
              }}
            >
              {tempoRelativo(n.created_at)}
            </span>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--gray-mid)",
              margin: "2px 0 0 0",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {[
              tipo,
              dataEvento
                ? new Date(dataEvento).toLocaleDateString("pt-PT", {
                    day: "numeric",
                    month: "long",
                  })
                : null,
              convidados ? `${convidados} convidados` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Pedido de interesse"}
          </p>
        </div>

        {/* seta que roda ao expandir */}
        <motion.span
          animate={{ rotate: expandida ? 90 : 0 }}
          transition={{ duration: 0.2 }}
          style={{
            flexShrink: 0,
            color: "var(--gold)",
            fontSize: "13px",
            lineHeight: 1,
          }}
        >
          ›
        </motion.span>
      </div>

      <AnimatePresence initial={false}>
        {expandida && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <DetalhePedido
              n={{
                ...n,
                __abrirFicha: () =>
                  onAbrirEvento && onAbrirEvento(n.submission_id),
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ------------------------------------------------------------
// PainelNotificacoes — a Caixa de Entrada em painel lateral.
// ------------------------------------------------------------
// O corpo só vive enquanto o painel está aberto — por isso o estado
// de expansão nasce aqui (com o destaque do toast já aberto) e morre
// ao fechar, sem sincronizações via effect.
function CorpoCaixa({
  destaqueId,
  lista,
  eventTypes,
  onMarcarLida,
  onAbrirEvento,
}) {
  const [expandidaId, setExpandidaId] = useState(destaqueId || null);

  // O destaque (vindo do toast) conta logo como lido.
  useEffect(() => {
    if (destaqueId) onMarcarLida(destaqueId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const alternar = (id) => {
    setExpandidaId((atual) => {
      const proxima = atual === id ? null : id;
      return proxima;
    });
    const n = lista.find((x) => x.id === id);
    if (n && !n.lida_em && expandidaId !== id) onMarcarLida(id);
  };

  if (lista.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "72px 24px" }}>
        <p
          style={{
            fontSize: "26px",
            color: "var(--gold-light)",
            margin: "0 0 10px 0",
          }}
        >
          ✦
        </p>
        <p
          style={{
            fontSize: "16px",
            fontFamily: "Playfair Display, serif",
            color: "var(--charcoal)",
            margin: "0 0 6px 0",
          }}
        >
          Sem novidades por agora
        </p>
        <p
          style={{
            fontSize: "12.5px",
            color: "var(--gray-mid)",
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          Quando alguém preencher o formulário de interesse,
          <br />o pedido aparece aqui ao segundo.
        </p>
      </div>
    );
  }

  return lista.map((n) => (
    <CartaoNotificacao
      key={n.id}
      n={n}
      eventTypes={eventTypes}
      expandida={expandidaId === n.id}
      onToggle={() => alternar(n.id)}
      onAbrirEvento={onAbrirEvento}
    />
  ));
}

export default function PainelNotificacoes({
  aberto,
  destaqueId = null, // notificação a abrir já expandida (vinda do toast)
  lista,
  naoLidas,
  eventTypes,
  onFechar,
  onMarcarLida,
  onMarcarTodas,
  onAbrirEvento,
}) {
  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onFechar}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 52,
            backgroundColor: "rgba(26,26,26,0.4)",
            backdropFilter: "blur(2px)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(460px, 100%)",
              height: "100%",
              backgroundColor: "var(--cream)",
              boxShadow: "-12px 0 40px rgba(0,0,0,0.18)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Cabeçalho */}
            <div
              style={{
                padding: "22px 22px 16px",
                backgroundColor: "white",
                borderBottom: "1px solid var(--gold-light)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "9px",
                      fontWeight: "600",
                      color: "var(--gold)",
                      textTransform: "uppercase",
                      letterSpacing: "0.22em",
                      margin: "0 0 3px 0",
                    }}
                  >
                    Do Luxo à Mesa
                  </p>
                  <h2
                    style={{
                      fontSize: "21px",
                      fontFamily: "Playfair Display, serif",
                      fontWeight: "500",
                      color: "var(--charcoal)",
                      margin: 0,
                    }}
                  >
                    Caixa de Entrada
                    {naoLidas > 0 && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: "22px",
                          height: "22px",
                          padding: "0 6px",
                          marginLeft: "10px",
                          borderRadius: "999px",
                          backgroundColor: "var(--gold)",
                          color: "white",
                          fontSize: "11px",
                          fontWeight: "700",
                          fontFamily: "Inter, sans-serif",
                          verticalAlign: "3px",
                        }}
                      >
                        {naoLidas}
                      </span>
                    )}
                  </h2>
                </div>
                <button
                  onClick={onFechar}
                  aria-label="Fechar"
                  style={{
                    fontSize: "18px",
                    color: "var(--gray-mid)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    lineHeight: 1,
                    padding: "6px",
                  }}
                >
                  ✕
                </button>
              </div>
              {naoLidas > 0 && (
                <button
                  onClick={onMarcarTodas}
                  style={{
                    marginTop: "10px",
                    padding: 0,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "600",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--gold-dark)",
                  }}
                >
                  ✓ Marcar todas como lidas
                </button>
              )}
            </div>

            {/* Lista */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 16px 24px",
                scrollbarWidth: "thin",
                scrollbarColor: "var(--gold-light) transparent",
              }}
            >
              <CorpoCaixa
                destaqueId={destaqueId}
                lista={lista}
                eventTypes={eventTypes}
                onMarcarLida={onMarcarLida}
                onAbrirEvento={onAbrirEvento}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ------------------------------------------------------------
// ToastNotificacao — o cartão dourado que desce quando um pedido
// chega em tempo real. Clique = abre a Caixa de Entrada já no pedido.
// Desaparece sozinho ao fim de 9 segundos (linha dourada a esgotar).
// ------------------------------------------------------------
const DURACAO_TOAST_S = 9;

export function ToastNotificacao({ nova, eventTypes, onAbrir, onFechar }) {
  // Toca o sino a cada chegada
  useEffect(() => {
    if (nova) tocarSino();
  }, [nova?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fecho
  useEffect(() => {
    if (!nova) return undefined;
    const t = setTimeout(onFechar, DURACAO_TOAST_S * 1000);
    return () => clearTimeout(t);
  }, [nova?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const tipo = nova ? nomeDoTipo(nova, eventTypes) : null;
  const dataEvento =
    nova?.dados?.data_evento || nova?.dados?.respostas?.dataEvento || null;
  const convidados =
    nova?.dados?.numero_convidados ??
    nova?.dados?.respostas?.numeroConvidados ??
    null;

  return (
    <>
      <style>{`
        @keyframes dlm-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(220%); }
        }
        @keyframes dlm-toast-vida {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <AnimatePresence>
        {nova && (
          <motion.div
            key={nova.id}
            initial={{ opacity: 0, y: -28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.97 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            onClick={() => onAbrir(nova)}
            role="button"
            style={{
              position: "fixed",
              top: "18px",
              right: "18px",
              left: "auto",
              zIndex: 70,
              width: "min(360px, calc(100vw - 36px))",
              backgroundColor: "white",
              border: "1px solid var(--gold)",
              borderRadius: "16px",
              boxShadow:
                "0 16px 48px rgba(160,120,48,0.28), 0 3px 10px rgba(0,0,0,0.08)",
              cursor: "pointer",
              overflow: "hidden",
            }}
          >
            {/* varrimento de luz — o brilho da casa */}
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: "45%",
                background:
                  "linear-gradient(105deg, transparent, rgba(232,213,163,0.45), transparent)",
                animation: "dlm-shimmer 2.4s ease-in-out 0.3s 2",
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "13px",
                alignItems: "flex-start",
                padding: "15px 16px 13px",
              }}
            >
              {/* medalhão com a faísca */}
              <motion.span
                initial={{ rotate: -20, scale: 0.6 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", damping: 10, stiffness: 260, delay: 0.15 }}
                style={{
                  flexShrink: 0,
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, #E8D5A3 0%, #C9A84C 60%, #A07830 100%)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "17px",
                  boxShadow: "0 4px 12px rgba(201,168,76,0.4)",
                }}
              >
                ✦
              </motion.span>

              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    fontSize: "9px",
                    fontWeight: "700",
                    color: "var(--gold-dark)",
                    textTransform: "uppercase",
                    letterSpacing: "0.18em",
                    margin: "0 0 3px 0",
                  }}
                >
                  Novo pedido de interesse
                </p>
                <p
                  style={{
                    fontSize: "17px",
                    fontWeight: "600",
                    fontFamily: "Playfair Display, serif",
                    color: "var(--charcoal)",
                    margin: "0 0 2px 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {nova.titulo || "Novo interessado"}
                </p>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--gray-mid)",
                    margin: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {[
                    tipo,
                    dataEvento
                      ? new Date(dataEvento).toLocaleDateString("pt-PT", {
                          day: "numeric",
                          month: "long",
                        })
                      : null,
                    convidados ? `${convidados} convidados` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Toca para ver os detalhes"}
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    fontWeight: "600",
                    color: "var(--gold-dark)",
                    margin: "7px 0 0 0",
                    letterSpacing: "0.04em",
                  }}
                >
                  Ver o pedido →
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFechar();
                }}
                aria-label="Dispensar"
                style={{
                  flexShrink: 0,
                  fontSize: "14px",
                  color: "var(--gray-mid)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  lineHeight: 1,
                  padding: "2px",
                }}
              >
                ✕
              </button>
            </div>

            {/* a vida do toast a esgotar-se */}
            <span
              aria-hidden="true"
              style={{
                display: "block",
                height: "3px",
                background:
                  "linear-gradient(90deg, var(--gold), var(--gold-light))",
                animation: `dlm-toast-vida ${DURACAO_TOAST_S}s linear forwards`,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
