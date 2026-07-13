import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { getValorAtual, getResumoSubmissao } from "../../lib/submissionFields";
import { marcarPagamentoFinal } from "../../lib/clientes";
import { FASES_POS_SINAL } from "./faseConfig";
import { formatarEuros } from "./orcamentos/orcamentoConfig";
import SeletorPaleta, { AmostraPaleta } from "./SeletorPaleta";
import MensagensSheet from "./MensagensSheet";
import { linkWhatsApp } from "../../lib/mensagens";

// ============================================================
// SubmissionDrawer — painel lateral de detalhes de um evento.
// GENÉRICO: gera as secções a partir dos steps do modelo de evento,
// funcionando para Casamento, Aniversário, ou qualquer modelo futuro.
//
// Leitura: mostra só os campos preenchidos, agrupados pelo título do
//   passo (step) a que pertencem. Lê via getValorAtual (colunas antigas
//   OU respostas).
// Edição: mostra todos os campos do modelo; ao guardar, escreve no
//   respostas (JSONB) E, quando o campo tem coluna antiga equivalente,
//   também na coluna — para não partir o Casamento nem os briefings.
//
// Props:
//   selected       — a submissão selecionada (ou null)
//   eventTypes     — lista de modelos de evento
//   onClose()      — fechar o drawer
//   onStatusChange(id, novoStatus)
//   onSaved(submissaoAtualizada) — após guardar edição
//   onGerarDocumento(submissao, "orcamento"|"contrato") — abre o
//     separador Documentos com o documento pré-preenchido deste evento
//   onFormulario(submissao) — abre o painel Novo Formulário apontado
//     a este evento (as respostas atualizam-no, não criam duplicados)
// ============================================================

const STATUS_OPTIONS = ["Recebido", "Em Preparação", "Confirmado", "Concluído"];

const STATUS_COLORS = {
  Recebido: { bg: "#FEF9EC", color: "#C9A84C", border: "#E8D5A3" },
  "Em Preparação": { bg: "#EFF6FF", color: "#3B82F6", border: "#BFDBFE" },
  Confirmado: { bg: "#F0FDF4", color: "#22C55E", border: "#BBF7D0" },
  Concluído: { bg: "#F9FAFB", color: "#6B7280", border: "#E5E7EB" },
};

// Mapa campo (camelCase) -> coluna antiga (snake_case). Igual ao de
// submissionFields.js, para sabermos que campos têm coluna equivalente
// e gravar também lá (mantém Casamento/briefings a funcionar).
const FIELD_MAP_INVERSO = {
  nomeNoivo: "nome_noivo",
  nomeNoiva: "nome_noiva",
  contactoPrincipal: "contacto_principal",
  email: "email",
  morada: "morada",
  localEvento: "local_evento",
  numeroConvidados: "numero_convidados",
  horaInicio: "hora_inicio",
  horaTermino: "hora_termino",
  horaMontagem: "hora_montagem",
  horaLimiteMontagem: "hora_limite_montagem",
  horaRecolha: "hora_recolha",
  recolhaDiaSeguinte: "recolha_dia_seguinte",
  nomeResponsavel: "nome_responsavel",
  contactoResponsavel: "contacto_responsavel",
  relacaoResponsavel: "relacao_responsavel",
  estiloEvento: "estilo_evento",
  estiloOutro: "estilo_outro",
  paletaCores: "paleta_cores",
  paletaObservacoes: "paleta_observacoes",
  mesaNoivos: "mesa_noivos",
  cartoesPratos: "cartoes_pratos",
  observacoesCartoes: "observacoes_cartoes",
  descricaoMesaNoivos: "descricao_mesa_noivos",
  cenarioPalco: "cenario_palco",
  descricaoCenario: "descricao_cenario",
  medidasEspaco: "medidas_espaco",
  centrosMesa: "centros_mesa",
  tipoFlores: "tipo_flores",
  numeroMesas: "numero_mesas",
  formatoMesas: "formato_mesas",
  lugaresporMesa: "lugares_por_mesa",
  observacoesMesas: "observacoes_mesas",
  textoPrincipalPlaca: "texto_principal_placa",
  textoSecundarioPlaca: "texto_secundario_placa",
  estiloPlaca: "estilo_placa",
  notasPlaca: "notas_placa",
  moradaExacta: "morada_exacta",
  pessoaAbreEspaco: "pessoa_abre_espaco",
  contactoPessoaAbre: "contacto_pessoa_abre",
  acessoLocal: "acesso_local",
  notasAcesso: "notas_acesso",
  observacoesGerais: "observacoes_gerais",
  dataEvento: "data_evento",
};

