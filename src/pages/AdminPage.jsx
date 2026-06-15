import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { createInvite } from "../lib/invites";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_OPTIONS = ["Recebido", "Em Preparação", "Confirmado", "Concluído"];

const STATUS_COLORS = {
  Recebido: { bg: "#FEF9EC", color: "#C9A84C", border: "#E8D5A3" },
  "Em Preparação": { bg: "#EFF6FF", color: "#3B82F6", border: "#BFDBFE" },
  Confirmado: { bg: "#F0FDF4", color: "#22C55E", border: "#BBF7D0" },
  Concluído: { bg: "#F9FAFB", color: "#6B7280", border: "#E5E7EB" },
};

const PIE_COLORS = ["#C9A84C", "#3B82F6", "#22C55E", "#6B7280"];
const GOLD_SHADES = ["#C9A84C", "#A07830", "#E8D5A3", "#7A5C20", "#F5ECD7"];

// Estilos partilhados dos cards de KPI do dashboard
const kpiCardStyle = {
  backgroundColor: "white",
  borderRadius: "14px",
  padding: "20px 16px",
  textAlign: "center",
  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
};
const kpiValueStyle = {
  fontSize: "34px",
  fontWeight: "600",
  margin: "0 0 4px 0",
  lineHeight: 1,
};
const kpiLabelStyle = {
  fontSize: "12px",
  color: "var(--gray-mid)",
  margin: 0,
  lineHeight: 1.4,
};

function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ marginBottom: "10px" }}>
      <p
        style={{
          fontSize: "11px",
          color: "var(--gray-mid)",
          marginBottom: "2px",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          margin: "0 0 2px 0",
        }}
      >
        {label}
      </p>
      <p style={{ fontSize: "14px", color: "var(--charcoal)", margin: 0 }}>
        {value}
      </p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: "24px" }}>
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
          margin: "0 0 12px 0",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div
      style={{
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "24px 20px",
        boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
        marginBottom: "20px",
      }}
    >
      <p
        style={{
          fontSize: "12px",
          fontWeight: "600",
          color: "var(--gray-mid)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "20px",
          margin: "0 0 20px 0",
        }}
      >
        {title}
      </p>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div
      style={{
        height: "160px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <p style={{ color: "var(--gold-light)", fontSize: "13px" }}>
        Sem dados suficientes ainda
      </p>
    </div>
  );
}

