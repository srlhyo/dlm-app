import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  exportClienteExcel,
  exportClientePDF,
  exportTodosExcel,
} from "../lib/exports";
import { createInvite } from "../lib/invites";
import logo from "../assets/logo.png";

const STATUS_OPTIONS = ["Recebido", "Em Preparação", "Confirmado", "Concluído"];

const STATUS_COLORS = {
  Recebido: { bg: "#FEF9EC", color: "#C9A84C", border: "#E8D5A3" },
  "Em Preparação": { bg: "#EFF6FF", color: "#3B82F6", border: "#BFDBFE" },
  Confirmado: { bg: "#F0FDF4", color: "#22C55E", border: "#BBF7D0" },
  Concluído: { bg: "#F9FAFB", color: "#6B7280", border: "#E5E7EB" },
};

const PIE_COLORS = ["#C9A84C", "#3B82F6", "#22C55E", "#6B7280"];
const GOLD_SHADES = ["#C9A84C", "#A07830", "#E8D5A3", "#7A5C20", "#F5ECD7"];

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

  const handleDeleteInvite = async (inviteId, e) => {
    e.stopPropagation();
    if (!window.confirm("Tens a certeza que queres remover este convite?"))
      return;
    await supabase.from("invites").delete().eq("id", inviteId);
    setInvites((prev) => prev.filter((i) => i.id !== inviteId));
    if (selectedInvite?.id === inviteId) setSelectedInvite(null);
    if (createdInvite?.id === inviteId) setCreatedInvite(null);
  };

  const handleCreateInvite = async () => {
    const errors = {};
    if (!newInvite.nomeNoivo.trim()) errors.nomeNoivo = "Obrigatório";
    if (!newInvite.nomeNoiva.trim()) errors.nomeNoiva = "Obrigatório";
    if (!newInvite.dataEvento) errors.dataEvento = "Obrigatório";
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
    const url = window.location.origin;
    return `Olá ${invite.nome_noivo} & ${invite.nome_noiva}! 💍\n\nO vosso questionário *Do Luxo à Mesa* está pronto.\n\nAcedam aqui: ${url}\n\nO vosso código de acesso é: *${invite.code}*\n\nPlaneamos cada detalhe. Criamos memórias inesquecíveis. ✨`;
  };

  const copyWithFeedback = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const shareInvite = async (invite) => {
    const message = getShareMessage(invite);

    // Web Share API — abre menu nativo no móvel
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Do Luxo à Mesa — Questionário dos Noivos",
          text: message,
        });
        return;
      } catch (e) {
        // Utilizador cancelou — não fazer nada
        if (e.name === "AbortError") return;
      }
    }

    // Fallback para desktop — copia para clipboard
    copyWithFeedback(message, `msg-${invite.id}`);
  };

  const copyShareMessage = (invite) => {
    shareInvite(invite);
  };
  const copyCode = (invite) => {
    copyWithFeedback(invite.code, `code-${invite.id}`);
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
          <>
            {/* Estatísticas */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: "12px",
                marginBottom: "28px",
              }}
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
                      padding: "20px",
                      textAlign: "center",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                      borderTop: `3px solid ${colors.color}`,
                    }}
                  >
                    <p
                      style={{
                        fontSize: "30px",
                        fontWeight: "600",
                        color: colors.color,
                        margin: "0 0 4px 0",
                      }}
                    >
                      {count}
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "var(--gray-mid)",
                        margin: 0,
                      }}
                    >
                      {status}
                    </p>
                  </div>
                );
              })}
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

            {/* Filtros + exportação */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "20px",
              }}
            >
              <div
                className="h-scroll"
                style={{ gap: "8px", alignItems: "center", maxWidth: "100%" }}
              >
                {["Todos", ...STATUS_OPTIONS].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    style={{
                      padding: "6px 16px",
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
                    }}
                  >
                    {status}
                  </button>
                ))}
                {search && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--gray-mid)",
                      margin: 0,
                    }}
                  >
                    {filtered.length === 0
                      ? "Sem resultados"
                      : `${filtered.length} resultado${filtered.length !== 1 ? "s" : ""}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => exportTodosExcel(submissions)}
                disabled={submissions.length === 0}
                style={{
                  padding: "8px 18px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: submissions.length === 0 ? "not-allowed" : "pointer",
                  backgroundColor:
                    submissions.length === 0
                      ? "var(--gold-light)"
                      : "var(--gold)",
                  color: "white",
                  border: "none",
                  whiteSpace: "nowrap",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                📊 Exportar Todos
              </button>
            </div>

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
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {filtered.map((s) => {
                  const colors =
                    STATUS_COLORS[s.status] || STATUS_COLORS["Recebido"];
                  return (
                    <div
                      key={s.id}
                      onClick={() => setSelected(s)}
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
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ---- TAB CONVITES ---- */}
        {activeTab === "convites" && (
          <>
            {/* Notificação de convite criado */}
            {createdInvite && (
              <div
                onClick={() => setCreatedInvite(null)}
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
                <div
                  onClick={(e) => e.stopPropagation()}
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
                        {createdInvite.nome_noivo} & {createdInvite.nome_noiva}
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
                </div>
              </div>
            )}

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
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                {invites.map((invite) => {
                  const isPendente = invite.status === "Pendente";
                  return (
                    <div
                      key={invite.id}
                      onClick={() => setSelectedInvite(invite)}
                      style={{
                        backgroundColor: "white",
                        borderRadius: "14px",
                        padding: "18px 22px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                        borderLeft: `4px solid ${isPendente ? "var(--gold-light)" : "#22C55E"}`,
                        cursor: "pointer",
                        transition: "box-shadow 0.2s",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
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
                          alignItems: "center",
                          gap: "8px",
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
                          }}
                        >
                          {invite.status}
                        </span>
                        <button
                          onClick={(e) => handleDeleteInvite(invite.id, e)}
                          title="Remover convite"
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            border: "1px solid #FECACA",
                            backgroundColor: "#FEF2F2",
                            color: "#EF4444",
                            cursor: "pointer",
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s",
                            flexShrink: 0,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Drawer do convite seleccionado */}
            {selectedInvite && (
              <div
                onClick={() => setSelectedInvite(null)}
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
                <div
                  onClick={(e) => e.stopPropagation()}
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
                </div>
              </div>
            )}
          </>
        )}

        {/* ---- TAB DASHBOARD ---- */}
        {activeTab === "dashboard" && (
          <>
            {/* KPIs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                marginBottom: "28px",
              }}
            >
              {[
                {
                  label: "Total de Eventos",
                  value: submissions.length,
                  color: "var(--gold)",
                },
                {
                  label: "Média de Convidados",
                  value: mediaConvidados(),
                  color: "#3B82F6",
                },
                {
                  label: "Eventos Activos",
                  value: submissions.filter((s) => s.status !== "Concluído")
                    .length,
                  color: "#22C55E",
                },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "14px",
                    padding: "24px 20px",
                    textAlign: "center",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "36px",
                      fontWeight: "600",
                      color: kpi.color,
                      margin: "0 0 6px 0",
                    }}
                  >
                    {kpi.value}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--gray-mid)",
                      margin: 0,
                    }}
                  >
                    {kpi.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Eventos por mês */}
            <ChartCard title="Eventos por Mês">
              {eventosPorMes().length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={eventosPorMes()}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                    <Tooltip
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid var(--gold-light)",
                        fontSize: "13px",
                      }}
                      cursor={{ fill: "rgba(201,168,76,0.08)" }}
                    />
                    <Bar
                      dataKey="total"
                      fill="var(--gold)"
                      radius={[6, 6, 0, 0]}
                      name="Eventos"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Pipeline — dois gráficos lado a lado */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "20px",
                marginBottom: "20px",
              }}
            >
              <ChartCard title="Pipeline de Estados">
                {pipelineData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pipelineData}
                        dataKey="total"
                        nameKey="status"
                        cx="50%"
                        cy="45%"
                        outerRadius={85}
                        innerRadius={40}
                      >
                        {pipelineData.map((entry) => (
                          <Cell key={entry.status} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "10px",
                          border: "1px solid var(--gold-light)",
                          fontSize: "13px",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--charcoal)",
                            }}
                          >
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Paletas Mais Populares">
                {paletasMaisPopulares().length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={paletasMaisPopulares()}
                        dataKey="valor"
                        nameKey="nome"
                        cx="50%"
                        cy="45%"
                        outerRadius={85}
                        innerRadius={40}
                      >
                        {paletasMaisPopulares().map((entry, index) => (
                          <Cell
                            key={entry.nome}
                            fill={GOLD_SHADES[index % GOLD_SHADES.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: "10px",
                          border: "1px solid var(--gold-light)",
                          fontSize: "13px",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--charcoal)",
                            }}
                          >
                            {value}
                          </span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>

            {/* Estilos mais pedidos */}
            <ChartCard title="Estilos Mais Pedidos">
              {estilosMaisPedidos().length === 0 ? (
                <EmptyChart />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={estilosMaisPedidos()}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                  >
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: "var(--gray-mid)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      width={130}
                      tick={{ fontSize: 12, fill: "var(--gray-mid)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "10px",
                        border: "1px solid var(--gold-light)",
                        fontSize: "13px",
                      }}
                      cursor={{ fill: "rgba(201,168,76,0.08)" }}
                    />
                    <Bar
                      dataKey="valor"
                      fill="var(--gold)"
                      radius={[0, 6, 6, 0]}
                      name="Pedidos"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </>
        )}
      </div>

      {/* Drawer */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
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
                  style={{ display: "flex", gap: "8px", alignItems: "center" }}
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {STATUS_OPTIONS.map((status) => {
                  const colors = STATUS_COLORS[status];
                  const isActive = selected.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selected.id, status)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "999px",
                        fontSize: "12px",
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
                  <DetailRow label="Hora Início" value={selected.hora_inicio} />
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
                  <DetailRow label="Notas Placa" value={selected.notas_placa} />
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
          </div>
        </div>
      )}
      {/* Modal de partilha */}
      {shareTarget && (
        <div
          onClick={() => setShareTarget(null)}
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
          <div
            onClick={(e) => e.stopPropagation()}
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
              Partilhar com {shareTarget.nome_noivo} & {shareTarget.nome_noiva}
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
                  const msg = encodeURIComponent(getShareMessage(shareTarget));
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
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
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
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
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
                      copiedId === `msg-${shareTarget.id}` ? "white" : "#6B7280"
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
                  {copiedId === `msg-${shareTarget.id}` ? "Copiado!" : "Copiar"}
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
          </div>
        </div>
      )}
    </div>
  );
}