// Junta os campos de um modelo, agrupados pelo título do passo.
function seccoesDoModelo(tipo) {
  if (!tipo || !tipo.steps) return [];
  return tipo.steps.map((step) => ({
    titulo: step.title || "Detalhes",
    campos: step.fields || [],
  }));
}

// Formata um valor para leitura (arrays viram lista separada por vírgulas).
function formatarValor(v) {
  if (Array.isArray(v)) return v.join(", ");
  return v;
}

export default function SubmissionDrawer({
  selected,
  eventTypes,
  onClose,
  onStatusChange,
  onSaved,
  onGerarDocumento,
  onFormulario,
  invites = [],
  onNavegar,
}) {
  const [aMarcarPagamento, setAMarcarPagamento] = useState(false);
  const [folhaMensagens, setFolhaMensagens] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  if (!selected) return <AnimatePresence />;

  const tipo = eventTypes?.find((et) => et.id === selected.event_type_id);
  const seccoes = seccoesDoModelo(tipo);
  const resumo = getResumoSubmissao(selected, eventTypes);

  // O WhatsApp do evento (captação) — a última milha das mensagens:
  // escolher a mensagem-tipo → abre a conversa certa com o texto pronto.
  const numeroWhatsapp =
    getValorAtual(selected, "numeroWhatsapp") ||
    getValorAtual(selected, "contactoPrincipal") ||
    null;
  // O formulário deste evento já foi SUBMETIDO? (criado mas por
  // preencher não conta — a Nádia ainda pode precisar de o gerir)
  const formularioSubmetido = (invites || []).some(
    (i) =>
      i.submission_id === selected.id ||
      (i.submission_alvo_id === selected.id && i.submission_id),
  );

  const dadosMensagens = {
    nomeCliente: resumo.titulo,
    tipoEvento:
      (eventTypes?.find((et) => et.id === selected.event_type_id) || {})
        .nome || "",
    dataEvento: selected.data_evento || resumo.data || "",
    valor: selected.valor_acordado,
  };

  const formatData = (d) => {
    if (!d) return "Sem data";
    return new Date(d).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Abre o modo edição, pré-carregando editData com o valor atual de
  // CADA campo do modelo (lido via getValorAtual — colunas ou respostas).
  const abrirEdicao = () => {
    const dados = {};
    for (const sec of seccoes) {
      for (const campo of sec.campos) {
        const v = getValorAtual(selected, campo.id);
        // arrays (checkbox) ficam array; resto fica string
        if (Array.isArray(v)) dados[campo.id] = v;
        else dados[campo.id] = v ?? "";
      }
    }
    setEditData(dados);
    setEditMode(true);
  };

  // Guarda: escreve no respostas (todos os campos) e também nas colunas
  // antigas que existirem (via FIELD_MAP_INVERSO).
  const guardar = async () => {
    setSaving(true);

    // 1) novo respostas = respostas atual + edições (por id de campo)
    const novoRespostas = { ...(selected.respostas || {}) };
    for (const [campoId, valor] of Object.entries(editData)) {
      novoRespostas[campoId] = valor;
    }

    // 2) montar o update: respostas + colunas antigas equivalentes
    const update = { respostas: novoRespostas };
    for (const [campoId, valor] of Object.entries(editData)) {
      const coluna = FIELD_MAP_INVERSO[campoId];
      if (coluna) update[coluna] = valor;
    }

    const { error } = await supabase
      .from("submissions")
      .update(update)
      .eq("id", selected.id);

    if (!error) {
      const atualizada = { ...selected, ...update };
      if (onSaved) onSaved(atualizada);
      setEditMode(false);
    } else {
      console.error(error);
      alert("Erro ao guardar. Tenta novamente.");
    }
    setSaving(false);
  };

  const fechar = () => {
    setEditMode(false);
    onClose();
  };

  // Estilo partilhado dos botões de documento (outline dourado)
  const btnDocumento = {
    flex: 1,
    padding: "9px 8px",
    borderRadius: "10px",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
    backgroundColor: "white",
    color: "var(--gold)",
    border: "1.5px solid var(--gold)",
    whiteSpace: "nowrap",
  };

  return (
    <AnimatePresence>
      <motion.div
        onClick={fechar}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          backgroundColor: "rgba(0,0,0,0.35)",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
          style={{
            backgroundColor: "white",
            width: "100%",
            maxWidth: "560px", // largo o suficiente para a Jornada respirar
            height: "100%",
            overflowY: "auto",
            padding: "28px 24px",
            boxShadow: "-4px 0 24px rgba(0,0,0,0.1)",
          }}
        >
          {/* Cabeçalho */}
          <div style={{ marginBottom: "24px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "24px",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: "20px",
                    color: "var(--charcoal)",
                    margin: "0 0 4px 0",
                    fontFamily: "Playfair Display, serif",
                  }}
                >
                  {resumo.titulo}
                </h2>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--gray-mid)",
                    margin: 0,
                  }}
                >
                  {formatData(resumo.data)}
                  {tipo ? ` · ${tipo.nome}` : ""}
                </p>
              </div>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                {!editMode && (
                  <button
                    onClick={abrirEdicao}
                    style={{
                      padding: "7px 16px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "500",
                      cursor: "pointer",
                      border: "1.5px solid var(--gold)",
                      color: "var(--gold)",
                      backgroundColor: "white",
                      transition: "all 0.2s",
                    }}
                  >
                    ✏️ Editar
                  </button>
                )}
                <button
                  onClick={fechar}
                  style={{
                    fontSize: "20px",
                    color: "var(--gray-mid)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ===== A JORNADA — a linha de vida do evento ===== */}
            <Jornada
              submissao={selected}
              invites={invites}
              onEtapa={(id) => {
                if (id === "orcamento")
                  onGerarDocumento && onGerarDocumento(selected, "orcamento");
                else if (id === "projecto")
                  onGerarDocumento && onGerarDocumento(selected, "proposta");
                else if (id === "contrato")
                  onGerarDocumento && onGerarDocumento(selected, "contrato");
                else if (id === "formulario")
                  onFormulario && onFormulario(selected);
                else if (id === "preparacao" && onNavegar) {
                  onClose();
                  onNavegar("operacional");
                }
              }}
            />

            {/* Ações do evento: briefing em largura total (destaque) +
                grelha 2×2 de formulário e documentos (outline) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              <button
                onClick={() =>
                  window.open(`/briefing/${selected.id}`, "_blank")
                }
                style={{
                  gridColumn: "1 / -1",
                  padding: "9px 8px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  backgroundColor: "var(--gold)",
                  color: "white",
                  border: "none",
                  whiteSpace: "nowrap",
                }}
              >
                📄 Briefing
              </button>
              <button
                onClick={() => onFormulario && onFormulario(selected)}
                disabled={formularioSubmetido}
                title={
                  formularioSubmetido
                    ? "O formulário deste evento já foi preenchido"
                    : "Criar ou gerir o formulário de onboarding deste evento"
                }
                style={
                  formularioSubmetido
                    ? {
                        ...btnDocumento,
                        opacity: 0.45,
                        cursor: "not-allowed",
                      }
                    : btnDocumento
                }
              >
                {formularioSubmetido
                  ? "✓ Formulário preenchido"
                  : "📋 Formulário"}
              </button>
              <button
                onClick={() =>
                  onGerarDocumento && onGerarDocumento(selected, "proposta")
                }
                style={btnDocumento}
              >
                🎨 Projecto
              </button>
              <button
                onClick={() =>
                  onGerarDocumento && onGerarDocumento(selected, "orcamento")
                }
                style={btnDocumento}
              >
                💰 Orçamento
              </button>
              <button
                onClick={() =>
                  onGerarDocumento && onGerarDocumento(selected, "contrato")
                }
                style={btnDocumento}
              >
                📃 Contrato
              </button>
              <button
                onClick={() => setFolhaMensagens(true)}
                title={
                  linkWhatsApp(numeroWhatsapp)
                    ? "Escolher uma mensagem e abrir no WhatsApp"
                    : "Mensagens-tipo (sem número de WhatsApp neste evento — só copiar)"
                }
                style={{
                  gridColumn: "1 / -1",
                  padding: "9px 8px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  backgroundColor: "#F0FDF4",
                  color: "#166534",
                  border: "1.5px solid #BBF7D0",
                  whiteSpace: "nowrap",
                }}
              >
                💬 Enviar por WhatsApp
              </button>
            </div>
          </div>

          {/* Folha de mensagens do evento — cada mensagem com Copiar e,
              havendo número, o botão que abre a conversa já escrita */}
          {folhaMensagens && (
            <MensagensSheet
              dados={dadosMensagens}
              whatsapp={numeroWhatsapp}
              onFechar={() => setFolhaMensagens(false)}
            />
          )}

          {/* Estado do evento */}
          <div style={{ marginBottom: "28px" }}>
            <p
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: "var(--gray-mid)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "10px",
              }}
            >
              Estado do Evento
            </p>
            <div className="filter-wrap">
              <div
                className="h-scroll"
                style={{ gap: "8px", paddingRight: "32px" }}
              >
                {STATUS_OPTIONS.map((status) => {
                  const colors = STATUS_COLORS[status];
                  const isActive = selected.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() => onStatusChange(selected.id, status)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "999px",
                        fontSize: "12px",
                        whiteSpace: "nowrap",
                        border: `1px solid ${colors.border}`,
                        backgroundColor: isActive ? colors.color : colors.bg,
                        color: isActive ? "white" : colors.color,
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pagamento — o sinal de 50% é a fase (Cliente); o resto
                paga-se até 48H ANTES do evento. Este botão marca o
                pagamento final e desliga o alerta do Início. */}
            <div style={{ marginTop: "14px" }}>
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--gold-dark)",
                  margin: "0 0 8px 0",
                }}
              >
                Pagamento
              </p>
              <button
                onClick={async () => {
                  setAMarcarPagamento(true);
                  try {
                    const atualizado = await marcarPagamentoFinal(
                      selected.id,
                      !selected.pagamento_final,
                    );
                    if (onSaved) onSaved(atualizado);
                  } catch (e) {
                    console.error(e);
                    alert("Não foi possível guardar. Tenta novamente.");
                  }
                  setAMarcarPagamento(false);
                }}
                disabled={aMarcarPagamento}
                style={{
                  padding: "8px 16px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: aMarcarPagamento ? "wait" : "pointer",
                  border: selected.pagamento_final
                    ? "1.5px solid #16A34A"
                    : "1.5px solid var(--gold)",
                  backgroundColor: selected.pagamento_final
                    ? "#DCFCE7"
                    : "white",
                  color: selected.pagamento_final ? "#166534" : "var(--gold-dark)",
                  transition: "all 0.15s",
                }}
              >
                {aMarcarPagamento
                  ? "..."
                  : selected.pagamento_final
                    ? "✓ Pagamento final recebido"
                    : "💶 Marcar pagamento final recebido"}
              </button>
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--gray-mid)",
                  margin: "6px 0 0 0",
                }}
              >
                Sinal de 50% na reserva · restante até 48h antes do evento.
              </p>
            </div>
          </div>

          {/* MODO LEITURA — secções geradas do modelo, só campos preenchidos */}
          {!editMode && (
            <>
              {seccoes.map((sec) => {
                // filtra campos com valor
                const camposComValor = sec.campos
                  .map((campo) => ({
                    campo,
                    valor: formatarValor(getValorAtual(selected, campo.id)),
                  }))
                  .filter(
                    ({ valor }) =>
                      valor !== undefined &&
                      valor !== null &&
                      valor !== "" &&
                      !(Array.isArray(valor) && valor.length === 0),
                  );

                if (camposComValor.length === 0) return null;

                return (
                  <div key={sec.titulo} style={{ marginBottom: "24px" }}>
                    <p
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "var(--gold)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        borderBottom: "1px solid var(--gold-light)",
                        paddingBottom: "6px",
                        margin: "0 0 12px 0",
                      }}
                    >
                      {sec.titulo}
                    </p>
                    {camposComValor.map(({ campo, valor }) => (
                      <div key={campo.id} style={{ marginBottom: "10px" }}>
                        <p
                          style={{
                            fontSize: "11px",
                            color: "var(--gray-mid)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            margin: "0 0 2px 0",
                          }}
                        >
                          {campo.label}
                        </p>
                        {campo.type === "paleta" ? (
                          <AmostraPaleta
                            value={getValorAtual(selected, campo.id)}
                          />
                        ) : (
                          <p
                            style={{
                              fontSize: "14px",
                              color: "var(--charcoal)",
                              margin: 0,
                            }}
                          >
                            {valor}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Se o modelo não tem secções com dados nenhuns */}
              {seccoes.every((sec) =>
                sec.campos.every((campo) => {
                  const v = getValorAtual(selected, campo.id);
                  return (
                    v === undefined ||
                    v === null ||
                    v === "" ||
                    (Array.isArray(v) && v.length === 0)
                  );
                }),
              ) && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--gray-mid)",
                    fontStyle: "italic",
                    textAlign: "center",
                    padding: "20px",
                  }}
                >
                  Este evento ainda não tem detalhes preenchidos.
                </p>
              )}
            </>
          )}

          {/* MODO EDIÇÃO — todos os campos do modelo, gravados no respostas */}
          {editMode && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {seccoes.map((sec) => {
                if (sec.campos.length === 0) return null;
                return (
                  <div key={sec.titulo}>
                    <p
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "var(--gold)",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        borderBottom: "1px solid var(--gold-light)",
                        paddingBottom: "6px",
                        marginBottom: "12px",
                      }}
                    >
                      {sec.titulo}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                      }}
                    >
                      {sec.campos.map((campo) => (
                        <CampoEdicao
                          key={campo.id}
                          campo={campo}
                          valor={editData[campo.id]}
                          onChange={(v) =>
                            setEditData((prev) => ({ ...prev, [campo.id]: v }))
                          }
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              <div style={{ display: "flex", gap: "10px", paddingTop: "8px" }}>
                <button
                  onClick={() => setEditMode(false)}
                  style={{
                    flex: 1,
                    padding: "11px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    border: "1.5px solid var(--gold-light)",
                    color: "var(--gray-mid)",
                    backgroundColor: "white",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={saving}
                  style={{
                    flex: 2,
                    padding: "11px",
                    borderRadius: "10px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: saving ? "not-allowed" : "pointer",
                    backgroundColor: saving
                      ? "var(--gold-light)"
                      : "var(--gold)",
                    color: "white",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(201,168,76,0.3)",
                  }}
                >
                  {saving ? "A guardar..." : "✓ Guardar alterações"}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Campo de edição genérico — adapta o input ao type do campo.
function CampoEdicao({ campo, valor, onChange }) {
  const label = (
    <label
      style={{
        fontSize: "11px",
        color: "var(--gray-mid)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        display: "block",
        marginBottom: "4px",
      }}
    >
      {campo.label}
    </label>
  );

  const inputStyle = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1.5px solid var(--gold-light)",
    fontSize: "13px",
    outline: "none",
    fontFamily: "Inter, sans-serif",
    boxSizing: "border-box",
  };

  // Paleta de cores (catálogo visual clicável)
  if (campo.type === "paleta") {
    return (
      <div>
        {label}
        <SeletorPaleta value={valor} onChange={onChange} compact />
      </div>
    );
  }

  // Campos de múltipla escolha (checkbox): lista de botões toggle
  if (campo.type === "checkbox" && Array.isArray(campo.options)) {
    const selecionados = Array.isArray(valor) ? valor : [];
    const toggle = (opt) => {
      if (selecionados.includes(opt)) {
        onChange(selecionados.filter((o) => o !== opt));
      } else {
        onChange([...selecionados, opt]);
      }
    };
    return (
      <div>
        {label}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {campo.options.map((opt) => {
            const ativo = selecionados.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  border: `1.5px solid ${ativo ? "var(--gold)" : "var(--gold-light)"}`,
                  backgroundColor: ativo ? "var(--gold)" : "white",
                  color: ativo ? "white" : "var(--gray-mid)",
                  cursor: "pointer",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Escolha única (radio/select)
  if (
    (campo.type === "radio" || campo.type === "select") &&
    Array.isArray(campo.options)
  ) {
    return (
      <div>
        {label}
        <select
          value={valor || ""}
          onChange={(e) => onChange(e.target.value)}
          style={inputStyle}
        >
          <option value="">—</option>
          {campo.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // Texto longo
  if (campo.type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          rows={2}
          value={valor || ""}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, resize: "none" }}
        />
      </div>
    );
  }

  // Input simples (text, tel, email, number, date, time...)
  return (
    <div>
      {label}
      <input
        type={campo.type || "text"}
        value={valor || ""}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}

// ============================================================
// A JORNADA — a linha de vida do evento, do primeiro "olá" ao
// grande dia. Oito etapas derivadas da fase comercial, do estado
// operacional e dos formulários — zero queries novas.
// Três estados: feito (dourado, ✓) · atual (anel dourado) ·
// futuro (cinza). O Formulário é independente da ordem (acende
// quando o cliente responde, seja quando for): ✓ preenchido,
// ◐ criado por preencher, ○ nem criado.
// ============================================================
const FASE_ORDEM_JORNADA = [
  "interessado",
  "orcamento",
  "sinal",
  "cliente",
  "projecto",
  "contrato",
];

function Jornada({ submissao, invites = [], onEtapa }) {
  const s = submissao;
  if (!s) return null;

  // Percurso terminado — sem jornada, só a lápide discreta
  if (s.fase === "perdido") {
    return (
      <div
        style={{
          backgroundColor: "#F9FAFB",
          border: "1px solid #E5E7EB",
          borderRadius: "12px",
          padding: "10px 14px",
          marginBottom: "14px",
          fontSize: "12px",
          color: "var(--gray-mid)",
        }}
      >
        Percurso terminado (perdido) — pode ser recuperado no funil.
      </div>
    );
  }

  const idxFase = FASE_ORDEM_JORNADA.indexOf(s.fase);
  const posSinal = FASES_POS_SINAL.includes(s.fase);
  const valor = Number(s.valor_acordado) || 0;
  const concluido = s.status === "Concluído";
  const emPreparacao =
    ["Em Preparação", "Confirmado"].includes(s.status) || concluido;

  // Formulário: ✓ preenchido · ◐ criado por preencher · ○ nem criado
  const invitesDoEvento = (invites || []).filter(
    (i) => i.submission_id === s.id || i.submission_alvo_id === s.id,
  );
  const formularioFeito = invitesDoEvento.some((i) => i.submission_id);
  const formularioAMeio = !formularioFeito && invitesDoEvento.length > 0;

  const dataCurta = (d) =>
    d
      ? new Date(d).toLocaleDateString("pt-PT", {
          day: "numeric",
          month: "short",
        })
      : null;

  const etapas = [
    {
      id: "interessado",
      rotulo: "Interessada",
      feito: true,
      sub: dataCurta(s.created_at),
    },
    {
      id: "orcamento",
      rotulo: "Orçamento",
      feito: idxFase >= 1,
      sub: valor > 0 ? formatarEuros(valor) : null,
      clicavel: true,
    },
    {
      id: "sinal",
      rotulo: "Sinal",
      feito: posSinal,
      sub:
        !posSinal && s.fase === "sinal" && valor > 0
          ? `${formatarEuros(valor / 2)} por receber`
          : posSinal && valor > 0
            ? formatarEuros(valor / 2)
            : null,
    },
    {
      id: "formulario",
      rotulo: "Formulário",
      feito: formularioFeito,
      aMeio: formularioAMeio,
      // Submetido = nada a abrir; por criar/preencher = clicável
      clicavel: !formularioFeito,
    },
    {
      id: "projecto",
      rotulo: "Projecto",
      feito: idxFase >= 4,
      clicavel: true,
    },
    {
      id: "contrato",
      rotulo: "Contrato",
      feito: idxFase >= 5,
      clicavel: true,
    },
    {
      id: "preparacao",
      rotulo: "Preparação",
      feito: emPreparacao,
      clicavel: true,
    },
    {
      id: "grandeDia",
      rotulo: "O grande dia",
      feito: concluido,
      emoji: "🥂",
      sub: dataCurta(s.data_evento),
    },
  ];

  // A etapa ATUAL: a primeira por fazer na cadeia (o Formulário fica
  // de fora — é independente da ordem)
  const atual = etapas.find((e) => e.id !== "formulario" && !e.feito);

  // A frase "→ A seguir" — a app a apontar o próximo gesto
  const proximoGesto = (() => {
    if (!atual) return null;
    if (atual.id === "orcamento") return "enviar o orçamento";
    if (atual.id === "sinal")
      return valor > 0
        ? `registar o sinal (${formatarEuros(valor / 2)})`
        : "registar o sinal";
    if (atual.id === "projecto") return "criar o projecto";
    if (atual.id === "contrato") return "preparar o contrato";
    if (atual.id === "preparacao") return "preparar o evento (Logística)";
    if (atual.id === "grandeDia") return "está tudo pronto — falta o grande dia 🥂";
    return null;
  })();

  return (
    <div
      style={{
        backgroundColor: "#FBF7EF",
        border: "1px solid var(--gold-light)",
        borderRadius: "12px",
        padding: "14px 10px 10px",
        marginBottom: "14px",
      }}
    >
      <p
        style={{
          fontSize: "9px",
          fontWeight: "700",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--gold-dark)",
          margin: "0 4px 12px",
        }}
      >
        A Jornada
      </p>
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        {etapas.map((e, i) => {
          const ehAtual = atual && atual.id === e.id;
          const corBola = e.feito
            ? "var(--gold)"
            : e.aMeio
              ? "#EAD9AC"
              : "#F1EBDD";
          return (
            <div
              key={e.id}
              onClick={e.clicavel && onEtapa ? () => onEtapa(e.id) : undefined}
              title={e.clicavel ? "Abrir" : undefined}
              style={{
                flex: 1,
                textAlign: "center",
                position: "relative",
                cursor: e.clicavel ? "pointer" : "default",
                minWidth: 0,
              }}
            >
              {i < etapas.length - 1 && (
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "50%",
                    right: "-50%",
                    height: "2px",
                    backgroundColor: e.feito ? "var(--gold)" : "#E5DCC3",
                  }}
                />
              )}
              <div
                style={{
                  position: "relative",
                  width: ehAtual ? "24px" : "21px",
                  height: ehAtual ? "24px" : "21px",
                  borderRadius: "50%",
                  backgroundColor: ehAtual ? "white" : corBola,
                  border: ehAtual ? "2.5px solid var(--gold)" : "none",
                  boxShadow: ehAtual
                    ? "0 0 0 4px rgba(201,168,76,0.22)"
                    : "none",
                  margin: `${ehAtual ? "-1px" : "0"} auto 5px`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: e.emoji ? "11px" : "10px",
                  color: e.feito ? "white" : "var(--gray-mid)",
                  fontWeight: "700",
                }}
              >
                {e.emoji ? e.emoji : e.feito ? "✓" : ehAtual ? "●" : "○"}
              </div>
              <p
                style={{
                  fontSize: "8.5px",
                  fontWeight: e.feito || ehAtual ? "600" : "400",
                  color: ehAtual
                    ? "var(--gold-dark)"
                    : e.feito
                      ? "var(--charcoal)"
                      : "var(--gray-mid)",
                  margin: "0 2px",
                  lineHeight: 1.25,
                  overflowWrap: "break-word",
                }}
              >
                {e.rotulo}
              </p>
              {e.sub && (
                <p
                  style={{
                    fontSize: "8.5px",
                    color: ehAtual ? "#B45309" : "var(--gray-mid)",
                    fontWeight: ehAtual ? "600" : "400",
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {e.sub}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {proximoGesto && (
        <p
          style={{
            fontSize: "11px",
            fontStyle: "italic",
            color: "var(--gold-dark)",
            margin: "10px 4px 0",
          }}
        >
          → A seguir: {proximoGesto}
        </p>
      )}
    </div>
  );
}