export default function AdminPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("Todos");
  const [activeTab, setActiveTab] = useState("clientes");
  const [invites, setInvites] = useState([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [showNewInvite, setShowNewInvite] = useState(false);
  const [newInvite, setNewInvite] = useState({
    nomeNoivo: "",
    nomeNoiva: "",
    email: "",
    dataEvento: "",
  });
  const [newInviteErrors, setNewInviteErrors] = useState({});
  const [createdInvite, setCreatedInvite] = useState(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [inviteToDelete, setInviteToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubmissions();
    fetchInvites();

    const channel = supabase
      .channel("db-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        (payload) => {
          console.log("Nova submissão:", payload);
          fetchSubmissions();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "invites" },
        (payload) => {
          console.log("Convite actualizado:", payload);
          fetchInvites();
        },
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateInvite = async () => {
    const errors = {};
    if (!newInvite.nomeNoivo.trim()) errors.nomeNoivo = "Obrigatório";
    if (!newInvite.nomeNoiva.trim()) errors.nomeNoiva = "Obrigatório";
    if (!newInvite.dataEvento) {
      errors.dataEvento = "Obrigatório";
    } else {
      const [ano, mes, dia] = newInvite.dataEvento.split("-").map(Number);
      const dataEvento = new Date(ano, mes - 1, dia);
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      if (dataEvento < hoje) {
        errors.dataEvento = "A data não pode ser no passado";
      }
    }
    if (Object.keys(errors).length > 0) {
      setNewInviteErrors(errors);
      return;
    }

    setCreatingInvite(true);
    try {
      const invite = await createInvite({
        nomeNoivo: newInvite.nomeNoivo,
        nomeNoiva: newInvite.nomeNoiva,
        email: newInvite.email,
        dataEvento: newInvite.dataEvento,
      });
      setCreatedInvite(invite);
      setInvites((prev) => [invite, ...prev]);
      setNewInvite({ nomeNoivo: "", nomeNoiva: "", email: "", dataEvento: "" });
      setShowNewInvite(false);
    } catch (e) {
      console.error(e);
    }
    setCreatingInvite(false);
  };

  const getShareMessage = (invite) => {
    const url = `${window.location.origin}/?codigo=${invite.code}`;
    return `Olá ${invite.nome_noivo} & ${invite.nome_noiva}! 💍\n\nO vosso questionário *Do Luxo à Mesa* está pronto.\n\nÉ só clicar aqui para começar: ${url}\n\n(O vosso código de acesso é: *${invite.code}*)\n\nPlaneamos cada detalhe. Criamos memórias inesquecíveis. ✨`;
  };

  const copyWithFeedback = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("submissions")
      .select("*")
      .order("data_evento", { ascending: true });
    if (!error) setSubmissions(data);
    setLoading(false);
  };

  const fetchInvites = async () => {
    setLoadingInvites(true);
    const { data, error } = await supabase
      .from("invites")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setInvites(data);
    setLoadingInvites(false);
  };

  const handleStatusChange = async (id, newStatus) => {
    await supabase
      .from("submissions")
      .update({ status: newStatus })
      .eq("id", id);
    setSubmissions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: newStatus } : s)),
    );
    if (selected?.id === id)
      setSelected((prev) => ({ ...prev, status: newStatus }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("submissions")
      .update(editData)
      .eq("id", selected.id);

    if (!error) {
      setSubmissions((prev) =>
        prev.map((s) => (s.id === selected.id ? { ...s, ...editData } : s)),
      );
      setSelected((prev) => ({ ...prev, ...editData }));
      setEditMode(false);
    } else {
      console.error(error);
      alert("Erro ao guardar. Tenta novamente.");
    }
    setSaving(false);
  };

  const handleEditOpen = () => {
    setEditData({
      nome_noivo: selected.nome_noivo || "",
      nome_noiva: selected.nome_noiva || "",
      contacto_principal: selected.contacto_principal || "",
      email: selected.email || "",
      morada: selected.morada || "",
      data_evento: selected.data_evento || "",
      local_evento: selected.local_evento || "",
      numero_convidados: selected.numero_convidados || "",
      hora_inicio: selected.hora_inicio || "",
      hora_termino: selected.hora_termino || "",
      hora_montagem: selected.hora_montagem || "",
      hora_limite_montagem: selected.hora_limite_montagem || "",
      hora_recolha: selected.hora_recolha || "",
      recolha_dia_seguinte: selected.recolha_dia_seguinte || "",
      nome_responsavel: selected.nome_responsavel || "",
      contacto_responsavel: selected.contacto_responsavel || "",
      relacao_responsavel: selected.relacao_responsavel || "",
      estilo_evento: selected.estilo_evento || [],
      estilo_outro: selected.estilo_outro || "",
      paleta_cores: selected.paleta_cores || [],
      paleta_observacoes: selected.paleta_observacoes || "",
      mesa_noivos: selected.mesa_noivos || [],
      cartoes_pratos: selected.cartoes_pratos || "",
      observacoes_cartoes: selected.observacoes_cartoes || "",
      descricao_mesa_noivos: selected.descricao_mesa_noivos || "",
      cenario_palco: selected.cenario_palco || [],
      descricao_cenario: selected.descricao_cenario || "",
      medidas_espaco: selected.medidas_espaco || "",
      centros_mesa: selected.centros_mesa || [],
      tipo_flores: selected.tipo_flores || [],
      numero_mesas: selected.numero_mesas || "",
      formato_mesas: selected.formato_mesas || "",
      lugares_por_mesa: selected.lugares_por_mesa || "",
      observacoes_mesas: selected.observacoes_mesas || "",
      texto_principal_placa: selected.texto_principal_placa || "",
      texto_secundario_placa: selected.texto_secundario_placa || "",
      estilo_placa: selected.estilo_placa || [],
      notas_placa: selected.notas_placa || "",
      morada_exacta: selected.morada_exacta || "",
      pessoa_abre_espaco: selected.pessoa_abre_espaco || "",
      contacto_pessoa_abre: selected.contacto_pessoa_abre || "",
      acesso_local: selected.acesso_local || [],
      notas_acesso: selected.notas_acesso || "",
      observacoes_gerais: selected.observacoes_gerais || "",
    });
    setEditMode(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const filtered = submissions
    .filter((s) => filterStatus === "Todos" || s.status === filterStatus)
    .filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const date = s.data_evento
        ? new Date(s.data_evento)
            .toLocaleDateString("pt-PT", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })
            .toLowerCase()
        : "";
      return (
        (s.nome_noivo || "").toLowerCase().includes(q) ||
        (s.nome_noiva || "").toLowerCase().includes(q) ||
        (s.local_evento || "").toLowerCase().includes(q) ||
        date.includes(q)
      );
    });

  const eventosPorMes = () => {
    const counts = {};
    submissions.forEach((s) => {
      if (!s.data_evento) return;
      const mes = new Date(s.data_evento).toLocaleDateString("pt-PT", {
        month: "short",
        year: "2-digit",
      });
      counts[mes] = (counts[mes] || 0) + 1;
    });
    return Object.entries(counts).map(([mes, total]) => ({ mes, total }));
  };

  const estilosMaisPedidos = () => {
    const counts = {};
    submissions.forEach((s) => {
      (s.estilo_evento || []).forEach((e) => {
        counts[e] = (counts[e] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
  };

  const paletasMaisPopulares = () => {
    const counts = {};
    submissions.forEach((s) => {
      (s.paleta_cores || []).forEach((c) => {
        counts[c] = (counts[c] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor);
  };

  const pipelineData = STATUS_OPTIONS.map((status, i) => ({
    status,
    total: submissions.filter((s) => s.status === status).length,
    fill: PIE_COLORS[i],
  })).filter((p) => p.total > 0);

  const mediaConvidados = () => {
    const validos = submissions.filter((s) => s.numero_convidados);
    if (!validos.length) return 0;
    return Math.round(
      validos.reduce((sum, s) => sum + s.numero_convidados, 0) / validos.length,
    );
  };

  // ===== Métricas de negócio para o dashboard =====

  // Total de convidados a servir (soma de todos os eventos ativos)
  const totalConvidados = () =>
    submissions
      .filter((s) => s.status !== "Concluído")
      .reduce((sum, s) => sum + (s.numero_convidados || 0), 0);

  // Taxa de resposta dos convites (preenchidos / total enviados)
  const taxaResposta = () => {
    if (!invites.length) return null;
    const preenchidos = invites.filter((i) => i.status === "Preenchido").length;
    return {
      preenchidos,
      total: invites.length,
      pct: Math.round((preenchidos / invites.length) * 100),
    };
  };

  // Próximo evento (o mais próximo no futuro, não concluído)
  const proximoEvento = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const futuros = submissions
      .filter((s) => s.data_evento && s.status !== "Concluído")
      .filter((s) => new Date(s.data_evento) >= hoje)
      .sort((a, b) => new Date(a.data_evento) - new Date(b.data_evento));
    return futuros[0] || null;
  };

  // Eventos que precisam de atenção: próximos 60 dias e ainda "Recebido"
  const eventosAtencao = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 60);
    return submissions
      .filter((s) => s.data_evento && s.status === "Recebido")
      .filter((s) => {
        const d = new Date(s.data_evento);
        return d >= hoje && d <= limite;
      })
      .sort((a, b) => new Date(a.data_evento) - new Date(b.data_evento));
  };

  // Dias até uma data (para etiquetas "faltam X dias")
  const diasAte = (date) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return Math.round((d - hoje) / (1000 * 60 * 60 * 24));
  };

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-PT", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--cream)",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: "white",
          borderBottom: "1px solid var(--gold-light)",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            maxWidth: "960px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 0",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "18px",
                color: "var(--gold)",
                fontFamily: "Playfair Display, serif",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                margin: "0 0 1px 0",
                lineHeight: 1.1,
              }}
            >
              Do Luxo à Mesa
            </h1>
            <p
              style={{
                fontSize: "9px",
                color: "var(--gold)",
                textTransform: "uppercase",
                letterSpacing: "0.25em",
                margin: 0,
              }}
            >
              by Luxury Events
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              fontSize: "11px",
              fontWeight: "600",
              padding: "8px 20px",
              borderRadius: "999px",
              border: "1.5px solid var(--gold-light)",
              color: "var(--gray-mid)",
              backgroundColor: "white",
              cursor: "pointer",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
          >
            Sair
          </button>
        </div>

        {/* Tabs */}
        <div style={{ maxWidth: "960px", margin: "0 auto", display: "flex" }}>
          {[
            { id: "clientes", label: "👥 Clientes" },
            { id: "convites", label: "🎟️ Convites" },
            { id: "dashboard", label: "📊 Dashboard" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "12px 20px",
                fontSize: "12px",
                fontWeight: "600",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                color: activeTab === tab.id ? "var(--gold)" : "var(--gray-mid)",
                borderBottom:
                  activeTab === tab.id
                    ? "2px solid var(--gold)"
                    : "2px solid transparent",
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div
        style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 16px" }}
      >
        {/* ---- TAB CLIENTES ---- */}
        {activeTab === "clientes" && (
          <motion.div
            key="tab-clientes"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Estatísticas */}
            <div
              className="stats-row filter-wrap"
              style={{ marginBottom: "24px" }}
            >
              <div
                className="h-scroll"
                style={{ gap: "12px", paddingRight: "32px" }}
              >
                {STATUS_OPTIONS.map((status) => {
                  const count = submissions.filter(
                    (s) => s.status === status,
                  ).length;
                  const colors = STATUS_COLORS[status];
                  return (
                    <div
                      key={status}
                      style={{
                        backgroundColor: "white",
                        borderRadius: "14px",
                        padding: "16px 12px",
                        textAlign: "center",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                        borderTop: `3px solid ${colors.color}`,
                      }}
                    >
                      <p
                        style={{
                          fontSize: "26px",
                          fontWeight: "600",
                          color: colors.color,
                          margin: "0 0 2px 0",
                        }}
                      >
                        {count}
                      </p>
                      <p
                        style={{
                          fontSize: "11px",
                          color: "var(--gray-mid)",
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {status}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pesquisa */}
            <div style={{ position: "relative", marginBottom: "12px" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: "14px",
                  pointerEvents: "none",
                  color: "var(--gray-mid)",
                }}
              >
                🔍
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome, local ou data..."
                style={{
                  width: "100%",
                  padding: "11px 40px 11px 42px",
                  borderRadius: "12px",
                  fontSize: "13px",
                  border: "1.5px solid var(--gold-light)",
                  outline: "none",
                  transition: "all 0.2s",
                  fontFamily: "Inter, sans-serif",
                  color: "var(--charcoal)",
                  backgroundColor: "white",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--gold)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(201,168,76,0.12)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--gold-light)";
                  e.target.style.boxShadow = "none";
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "16px",
                    color: "var(--gray-mid)",
                    padding: "2px 4px",
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filtros de estado */}
            <div className="filter-wrap" style={{ marginBottom: "8px" }}>
              <div
                className="h-scroll"
                style={{
                  gap: "8px",
                  alignItems: "center",
                  paddingRight: "32px",
                }}
              >
                {["Todos", ...STATUS_OPTIONS].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    style={{
                      padding: "7px 18px",
                      borderRadius: "999px",
                      fontSize: "12px",
                      fontWeight: filterStatus === status ? "600" : "400",
                      border: `1px solid ${filterStatus === status ? "var(--gold)" : "var(--gold-light)"}`,
                      backgroundColor:
                        filterStatus === status ? "var(--gold)" : "white",
                      color:
                        filterStatus === status ? "white" : "var(--charcoal)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Contador de resultados da pesquisa */}
            {search && (
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--gray-mid)",
                  margin: "0 0 16px 4px",
                }}
              >
                {filtered.length === 0
                  ? "Sem resultados"
                  : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`}
              </p>
            )}
            {!search && <div style={{ marginBottom: "16px" }} />}

            {/* Lista */}
            {loading ? (
              <p
                style={{
                  textAlign: "center",
                  padding: "60px",
                  color: "var(--gray-mid)",
                  fontSize: "14px",
                }}
              >
                A carregar...
              </p>
            ) : filtered.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  padding: "60px",
                  color: "var(--gray-mid)",
                  fontSize: "14px",
                }}
              >
                Nenhum formulário encontrado.
              </p>
            ) : (
              <div
                className="clients-list"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {filtered.map((s, idx) => {
                  const colors =
                    STATUS_COLORS[s.status] || STATUS_COLORS["Recebido"];
                  return (
                    <motion.div
                      key={s.id}
                      onClick={() => setSelected(s)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.25,
                        ease: "easeOut",
                        delay: Math.min(idx * 0.04, 0.3),
                      }}
                      whileHover={{
                        y: -2,
                        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                      }}
                      style={{
                        backgroundColor: "white",
                        borderRadius: "14px",
                        padding: "18px 22px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: "12px",
                        borderLeft: `4px solid ${colors.color}`,
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: "15px",
                            fontWeight: "500",
                            color: "var(--charcoal)",
                            margin: "0 0 4px 0",
                          }}
                        >
                          {s.nome_noivo || "—"} & {s.nome_noiva || "—"}
                        </p>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "var(--gray-mid)",
                            margin: 0,
                          }}
                        >
                          {formatDate(s.data_evento)} ·{" "}
                          {s.local_evento || "Local não definido"}
                        </p>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "12px",
                            padding: "4px 12px",
                            borderRadius: "999px",
                            backgroundColor: colors.bg,
                            color: colors.color,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          {s.status}
                        </span>
                        <span
                          style={{ fontSize: "13px", color: "var(--gold)" }}
                        >
                          Ver detalhes →
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ---- TAB CONVITES ---- */}
        {activeTab === "convites" && (
          <motion.div
            key="tab-convites"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Notificação de convite criado */}
            <AnimatePresence>
              {createdInvite && (
                <motion.div
                  onClick={() => setCreatedInvite(null)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 50,
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
                      backgroundColor: "#F0FDF4",
                      borderRadius: "16px",
                      padding: "20px 24px",
                      width: "100%",
                      maxWidth: "480px",
                      boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
                      border: "1px solid #BBF7D0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "16px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#166534",
                            margin: "0 0 2px 0",
                          }}
                        >
                          ✓ Convite criado com sucesso!
                        </p>
                        <p
                          style={{
                            fontSize: "13px",
                            color: "#166534",
                            margin: 0,
                          }}
                        >
                          {createdInvite.nome_noivo} &{" "}
                          {createdInvite.nome_noiva}
                        </p>
                      </div>
                      <button
                        onClick={() => setCreatedInvite(null)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#166534",
                          fontSize: "18px",
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Mensagem */}
                    <div
                      style={{
                        backgroundColor: "white",
                        borderRadius: "10px",
                        padding: "14px 18px",
                        marginBottom: "14px",
                        border: "1px solid #BBF7D0",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "10px",
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          margin: "0 0 8px 0",
                        }}
                      >
                        Mensagem para partilhar
                      </p>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "var(--charcoal)",
                          margin: 0,
                          lineHeight: "1.6",
                          whiteSpace: "pre-line",
                        }}
                      >
                        {getShareMessage(createdInvite)}
                      </p>
                    </div>

                    {/* Botão partilhar */}
                    <button
                      onClick={() => setShareTarget(createdInvite)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                        backgroundColor: "var(--gold)",
                        color: "white",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(201,168,76,0.35)",
                        transition: "all 0.2s",
                      }}
                    >
                      ↗ Partilhar
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botão novo convite */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: "20px",
              }}
            >
              <button
                onClick={() => {
                  setShowNewInvite(true);
                  setCreatedInvite(null);
                }}
                style={{
                  padding: "10px 22px",
                  borderRadius: "10px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  backgroundColor: "var(--gold)",
                  color: "white",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(201,168,76,0.3)",
                }}
              >
                + Novo Convite
              </button>
            </div>

            {/* Formulário novo convite */}
            {showNewInvite && (
              <div
                style={{
                  backgroundColor: "white",
                  borderRadius: "16px",
                  padding: "24px",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                  marginBottom: "20px",
                  border: "1px solid var(--gold-light)",
                }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    color: "var(--charcoal)",
                    margin: "0 0 20px 0",
                    fontFamily: "Playfair Display, serif",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Novo Convite
                </h3>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px",
                    marginBottom: "14px",
                  }}
                >
                  {[
                    {
                      key: "nomeNoivo",
                      label: "Nome do Noivo",
                      placeholder: "Ex: João Silva",
                    },
                    {
                      key: "nomeNoiva",
                      label: "Nome da Noiva",
                      placeholder: "Ex: Maria Santos",
                    },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label
                        style={{
                          fontSize: "11px",
                          fontWeight: "600",
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: newInviteErrors[key]
                            ? "#EF4444"
                            : "var(--charcoal)",
                          display: "block",
                          marginBottom: "6px",
                        }}
                      >
                        {label} *
                      </label>
                      <input
                        type="text"
                        value={newInvite[key]}
                        placeholder={placeholder}
                        onChange={(e) => {
                          setNewInvite((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }));
                          if (newInviteErrors[key])
                            setNewInviteErrors((prev) => {
                              const n = { ...prev };
                              delete n[key];
                              return n;
                            });
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: `1.5px solid ${newInviteErrors[key] ? "#F87171" : "var(--gold-light)"}`,
                          fontSize: "13px",
                          outline: "none",
                          fontFamily: "Inter, sans-serif",
                          boxSizing: "border-box",
                        }}
                      />
                      {newInviteErrors[key] && (
                        <p
                          style={{
                            fontSize: "11px",
                            color: "#EF4444",
                            margin: "4px 0 0",
                          }}
                        >
                          ⚠ {newInviteErrors[key]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px",
                    marginBottom: "20px",
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: newInviteErrors.dataEvento
                          ? "#EF4444"
                          : "var(--charcoal)",
                        display: "block",
                        marginBottom: "6px",
                      }}
                    >
                      Data do Evento *
                    </label>
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={newInvite.dataEvento}
                      onChange={(e) => {
                        setNewInvite((prev) => ({
                          ...prev,
                          dataEvento: e.target.value,
                        }));
                        if (newInviteErrors.dataEvento)
                          setNewInviteErrors((prev) => {
                            const n = { ...prev };
                            delete n.dataEvento;
                            return n;
                          });
                      }}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: `1.5px solid ${newInviteErrors.dataEvento ? "#F87171" : "var(--gold-light)"}`,
                        fontSize: "13px",
                        outline: "none",
                        fontFamily: "Inter, sans-serif",
                        boxSizing: "border-box",
                      }}
                    />
                    {newInviteErrors.dataEvento && (
                      <p
                        style={{
                          fontSize: "11px",
                          color: "#EF4444",
                          margin: "4px 0 0",
                        }}
                      >
                        ⚠ {newInviteErrors.dataEvento}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--charcoal)",
                        display: "block",
                        marginBottom: "6px",
                      }}
                    >
                      Email (opcional)
                    </label>
                    <input
                      type="email"
                      value={newInvite.email}
                      placeholder="Ex: joao.maria@email.com"
                      onChange={(e) =>
                        setNewInvite((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        border: "1.5px solid var(--gold-light)",
                        fontSize: "13px",
                        outline: "none",
                        fontFamily: "Inter, sans-serif",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => {
                      setShowNewInvite(false);
                      setNewInviteErrors({});
                    }}
                    style={{
                      padding: "10px 20px",
                      borderRadius: "8px",
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
                    onClick={handleCreateInvite}
                    disabled={creatingInvite}
                    style={{
                      padding: "10px 24px",
                      borderRadius: "8px",
                      fontSize: "13px",
                      fontWeight: "600",
                      cursor: "pointer",
                      backgroundColor: creatingInvite
                        ? "var(--gold-light)"
                        : "var(--gold)",
                      color: "white",
                      border: "none",
                    }}
                  >
                    {creatingInvite ? "A criar..." : "Criar Convite"}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de convites */}
            {loadingInvites ? (
              <p
                style={{
                  textAlign: "center",
                  padding: "40px",
                  color: "var(--gray-mid)",
                  fontSize: "14px",
                }}
              >
                A carregar...
              </p>
            ) : invites.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <p style={{ fontSize: "32px", marginBottom: "12px" }}>🎟️</p>
                <p style={{ fontSize: "14px", color: "var(--gray-mid)" }}>
                  Ainda não há convites criados.
                </p>
              </div>
            ) : (
              <div
                className="invites-list"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {invites.map((invite, idx) => {
                  const isPendente = invite.status === "Pendente";
                  return (
                    <motion.div
                      key={invite.id}
                      onClick={() => setSelectedInvite(invite)}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.25,
                        ease: "easeOut",
                        delay: Math.min(idx * 0.04, 0.3),
                      }}
                      whileHover={{
                        y: -2,
                        boxShadow: "0 6px 20px rgba(0,0,0,0.08)",
                      }}
                      style={{
                        backgroundColor: "white",
                        borderRadius: "14px",
                        padding: "18px 22px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                        borderLeft: `4px solid ${isPendente ? "var(--gold-light)" : "#22C55E"}`,
                        cursor: "pointer",
                        transition: "box-shadow 0.2s",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: "15px",
                            fontWeight: "500",
                            color: "var(--charcoal)",
                            margin: "0 0 4px 0",
                          }}
                        >
                          {invite.nome_noivo} & {invite.nome_noiva}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "var(--gold)",
                              letterSpacing: "0.08em",
                            }}
                          >
                            {invite.code}
                          </span>
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--gray-mid)",
                            }}
                          >
                            {invite.data_evento
                              ? new Date(invite.data_evento).toLocaleDateString(
                                  "pt-PT",
                                  {
                                    day: "2-digit",
                                    month: "long",
                                    year: "numeric",
                                  },
                                )
                              : "Sem data"}
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "flex-end",
                          gap: "10px",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontSize: "11px",
                            padding: "4px 10px",
                            borderRadius: "999px",
                            backgroundColor: isPendente ? "#FEF9EC" : "#F0FDF4",
                            color: isPendente ? "var(--gold)" : "#22C55E",
                            border: `1px solid ${isPendente ? "var(--gold-light)" : "#BBF7D0"}`,
                            fontWeight: "500",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {invite.status}
                        </span>
                        {isPendente && (
                          <button
                            className="btn-compact"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInviteToDelete(invite);
                            }}
                            title="Remover convite"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              border: "1px solid #FECACA",
                              backgroundColor: "#FEF2F2",
                              color: "#DC2626",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: "500",
                              transition: "all 0.2s",
                              flexShrink: 0,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <svg
                              width="14"
                              height="14"
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
                            Remover
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
            {/* Confirmação de remoção */}
            <AnimatePresence>
              {inviteToDelete && (
                <motion.div
                  onClick={() => setInviteToDelete(null)}
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
                      O convite de{" "}
                      <strong>
                        {inviteToDelete.nome_noivo} &{" "}
                        {inviteToDelete.nome_noiva}
                      </strong>{" "}
                      será removido. Esta ação não pode ser anulada.
                    </p>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <button
                        onClick={() => setInviteToDelete(null)}
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
                        onClick={async () => {
                          const { error } = await supabase
                            .from("invites")
                            .delete()
                            .eq("id", inviteToDelete.id);
                          if (error) {
                            console.error("Erro ao remover convite:", error);
                            alert(
                              "Não foi possível remover o convite. Tenta novamente.",
                            );
                            return;
                          }
                          setInvites((prev) =>
                            prev.filter((i) => i.id !== inviteToDelete.id),
                          );
                          if (selectedInvite?.id === inviteToDelete.id)
                            setSelectedInvite(null);
                          setInviteToDelete(null);
                        }}
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
            {/* Drawer do convite seleccionado */}
            <AnimatePresence>
              {selectedInvite && (
                <motion.div
                  onClick={() => setSelectedInvite(null)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 50,
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
                      backgroundColor: "#F0FDF4",
                      borderRadius: "16px",
                      padding: "20px 24px",
                      width: "100%",
                      maxWidth: "480px",
                      boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
                      border: "1px solid #BBF7D0",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "16px",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: "#166534",
                            margin: "0 0 2px 0",
                          }}
                        >
                          {selectedInvite.nome_noivo} &{" "}
                          {selectedInvite.nome_noiva}
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            color: "#166534",
                            margin: 0,
                          }}
                        >
                          {selectedInvite.data_evento
                            ? new Date(
                                selectedInvite.data_evento,
                              ).toLocaleDateString("pt-PT", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })
                            : "Sem data"}{" "}
                          · {selectedInvite.status}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedInvite(null)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#166534",
                          fontSize: "18px",
                        }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Mensagem */}
                    <div
                      style={{
                        backgroundColor: "white",
                        borderRadius: "10px",
                        padding: "14px 18px",
                        marginBottom: "14px",
                        border: "1px solid #BBF7D0",
                      }}
                    >
                      <p
                        style={{
                          fontSize: "10px",
                          color: "#6B7280",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          margin: "0 0 8px 0",
                        }}
                      >
                        Mensagem para partilhar
                      </p>
                      <p
                        style={{
                          fontSize: "13px",
                          color: "var(--charcoal)",
                          margin: 0,
                          lineHeight: "1.6",
                          whiteSpace: "pre-line",
                        }}
                      >
                        {getShareMessage(selectedInvite)}
                      </p>
                    </div>

                    <button
                      onClick={() => setShareTarget(selectedInvite)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        borderRadius: "10px",
                        fontSize: "13px",
                        fontWeight: "600",
                        cursor: "pointer",
                        backgroundColor: "var(--gold)",
                        color: "white",
                        border: "none",
                        boxShadow: "0 4px 12px rgba(201,168,76,0.35)",
                        transition: "all 0.2s",
                      }}
                    >
                      ↗ Partilhar
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ---- TAB DASHBOARD ---- */}
        {activeTab === "dashboard" && (
          <motion.div
            key="tab-dashboard"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* ===== ZONA 1 — O essencial ===== */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              {/* Eventos ativos */}
              <div style={kpiCardStyle}>
                <p style={{ ...kpiValueStyle, color: "var(--gold)" }}>
                  {submissions.filter((s) => s.status !== "Concluído").length}
                </p>
                <p style={kpiLabelStyle}>Eventos Activos</p>
              </div>

              {/* Total de convidados a servir */}
              <div style={kpiCardStyle}>
                <p style={{ ...kpiValueStyle, color: "#3B82F6" }}>
                  {totalConvidados()}
                </p>
                <p style={kpiLabelStyle}>Convidados a Servir</p>
              </div>

              {/* Confirmados */}
              <div style={kpiCardStyle}>
                <p style={{ ...kpiValueStyle, color: "#22C55E" }}>
                  {submissions.filter((s) => s.status === "Confirmado").length}
                </p>
                <p style={kpiLabelStyle}>Confirmados</p>
              </div>

              {/* Taxa de resposta dos convites */}
              <div style={kpiCardStyle}>
                {taxaResposta() ? (
                  <>
                    <p style={{ ...kpiValueStyle, color: "var(--gold-dark)" }}>
                      {taxaResposta().pct}%
                    </p>
                    <p style={kpiLabelStyle}>
                      Convites Preenchidos
                      <br />
                      <span style={{ fontSize: "10px", opacity: 0.7 }}>
                        {taxaResposta().preenchidos} de {taxaResposta().total}
                      </span>
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ ...kpiValueStyle, color: "var(--gold-light)" }}>
                      —
                    </p>
                    <p style={kpiLabelStyle}>Sem convites ainda</p>
                  </>
                )}
              </div>
            </div>

            {/* Próximo evento — destaque */}
            {proximoEvento() && (
              <div
                onClick={() => setSelected(proximoEvento())}
                style={{
                  backgroundColor: "var(--gold)",
                  borderRadius: "16px",
                  padding: "20px 24px",
                  marginBottom: "28px",
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(201,168,76,0.3)",
                  color: "white",
                }}
              >
                <p
                  style={{
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.15em",
                    margin: "0 0 8px 0",
                    opacity: 0.85,
                  }}
                >
                  Próximo Evento
                </p>
                <p
                  style={{
                    fontSize: "20px",
                    fontFamily: "Playfair Display, serif",
                    margin: "0 0 6px 0",
                  }}
                >
                  {proximoEvento().nome_noivo} & {proximoEvento().nome_noiva}
                </p>
                <p style={{ fontSize: "13px", margin: 0, opacity: 0.95 }}>
                  {formatDate(proximoEvento().data_evento)}
                  {(() => {
                    const dias = diasAte(proximoEvento().data_evento);
                    if (dias === 0) return " · É hoje!";
                    if (dias === 1) return " · Amanhã";
                    return ` · Faltam ${dias} dias`;
                  })()}
                </p>
              </div>
            )}

            {/* ===== ZONA 2 — A precisar de atenção ===== */}
            {eventosAtencao().length > 0 && (
              <div style={{ marginBottom: "28px" }}>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "var(--gray-mid)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    margin: "0 0 12px 4px",
                  }}
                >
                  A precisar de atenção
                </p>
                <div
                  style={{
                    backgroundColor: "#FEF9EC",
                    borderRadius: "16px",
                    padding: "8px",
                    border: "1px solid var(--gold-light)",
                  }}
                >
                  {eventosAtencao().map((s, i) => {
                    const dias = diasAte(s.data_evento);
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelected(s)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          borderBottom:
                            i < eventosAtencao().length - 1
                              ? "1px solid rgba(201,168,76,0.15)"
                              : "none",
                          cursor: "pointer",
                          gap: "12px",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: "14px",
                              fontWeight: "500",
                              color: "var(--charcoal)",
                              margin: "0 0 2px 0",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {s.nome_noivo} & {s.nome_noiva}
                          </p>
                          <p
                            style={{
                              fontSize: "12px",
                              color: "var(--gray-mid)",
                              margin: 0,
                            }}
                          >
                            {formatDate(s.data_evento)}
                          </p>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            color: dias <= 14 ? "#DC2626" : "var(--gold-dark)",
                            backgroundColor: "white",
                            padding: "4px 10px",
                            borderRadius: "999px",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {dias === 0
                            ? "Hoje"
                            : dias === 1
                              ? "Amanhã"
                              : `${dias} dias`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ===== ZONA 3 — Tendências do negócio ===== */}

            {/* Eventos por mês */}
            <ChartCard title="Eventos por Mês">
              {eventosPorMes().length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={eventosPorMes()}
                    margin={{ top: 24, right: 10, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 12, fill: "var(--gray-mid)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "var(--gray-mid)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Bar
                      dataKey="total"
                      fill="var(--gold)"
                      radius={[6, 6, 0, 0]}
                      name="Eventos"
                      label={{
                        position: "top",
                        fontSize: 13,
                        fill: "var(--gold-dark)",
                        fontWeight: 600,
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Estilos mais pedidos */}
            <ChartCard title="Estilos Mais Pedidos">
              {estilosMaisPedidos().length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer
                  width="100%"
                  height={estilosMaisPedidos().length * 44 + 20}
                >
                  <BarChart
                    data={estilosMaisPedidos()}
                    layout="vertical"
                    margin={{ top: 0, right: 36, left: 10, bottom: 0 }}
                  >
                    <XAxis type="number" hide allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={130}
                      tick={{ fontSize: 12, fill: "var(--charcoal)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Bar
                      dataKey="valor"
                      fill="var(--gold)"
                      radius={[0, 6, 6, 0]}
                      name="Pedidos"
                      label={{
                        position: "right",
                        fontSize: 13,
                        fill: "var(--gold-dark)",
                        fontWeight: 600,
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Paletas mais populares */}
            <ChartCard title="Paletas Mais Populares">
              {paletasMaisPopulares().length === 0 ? (
                <EmptyChart />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  {paletasMaisPopulares().map((p, index) => {
                    const max = paletasMaisPopulares()[0].valor;
                    const pct = Math.round((p.valor / max) * 100);
                    return (
                      <div key={p.nome}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "13px",
                              color: "var(--charcoal)",
                            }}
                          >
                            {p.nome}
                          </span>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: "600",
                              color: "var(--gold-dark)",
                            }}
                          >
                            {p.valor}
                          </span>
                        </div>
                        <div
                          style={{
                            height: "8px",
                            borderRadius: "999px",
                            backgroundColor: "#F5ECD7",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              borderRadius: "999px",
                              backgroundColor:
                                GOLD_SHADES[index % GOLD_SHADES.length],
                              transition: "width 0.5s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>

            {/* Pipeline de estados — barras horizontais com valor visível */}
            <ChartCard title="Pipeline de Estados">
              {pipelineData.length === 0 ? (
                <EmptyChart />
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {STATUS_OPTIONS.map((status, i) => {
                    const total = submissions.filter(
                      (s) => s.status === status,
                    ).length;
                    const max = submissions.length || 1;
                    const pct = Math.round((total / max) * 100);
                    const colors = STATUS_COLORS[status];
                    return (
                      <div key={status}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "4px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "13px",
                              color: "var(--charcoal)",
                            }}
                          >
                            {status}
                          </span>
                          <span
                            style={{
                              fontSize: "13px",
                              fontWeight: "600",
                              color: colors.color,
                            }}
                          >
                            {total}
                          </span>
                        </div>
                        <div
                          style={{
                            height: "8px",
                            borderRadius: "999px",
                            backgroundColor: "#F3F4F6",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              borderRadius: "999px",
                              backgroundColor: colors.color,
                              transition: "width 0.5s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ChartCard>
          </motion.div>
        )}
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div
            onClick={() => setSelected(null)}
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
                maxWidth: "480px",
                height: "100%",
                overflowY: "auto",
                padding: "28px 24px",
                boxShadow: "-4px 0 24px rgba(0,0,0,0.1)",
              }}
            >
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
                      {selected.nome_noivo} & {selected.nome_noiva}
                    </h2>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--gray-mid)",
                        margin: 0,
                      }}
                    >
                      {formatDate(selected.data_evento)}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    {!editMode && (
                      <button
                        onClick={handleEditOpen}
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
                      onClick={() => {
                        setSelected(null);
                        setEditMode(false);
                      }}
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

                {/* Botão briefing */}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() =>
                      window.open(`/briefing/${selected.id}`, "_blank")
                    }
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      borderRadius: "10px",
                      fontSize: "12px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      backgroundColor: "var(--gold)",
                      color: "white",
                      border: "none",
                    }}
                  >
                    📄 Ver Briefing
                  </button>
                </div>
              </div>

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
                          onClick={() =>
                            handleStatusChange(selected.id, status)
                          }
                          style={{
                            padding: "6px 14px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            whiteSpace: "nowrap",
                            border: `1px solid ${colors.border}`,
                            backgroundColor: isActive
                              ? colors.color
                              : colors.bg,
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
              </div>

              {/* Modo leitura */}
              {!editMode && (
                <>
                  <Section title="Dados Principais">
                    <DetailRow
                      label="Contacto"
                      value={selected.contacto_principal}
                    />
                    <DetailRow label="Email" value={selected.email} />
                    <DetailRow label="Morada" value={selected.morada} />
                    <DetailRow
                      label="Local do Evento"
                      value={selected.local_evento}
                    />
                    <DetailRow
                      label="Nº Convidados"
                      value={selected.numero_convidados}
                    />
                    <DetailRow
                      label="Hora Início"
                      value={selected.hora_inicio}
                    />
                    <DetailRow
                      label="Hora Término"
                      value={selected.hora_termino}
                    />
                    <DetailRow
                      label="Hora Montagem"
                      value={selected.hora_montagem}
                    />
                    <DetailRow
                      label="Hora Limite Montagem"
                      value={selected.hora_limite_montagem}
                    />
                    <DetailRow
                      label="Hora Recolha"
                      value={selected.hora_recolha}
                    />
                    <DetailRow
                      label="Recolha Dia Seguinte"
                      value={selected.recolha_dia_seguinte}
                    />
                  </Section>
                  <Section title="Contacto no Dia">
                    <DetailRow
                      label="Responsável"
                      value={selected.nome_responsavel}
                    />
                    <DetailRow
                      label="Contacto"
                      value={selected.contacto_responsavel}
                    />
                    <DetailRow
                      label="Relação"
                      value={selected.relacao_responsavel}
                    />
                  </Section>
                  <Section title="Estilo e Cores">
                    <DetailRow
                      label="Estilo"
                      value={selected.estilo_evento?.join(", ")}
                    />
                    <DetailRow
                      label="Outro Estilo"
                      value={selected.estilo_outro}
                    />
                    <DetailRow
                      label="Paleta de Cores"
                      value={selected.paleta_cores?.join(", ")}
                    />
                    <DetailRow
                      label="Observações Paleta"
                      value={selected.paleta_observacoes}
                    />
                  </Section>
                  <Section title="Detalhes Decorativos">
                    <DetailRow
                      label="Mesa dos Noivos"
                      value={selected.mesa_noivos?.join(", ")}
                    />
                    <DetailRow
                      label="Cartões nos Pratos"
                      value={selected.cartoes_pratos}
                    />
                    <DetailRow
                      label="Obs. Cartões"
                      value={selected.observacoes_cartoes}
                    />
                    <DetailRow
                      label="Descrição Mesa Noivos"
                      value={selected.descricao_mesa_noivos}
                    />
                    <DetailRow
                      label="Cenário de Palco"
                      value={selected.cenario_palco?.join(", ")}
                    />
                    <DetailRow
                      label="Descrição Cenário"
                      value={selected.descricao_cenario}
                    />
                    <DetailRow
                      label="Medidas / Limitações"
                      value={selected.medidas_espaco}
                    />
                  </Section>
                  <Section title="Convidados e Placa">
                    <DetailRow
                      label="Centros de Mesa"
                      value={selected.centros_mesa?.join(", ")}
                    />
                    <DetailRow
                      label="Tipo de Flores"
                      value={selected.tipo_flores?.join(", ")}
                    />
                    <DetailRow label="Nº Mesas" value={selected.numero_mesas} />
                    <DetailRow
                      label="Formato Mesas"
                      value={selected.formato_mesas}
                    />
                    <DetailRow
                      label="Lugares por Mesa"
                      value={selected.lugares_por_mesa}
                    />
                    <DetailRow
                      label="Obs. Mesas"
                      value={selected.observacoes_mesas}
                    />
                    <DetailRow
                      label="Texto Principal Placa"
                      value={selected.texto_principal_placa}
                    />
                    <DetailRow
                      label="Texto Secundário Placa"
                      value={selected.texto_secundario_placa}
                    />
                    <DetailRow
                      label="Estilo Placa"
                      value={selected.estilo_placa?.join(", ")}
                    />
                    <DetailRow
                      label="Notas Placa"
                      value={selected.notas_placa}
                    />
                  </Section>
                  <Section title="Logística">
                    <DetailRow
                      label="Morada Exacta"
                      value={selected.morada_exacta}
                    />
                    <DetailRow
                      label="Pessoa que Abre"
                      value={selected.pessoa_abre_espaco}
                    />
                    <DetailRow
                      label="Contacto"
                      value={selected.contacto_pessoa_abre}
                    />
                    <DetailRow
                      label="Acesso Local"
                      value={selected.acesso_local?.join(", ")}
                    />
                    <DetailRow
                      label="Notas Acesso"
                      value={selected.notas_acesso}
                    />
                    <DetailRow
                      label="Observações Gerais"
                      value={selected.observacoes_gerais}
                    />
                  </Section>
                </>
              )}

              {/* Modo edição */}
              {editMode && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "20px",
                  }}
                >
                  {[
                    {
                      section: "Dados Principais",
                      fields: [
                        {
                          key: "nome_noivo",
                          label: "Nome do Noivo",
                          type: "text",
                        },
                        {
                          key: "nome_noiva",
                          label: "Nome da Noiva",
                          type: "text",
                        },
                        {
                          key: "contacto_principal",
                          label: "Contacto Principal",
                          type: "tel",
                        },
                        { key: "email", label: "Email", type: "email" },
                        { key: "morada", label: "Morada", type: "text" },
                        {
                          key: "data_evento",
                          label: "Data do Evento",
                          type: "date",
                        },
                        {
                          key: "local_evento",
                          label: "Local do Evento",
                          type: "text",
                        },
                        {
                          key: "numero_convidados",
                          label: "Nº Convidados",
                          type: "number",
                        },
                        {
                          key: "hora_inicio",
                          label: "Hora Início",
                          type: "time",
                        },
                        {
                          key: "hora_termino",
                          label: "Hora Término",
                          type: "time",
                        },
                        {
                          key: "hora_montagem",
                          label: "Hora Montagem",
                          type: "time",
                        },
                        {
                          key: "hora_limite_montagem",
                          label: "Hora Limite Montagem",
                          type: "time",
                        },
                        {
                          key: "hora_recolha",
                          label: "Hora Recolha",
                          type: "time",
                        },
                        {
                          key: "recolha_dia_seguinte",
                          label: "Recolha Dia Seguinte",
                          type: "text",
                        },
                      ],
                    },
                    {
                      section: "Contacto no Dia",
                      fields: [
                        {
                          key: "nome_responsavel",
                          label: "Responsável",
                          type: "text",
                        },
                        {
                          key: "contacto_responsavel",
                          label: "Contacto",
                          type: "tel",
                        },
                        {
                          key: "relacao_responsavel",
                          label: "Relação",
                          type: "text",
                        },
                      ],
                    },
                    {
                      section: "Estilo e Cores",
                      fields: [
                        {
                          key: "estilo_outro",
                          label: "Outro Estilo",
                          type: "text",
                        },
                        {
                          key: "paleta_observacoes",
                          label: "Observações Paleta",
                          type: "textarea",
                        },
                      ],
                    },
                    {
                      section: "Detalhes Decorativos",
                      fields: [
                        {
                          key: "observacoes_cartoes",
                          label: "Obs. Cartões",
                          type: "textarea",
                        },
                        {
                          key: "descricao_mesa_noivos",
                          label: "Descrição Mesa Noivos",
                          type: "textarea",
                        },
                        {
                          key: "descricao_cenario",
                          label: "Descrição Cenário",
                          type: "textarea",
                        },
                        {
                          key: "medidas_espaco",
                          label: "Medidas / Limitações",
                          type: "textarea",
                        },
                      ],
                    },
                    {
                      section: "Convidados e Placa",
                      fields: [
                        {
                          key: "numero_mesas",
                          label: "Nº Mesas",
                          type: "number",
                        },
                        {
                          key: "formato_mesas",
                          label: "Formato Mesas",
                          type: "text",
                        },
                        {
                          key: "lugares_por_mesa",
                          label: "Lugares por Mesa",
                          type: "number",
                        },
                        {
                          key: "observacoes_mesas",
                          label: "Obs. Mesas",
                          type: "textarea",
                        },
                        {
                          key: "texto_principal_placa",
                          label: "Texto Principal Placa",
                          type: "text",
                        },
                        {
                          key: "texto_secundario_placa",
                          label: "Texto Secundário Placa",
                          type: "text",
                        },
                        {
                          key: "notas_placa",
                          label: "Notas Placa",
                          type: "textarea",
                        },
                      ],
                    },
                    {
                      section: "Logística",
                      fields: [
                        {
                          key: "morada_exacta",
                          label: "Morada Exacta",
                          type: "textarea",
                        },
                        {
                          key: "pessoa_abre_espaco",
                          label: "Pessoa que Abre",
                          type: "text",
                        },
                        {
                          key: "contacto_pessoa_abre",
                          label: "Contacto",
                          type: "tel",
                        },
                        {
                          key: "notas_acesso",
                          label: "Notas Acesso",
                          type: "textarea",
                        },
                        {
                          key: "observacoes_gerais",
                          label: "Observações Gerais",
                          type: "textarea",
                        },
                      ],
                    },
                  ].map(({ section, fields }) => (
                    <div key={section}>
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
                        {section}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        {fields.map(({ key, label, type }) => (
                          <div key={key}>
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
                              {label}
                            </label>
                            {type === "textarea" ? (
                              <textarea
                                rows={2}
                                value={editData[key] || ""}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  border: "1.5px solid var(--gold-light)",
                                  fontSize: "13px",
                                  outline: "none",
                                  resize: "none",
                                  fontFamily: "Inter, sans-serif",
                                  boxSizing: "border-box",
                                }}
                              />
                            ) : (
                              <input
                                type={type}
                                value={editData[key] || ""}
                                onChange={(e) =>
                                  setEditData((prev) => ({
                                    ...prev,
                                    [key]: e.target.value,
                                  }))
                                }
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  border: "1.5px solid var(--gold-light)",
                                  fontSize: "13px",
                                  outline: "none",
                                  fontFamily: "Inter, sans-serif",
                                  boxSizing: "border-box",
                                }}
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div
                    style={{ display: "flex", gap: "10px", paddingTop: "8px" }}
                  >
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
                      onClick={handleSave}
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
        )}
      </AnimatePresence>
      {/* Modal de partilha */}
      <AnimatePresence>
        {shareTarget && (
          <motion.div
            onClick={() => setShareTarget(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
              style={{
                backgroundColor: "white",
                borderRadius: "20px 20px 0 0",
                padding: "24px 24px 40px",
                width: "100%",
                maxWidth: "480px",
                boxShadow: "0 -4px 32px rgba(0,0,0,0.15)",
              }}
            >
              {/* Handle */}
              <div
                style={{
                  width: "40px",
                  height: "4px",
                  borderRadius: "999px",
                  backgroundColor: "#E5E7EB",
                  margin: "0 auto 20px",
                }}
              />

              <p
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "var(--charcoal)",
                  textAlign: "center",
                  margin: "0 0 24px 0",
                }}
              >
                Partilhar com {shareTarget.nome_noivo} &{" "}
                {shareTarget.nome_noiva}
              </p>

              {/* Ícones */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "32px",
                  marginBottom: "24px",
                }}
              >
                {/* WhatsApp */}
                <button
                  onClick={() => {
                    const msg = encodeURIComponent(
                      getShareMessage(shareTarget),
                    );
                    window.open(`https://wa.me/?text=${msg}`, "_blank");
                    setShareTarget(null);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "16px",
                      backgroundColor: "#25D366",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 24 24"
                      fill="white"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--charcoal)",
                      fontWeight: "500",
                    }}
                  >
                    WhatsApp
                  </span>
                </button>

                {/* Instagram */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getShareMessage(shareTarget));
                    window.open(
                      "https://www.instagram.com/direct/inbox/",
                      "_blank",
                    );
                    setShareTarget(null);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "16px",
                      background:
                        "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 24 24"
                      fill="white"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "var(--charcoal)",
                      fontWeight: "500",
                    }}
                  >
                    Instagram
                  </span>
                </button>

                {/* Copiar */}
                <button
                  onClick={() => {
                    copyWithFeedback(
                      getShareMessage(shareTarget),
                      `msg-${shareTarget.id}`,
                    );
                    setTimeout(() => setShareTarget(null), 1500);
                  }}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "16px",
                      backgroundColor:
                        copiedId === `msg-${shareTarget.id}`
                          ? "#22C55E"
                          : "#F3F4F6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={
                        copiedId === `msg-${shareTarget.id}`
                          ? "white"
                          : "#6B7280"
                      }
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {copiedId === `msg-${shareTarget.id}` ? (
                        <path d="M20 6L9 17l-5-5" />
                      ) : (
                        <>
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </>
                      )}
                    </svg>
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: "500",
                      transition: "all 0.3s",
                      color:
                        copiedId === `msg-${shareTarget.id}`
                          ? "#22C55E"
                          : "var(--charcoal)",
                    }}
                  >
                    {copiedId === `msg-${shareTarget.id}`
                      ? "Copiado!"
                      : "Copiar"}
                  </span>
                </button>
              </div>

              {/* Nota Instagram */}
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--gray-mid)",
                  textAlign: "center",
                  margin: 0,
                }}
              >
                Para o Instagram, a mensagem é copiada automaticamente — basta
                colar no Direct.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
