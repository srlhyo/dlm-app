import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { createInvite, getEventTypes } from "../lib/invites";
import { validateField } from "../lib/validation";
import {
  normalizeSubmission,
  getValorAtual,
  getResumoSubmissao,
} from "../lib/submissionFields";
import EventTypesTab from "../components/admin/EventTypesTab";
import CampoSeletor from "../components/admin/CampoSeletor";
import SubmissionDrawer from "../components/admin/SubmissionDrawer";
import CalendarioTab from "../components/admin/CalendarioTab";
import OperacionalTab from "../components/admin/OperacionalTab";
import { getReservas } from "../lib/reservas";
import FormField from "../components/form/FormField";
import { iniciarTour, tourJaVista } from "../lib/tour";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_OPTIONS = ["Recebido", "Em Preparação", "Confirmado", "Concluído"];

// Mini-tour do Painel de Novo Questionário — dispara a 1ª vez que o painel
// abre. Como o painel arranca sempre vazio, a explicação foca-se no
// mecanismo de escolha de campos, que é a parte menos óbvia.
const NOVO_CONVITE_TOUR_STEPS = (temVariosTipos) => {
  const passos = [];
  if (temVariosTipos) {
    passos.push({
      element: "#tour-novo-convite-tipo",
      popover: {
        title: "Tipo de Evento",
        description:
          "Escolhe primeiro o tipo de evento — os campos disponíveis mudam consoante a escolha.",
      },
    });
  }
  passos.push(
    {
      element: "#tour-campo-seletor",
      popover: {
        title: "Escolhe os campos",
        description:
          "O painel começa sempre vazio. Usa esta busca para adicionares só os campos que já souberes agora (ex: nomes, email, data) — podes remover qualquer um a qualquer momento.",
      },
    },
    {
      element: "#tour-criar-convite",
      disableActiveInteraction: true,
      popover: {
        title: "Quando estiveres pronta",
        description:
          "Cria o convite — o que preencheste aqui já vem pronto no formulário do casal/família.",
      },
    },
  );
  return passos;
};

// Mini-tour da tab Tipos de Evento — dispara a 1ª vez que se entra
// nessa tab
const TIPOS_EVENTO_TOUR_STEPS = [
  {
    element: "#tour-criar-tipo-evento",
    disableActiveInteraction: true,
    popover: {
      title: "Criar um tipo novo",
      description:
        "Podes começar do zero, ou duplicar um tipo existente e só ajustar as diferenças — mais rápido na maior parte dos casos.",
    },
  },
  {
    element: "#tour-lista-tipos-evento",
    popover: {
      title: "Os teus tipos de evento",
      description:
        "Cada tipo aparece aqui, com o número de passos e campos. Os botões ✏️ Editar e 🗑 Remover ficam sempre disponíveis, mesmo depois de criado.",
    },
  },
];

// Passos do tour guiado do Admin — os "element" referem-se aos ids
// adicionados na barra de navegação (ver render do cabeçalho)
const ADMIN_TOUR_STEPS = [
  {
    element: "#tour-admin-nav",
    popover: {
      title: "Bem-vinda ao painel!",
      description:
        "Aqui geres tudo: clientes, convites, o panorama do negócio, e os tipos de evento que ofereces. Vamos dar uma volta rápida.",
    },
  },
  {
    element: "#tour-tab-clientes",
    popover: {
      title: "Clientes",
      description:
        "Todos os eventos confirmados aparecem aqui, com o estado de cada um (Recebido, Em Preparação, Confirmado, Concluído).",
    },
  },
  {
    element: "#tour-tab-convites",
    popover: {
      title: "Convites",
      description:
        "Cria e gere os convites que envias aos teus clientes — cada um com um código único para o questionário deles.",
    },
  },
  {
    element: "#tour-tab-dashboard",
    popover: {
      title: "Dashboard",
      description:
        "Uma visão geral do negócio: próximos eventos, estilos e paletas mais pedidos, e o que precisa da tua atenção.",
    },
  },
  {
    element: "#tour-tab-calendario",
    popover: {
      title: "Calendário",
      description:
        "Vê todos os eventos do mês numa grelha. Percebe rapidamente que dias estão livres ou ocupados, e clica num evento para abrir a ficha completa.",
    },
  },
  {
    element: "#tour-tab-tiposEvento",
    popover: {
      title: "Tipos de Evento",
      description:
        "Aqui defines as perguntas de cada tipo de evento — Casamento, Batizado, ou o que precisares — sem programação.",
    },
  },
];

// Gera um título legível para um questionário (ex: "André & Andreia"), a
// partir do que a irmã escolheu preencher no Painel de Novo Questionário.
// Duas correcções importantes:
// 1. Se o uestionário já foi preenchido, usa os valores da SUBMISSÃO real
//    (o casal pode ter corrigido algo), não o que ficou gravado na
//    criação do uestionário.
// 2. Só entram no título campos de texto simples (nomes) — datas,
//    emails, telefones e números ficam de fora, não fazem sentido lá.
function getTituloConvite(invite, submissions, eventTypes) {
  const chaves = Object.keys(invite?.respostas || {});

  let submissao = null;
  if (invite?.submission_id && submissions) {
    submissao = submissions.find((s) => s.id === invite.submission_id) || null;
  }

  const tipo = eventTypes?.find((et) => et.id === invite?.event_type_id);
  const tiposPorCampo = {};
  getAllFields(tipo).forEach((f) => {
    tiposPorCampo[f.id] = f.type;
  });

  const valores = chaves
    .filter((chave) => !tiposPorCampo[chave] || tiposPorCampo[chave] === "text")
    .map((chave) =>
      submissao ? getValorAtual(submissao, chave) : invite.respostas[chave],
    )
    .map((v) => (Array.isArray(v) ? v.join(", ") : v))
    .filter((v) => typeof v === "string" && v.trim() !== "")
    .slice(0, 2); // no máximo dois nomes — faz sentido para qualquer evento

  if (valores.length > 0) return valores.join(" & ");

  // Sem nenhum campo de texto preenchido — usa o tipo de evento + código,
  // para nunca ficar com um card sem nada útil para identificar
  return tipo
    ? `${tipo.nome} · ${invite.code}`
    : invite.code || "Questionário sem nome";
}

// Junta os campos de todos os passos de um tipo de evento numa única
// lista, guardando também o título do passo a que cada um pertence
// (usado no Painel de Novo Questionário, para a irmã escolher campos)
function getAllFields(tipo) {
  if (!tipo || !tipo.steps) return [];
  return tipo.steps.flatMap((step) =>
    (step.fields || []).map((f) => ({ ...f, stepTitle: step.title })),
  );
}

// Todos os tipos de evento arrancam vazios no Painel de Novo Questionário,
// sem excepções — nem o Casamento tem campos por defeito. A irmã
// escolhe sempre o que quer pelo campo de busca.
function getDefaultCampos(tipo) {
  return [];
}

// A partir do estado do painel, devolve a informação completa (label,
// tipo, validações...) de cada campo activo — partilhado entre o render
// e a validação ao criar o questionário
function getCamposActivosInfo(eventTypes, newInvite) {
  const tipo = eventTypes.find((et) => et.id === newInvite.eventTypeId);
  const todosOsCampos = getAllFields(tipo);
  return newInvite.camposAtivos
    .map((id) => todosOsCampos.find((f) => f.id === id))
    .filter(Boolean);
}

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
    eventTypeId: "",
    camposAtivos: [],
    valores: {},
    reservaId: null,
  });
  const [reservaContexto, setReservaContexto] = useState(null);
  const [newInviteErrors, setNewInviteErrors] = useState({});
  const [createdInvite, setCreatedInvite] = useState(null);
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [inviteToDelete, setInviteToDelete] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [loadingEventTypes, setLoadingEventTypes] = useState(true);
  const [reservas, setReservas] = useState([]);
  const navigate = useNavigate();

  // Abre o formulário para a irmã preencher ela própria —
  // compõe o objecto de questionário completo (com event_types) a partir
  // do que já está em memória, e navega para o formulário como
  // se fosse o casal/família a abri-lo
  const handlePreencherFormulario = (invite) => {
    const tipo = eventTypes.find((et) => et.id === invite.event_type_id);
    if (!tipo) {
      alert("Tipo de evento não encontrado. Tenta recarregar a página.");
      return;
    }
    const inviteCompleto = {
      ...invite,
      event_types: { nome: tipo.nome, steps: tipo.steps, icone: tipo.icone },
    };
    sessionStorage.setItem("dlm_invite", JSON.stringify(inviteCompleto));
    navigate("/formulario");
  };

  // Chamado pela Agenda quando a irmã clica "Tornar cliente" numa reserva.
  // Muda para a tab Questionários, abre o painel pré-preenchido e carimba
  // o convite com o id da reserva.
  //
  // O nome da cliente NÃO é pré-preenchido num campo (não sabemos para que
  // campo do modelo iria) — aparece só como referência na nota do topo.
  // A data é pré-preenchida SE o modelo tiver um campo do tipo "date":
  // procuramos esse campo pelo seu type e usamos o id REAL dele (os ids
  // são gerados a partir do label, ex: "Data do Evento" -> "dataDoEvento",
  // por isso não podem ser adivinhados).
  const handleCriarQuestionarioDeReserva = (reserva) => {
    const tipoId = reserva.event_type_id || eventTypes[0]?.id || "";
    const tipo = eventTypes.find((et) => et.id === tipoId);

    // procurar o primeiro campo de data no modelo escolhido
    const campoData = getAllFields(tipo).find((f) => f.type === "date");

    const valores = {};
    const camposAtivos = [];
    if (campoData && reserva.data_evento) {
      valores[campoData.id] = reserva.data_evento;
      camposAtivos.push(campoData.id); // sem isto, o campo não aparece no painel
    }

    setActiveTab("convites");
    setReservaContexto(reserva);
    setNewInvite({
      eventTypeId: tipoId,
      camposAtivos,
      valores,
      reservaId: reserva.id,
    });
    setShowNewInvite(true);
    setCreatedInvite(null);
  };

  useEffect(() => {
    if (!tourJaVista("admin")) {
      const temporizador = setTimeout(() => {
        iniciarTour("admin", ADMIN_TOUR_STEPS);
      }, 700);
      return () => clearTimeout(temporizador);
    }
  }, []);

  // Mini-tour do Painel de Novo Convite — só na 1ª vez que se abre
  useEffect(() => {
    if (showNewInvite && !tourJaVista("novoConvite")) {
      const temporizador = setTimeout(() => {
        iniciarTour(
          "novoConvite",
          NOVO_CONVITE_TOUR_STEPS(eventTypes.length > 1),
        );
      }, 400);
      return () => clearTimeout(temporizador);
    }
  }, [showNewInvite]);

  // Mini-tour da tab Tipos de Evento — só na 1ª vez que se entra lá
  useEffect(() => {
    if (activeTab === "tiposEvento" && !tourJaVista("tiposEvento")) {
      const temporizador = setTimeout(() => {
        iniciarTour("tiposEvento", TIPOS_EVENTO_TOUR_STEPS);
      }, 400);
      return () => clearTimeout(temporizador);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchSubmissions();
    fetchReservas();
    fetchInvites();
    fetchEventTypes();

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
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_types" },
        (payload) => {
          console.log("Novo tipo de evento:", payload);
          fetchEventTypes();
        },
      )
      .subscribe((status) => {
        console.log("Realtime status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEventTypes = async () => {
    setLoadingEventTypes(true);
    try {
      const types = await getEventTypes();
      setEventTypes(types);
      setNewInvite((prev) => {
        if (prev.eventTypeId) return prev; // já inicializado, não interferir
        const tipoDefault = types[0];
        return {
          ...prev,
          eventTypeId: tipoDefault?.id || "",
          camposAtivos: tipoDefault ? getDefaultCampos(tipoDefault) : [],
        };
      });
    } catch (e) {
      console.error("Erro ao ir buscar tipos de evento:", e);
    }
    setLoadingEventTypes(false);
  };

  const fetchReservas = async () => {
    try {
      const data = await getReservas();
      setReservas(data);
    } catch (e) {
      console.error("Erro ao ir buscar reservas:", e);
    }
  };

  // Quando a irmã muda o tipo de evento no painel, os campos activos
  // recomeçam do zero (os campos de um tipo não fazem sentido noutro)
  const handleChangeEventType = (novoId) => {
    const tipo = eventTypes.find((et) => et.id === novoId);
    setNewInvite((prev) => ({
      ...prev,
      eventTypeId: novoId,
      camposAtivos: getDefaultCampos(tipo),
      valores: {},
    }));
    setNewInviteErrors({});
  };

  const handleAddCampo = (fieldId) => {
    setNewInvite((prev) => ({
      ...prev,
      camposAtivos: [...prev.camposAtivos, fieldId],
    }));
  };

  const handleRemoveCampo = (fieldId) => {
    setNewInvite((prev) => {
      const valoresSemEste = { ...prev.valores };
      delete valoresSemEste[fieldId];
      return {
        ...prev,
        camposAtivos: prev.camposAtivos.filter((id) => id !== fieldId),
        valores: valoresSemEste,
      };
    });
    setNewInviteErrors((prev) => {
      const n = { ...prev };
      delete n[fieldId];
      return n;
    });
  };

  const handleChangeValorCampo = (fieldId, valor) => {
    setNewInvite((prev) => ({
      ...prev,
      valores: { ...prev.valores, [fieldId]: valor },
    }));
    setNewInviteErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const n = { ...prev };
      delete n[fieldId];
      return n;
    });
  };

  const handleCreateInvite = async () => {
    // Valida o FORMATO dos campos que ela preencheu (ex: email inválido,
    // data no passado) — mas nunca a obrigatoriedade, já que qualquer
    // campo pode estar ausente do painel
    const camposActivosInfo = getCamposActivosInfo(eventTypes, newInvite);
    const errors = {};
    camposActivosInfo.forEach((field) => {
      const valor = newInvite.valores[field.id];
      const erro = validateField({ ...field, required: false }, valor);
      if (erro) errors[field.id] = erro;
    });
    if (Object.keys(errors).length > 0) {
      setNewInviteErrors(errors);
      return;
    }

    // Usa o tipo de evento escolhido no formulário (com mais de um tipo,
    // a irmã escolhe; com só um, já vem pré-seleccionado)
    const eventTypeId = newInvite.eventTypeId;
    if (!eventTypeId) {
      console.error(
        "Nenhum tipo de evento disponível para associar ao convite.",
      );
      setNewInviteErrors({
        geral: "Não foi possível criar o convite. Tenta novamente.",
      });
      return;
    }

    setCreatingInvite(true);
    try {
      const invite = await createInvite({
        dataEvento: newInvite.valores.dataEvento || null,
        eventTypeId,
        respostas: newInvite.valores,
        reservaId: newInvite.reservaId || null,
      });
      setCreatedInvite(invite);
      setInvites((prev) => [invite, ...prev]);
      const tipoActual = eventTypes.find((et) => et.id === eventTypeId);
      setNewInvite({
        eventTypeId,
        camposAtivos: getDefaultCampos(tipoActual),
        valores: {},
        reservaId: null,
      });
      setReservaContexto(null);
      setShowNewInvite(false);
    } catch (e) {
      console.error(e);
    }
    setCreatingInvite(false);
  };

  const getShareMessage = (invite) => {
    const url = `${window.location.origin}/?codigo=${invite.code}`;
    const tipo = eventTypes.find((et) => et.id === invite.event_type_id);
    const emoji = tipo?.icone === "couple" ? "💍" : "✨";
    return `Olá ${getTituloConvite(invite, submissions, eventTypes)}! ${emoji}\n\nO vosso questionário *Do Luxo à Mesa* está pronto.\n\nÉ só clicar aqui para começar: ${url}\n\n(O vosso código de acesso é: *${invite.code}*)\n\nPlaneamos cada detalhe. Criamos memórias inesquecíveis. ✨`;
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
    if (!error) setSubmissions(data.map(normalizeSubmission));
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
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={() => iniciarTour("admin", ADMIN_TOUR_STEPS)}
              title="Ver tour outra vez"
              style={{
                fontSize: "11px",
                fontWeight: "600",
                padding: "8px 16px",
                borderRadius: "999px",
                border: "1.5px solid var(--gold-light)",
                color: "var(--gold)",
                backgroundColor: "white",
                cursor: "pointer",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                transition: "all 0.2s",
              }}
            >
              ❓ Tour
            </button>
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
        </div>

        {/* Tabs */}
        <div
          id="tour-admin-nav"
          style={{ maxWidth: "960px", margin: "0 auto", display: "flex" }}
        >
          {[
            { id: "clientes", label: "👥 Clientes" },
            { id: "convites", label: "📋 Questionários" },
            { id: "calendario", label: "📅 Agenda" },
            { id: "operacional", label: "📦 Logística" },
            { id: "tiposEvento", label: "🗂️ Modelos de Evento" },
            { id: "dashboard", label: "📊 Visão Geral" },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`tour-tab-${tab.id}`}
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
                      {(() => {
                        const resumo = getResumoSubmissao(s, eventTypes);
                        return (
                          <div>
                            <p
                              style={{
                                fontSize: "15px",
                                fontWeight: "500",
                                color: "var(--charcoal)",
                                margin: "0 0 4px 0",
                              }}
                            >
                              {resumo.titulo}
                            </p>
                            <p
                              style={{
                                fontSize: "13px",
                                color: "var(--gray-mid)",
                                margin: 0,
                              }}
                            >
                              {formatDate(resumo.data)} ·{" "}
                              {s.local_evento || "Local não definido"}
                            </p>
                          </div>
                        );
                      })()}
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
                          {getTituloConvite(
                            createdInvite,
                            submissions,
                            eventTypes,
                          )}
                        </p>
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: "6px",
                            fontSize: "11px",
                            fontWeight: "700",
                            padding: "3px 12px",
                            borderRadius: "999px",
                            backgroundColor: "var(--gold)",
                            color: "white",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {eventTypes.find(
                            (et) => et.id === createdInvite?.event_type_id,
                          )?.nome || "Tipo de evento"}
                        </span>
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

            {/* Botão novo Questionário */}
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
                + Novo Questionário
              </button>
            </div>

            {/* Formulário novo Questionário */}
            <style>{`
              .painel-convite-scroll::-webkit-scrollbar { width: 6px; }
              .painel-convite-scroll::-webkit-scrollbar-thumb {
                background-color: var(--gold-light);
                border-radius: 999px;
              }
              .painel-convite-scroll::-webkit-scrollbar-track { background: transparent; }
            `}</style>

            {showNewInvite &&
              (() => {
                const tipoActual = eventTypes.find(
                  (et) => et.id === newInvite.eventTypeId,
                );
                const todosOsCampos = getAllFields(tipoActual);
                const camposActivosInfo = getCamposActivosInfo(
                  eventTypes,
                  newInvite,
                );
                const camposDisponiveis = todosOsCampos.filter(
                  (f) => !newInvite.camposAtivos.includes(f.id),
                );

                return (
                  <div
                    style={{
                      backgroundColor: "white",
                      borderRadius: "16px",
                      boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
                      marginBottom: "20px",
                      border: "1px solid var(--gold-light)",
                      display: "flex",
                      flexDirection: "column",
                      maxHeight: "min(640px, 80vh)",
                    }}
                  >
                    {/* Corpo — ganha scroll próprio quando há muitos campos.
                        A barra de scroll é estilizada (mais fina, dourada)
                        para ficar claro que esta zona desliza */}
                    <div
                      className="painel-convite-scroll"
                      style={{
                        padding: "24px",
                        overflowY: "auto",
                        flex: 1,
                        scrollbarWidth: "thin",
                        scrollbarColor: "var(--gold-light) transparent",
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
                        Novo Questionário
                      </h3>

                      {reservaContexto && (
                        <div
                          style={{
                            backgroundColor: "#FBF7EF",
                            border: "1px solid var(--gold-light)",
                            borderRadius: "10px",
                            padding: "12px 14px",
                            marginBottom: "16px",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "10px",
                              color: "var(--gray-mid)",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              margin: "0 0 4px 0",
                            }}
                          >
                            A criar para a reserva de
                          </p>
                          <p
                            style={{
                              fontSize: "14px",
                              fontWeight: "600",
                              color: "var(--charcoal)",
                              margin: 0,
                            }}
                          >
                            {reservaContexto.nome_cliente}
                            {reservaContexto.contacto
                              ? ` · ${reservaContexto.contacto}`
                              : ""}
                          </p>
                        </div>
                      )}

                      {eventTypes.length > 1 && (
                        <div
                          id="tour-novo-convite-tipo"
                          style={{ marginBottom: "14px" }}
                        >
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
                            Tipo de Evento
                          </label>
                          <select
                            value={newInvite.eventTypeId}
                            onChange={(e) =>
                              handleChangeEventType(e.target.value)
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
                          >
                            {eventTypes.map((et) => (
                              <option key={et.id} value={et.id}>
                                {et.nome}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Campos escolhidos pela irmã para este convite —
                          variam por tipo de evento, e até de convite para
                          convite. Não há nenhum campo fixo: tudo o que
                          aparece aqui (incluindo a Data do Evento, quando
                          o tipo de evento a tiver definida) pode ser
                          removido. */}
                      {camposActivosInfo.length > 0 ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "16px",
                          }}
                        >
                          {camposActivosInfo.map((field) => (
                            <div
                              key={field.id}
                              style={{ position: "relative" }}
                            >
                              <p
                                style={{
                                  fontSize: "10px",
                                  color: "var(--gray-mid)",
                                  margin: "0 0 2px 0",
                                }}
                              >
                                {field.stepTitle}
                              </p>
                              <button
                                type="button"
                                onClick={() => handleRemoveCampo(field.id)}
                                title="Remover campo"
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  right: 0,
                                  fontSize: "11px",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: "var(--gray-mid)",
                                  padding: "2px 4px",
                                }}
                              >
                                ✕ remover
                              </button>
                              <FormField
                                field={{ ...field, required: false }}
                                value={newInvite.valores[field.id]}
                                onChange={(id, val) =>
                                  handleChangeValorCampo(id, val)
                                }
                                error={newInviteErrors[field.id]}
                                onClearError={(id) =>
                                  setNewInviteErrors((prev) => {
                                    const n = { ...prev };
                                    delete n[id];
                                    return n;
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p
                          style={{
                            fontSize: "12px",
                            color: "var(--gray-mid)",
                            margin: 0,
                          }}
                        >
                          Ainda não escolheste nenhum campo — usa a busca em
                          baixo para adicionar o que quiseres preencher já.
                        </p>
                      )}
                    </div>

                    {/* Rodapé — fica sempre visível, mesmo que o corpo
                        acima tenha scroll */}
                    <div
                      style={{
                        padding: "16px 24px",
                        borderTop: "1px solid var(--gold-light)",
                        backgroundColor: "#FBF7EF",
                        borderRadius: "0 0 16px 16px",
                        flexShrink: 0,
                      }}
                    >
                      <div
                        id="tour-campo-seletor"
                        style={{ marginBottom: "14px" }}
                      >
                        <CampoSeletor
                          camposDisponiveis={camposDisponiveis}
                          onAdd={handleAddCampo}
                        />
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
                          id="tour-criar-convite"
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
                  </div>
                );
              })()}

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
                          {getTituloConvite(invite, submissions, eventTypes)}
                        </p>
                        <span
                          style={{
                            display: "inline-block",
                            marginBottom: "6px",
                            fontSize: "10px",
                            fontWeight: "700",
                            padding: "2px 10px",
                            borderRadius: "999px",
                            backgroundColor: "#FEF9EC",
                            color: "var(--gold)",
                            border: "1px solid var(--gold-light)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {eventTypes.find(
                            (et) => et.id === invite.event_type_id,
                          )?.nome || "—"}
                        </span>
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
                          <>
                            <button
                              className="btn-compact"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePreencherFormulario(invite);
                              }}
                              title="Preencher o formulário"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "6px 12px",
                                borderRadius: "8px",
                                border: "1px solid var(--gold-light)",
                                backgroundColor: "#FEF9EC",
                                color: "var(--gold)",
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "500",
                                transition: "all 0.2s",
                                flexShrink: 0,
                                whiteSpace: "nowrap",
                              }}
                            >
                              ✏️ Preencher
                            </button>
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
                          </>
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
                        {getTituloConvite(
                          inviteToDelete,
                          submissions,
                          eventTypes,
                        )}
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
                          {getTituloConvite(
                            selectedInvite,
                            submissions,
                            eventTypes,
                          )}
                        </p>
                        <span
                          style={{
                            display: "inline-block",
                            marginBottom: "4px",
                            fontSize: "10px",
                            fontWeight: "700",
                            padding: "2px 10px",
                            borderRadius: "999px",
                            backgroundColor: "white",
                            color: "var(--gold)",
                            border: "1px solid var(--gold-light)",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {eventTypes.find(
                            (et) => et.id === selectedInvite?.event_type_id,
                          )?.nome || "—"}
                        </span>
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

                    {/* Mensagem — só faz sentido enquanto o convite ainda não foi preenchido */}
                    {selectedInvite.status !== "Preenchido" ? (
                      <>
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
                      </>
                    ) : (
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#166534",
                          backgroundColor: "white",
                          border: "1px solid #BBF7D0",
                          borderRadius: "10px",
                          padding: "14px 18px",
                          margin: 0,
                          lineHeight: "1.6",
                        }}
                      >
                        ✓ Este convite já foi preenchido. O link deixou de
                        funcionar, e já não há nada para partilhar.
                      </p>
                    )}
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

            {/* ===== ZONA 2.5 — Por tipo de evento ===== */}
            {(() => {
              // Cruza submissions com eventTypes para contar quantos eventos
              // existem por tipo — só mostra tipos com pelo menos 1 evento.
              // Tipos sem nenhum evento não aparecem (não polui o dashboard).
              const contagemPorTipo = eventTypes
                .map((et) => ({
                  id: et.id,
                  nome: et.nome,
                  total: submissions.filter((s) => s.event_type_id === et.id)
                    .length,
                }))
                .filter((et) => et.total > 0)
                .sort((a, b) => b.total - a.total);

              if (contagemPorTipo.length === 0) return null;

              const totalEventos = contagemPorTipo.reduce(
                (s, et) => s + et.total,
                0,
              );

              return (
                <div style={{ marginBottom: "20px" }}>
                  <p
                    style={{
                      fontSize: "10px",
                      fontWeight: "700",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      color: "var(--gray-mid)",
                      margin: "0 0 12px 0",
                    }}
                  >
                    Eventos por Tipo
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "10px",
                    }}
                  >
                    {contagemPorTipo.map((et, i) => {
                      const percentagem =
                        totalEventos > 0
                          ? Math.round((et.total / totalEventos) * 100)
                          : 0;
                      const isPrincipal = i < 4; // destaque para os 4 com mais eventos

                      return (
                        <div
                          key={et.id}
                          style={{
                            backgroundColor: "white",
                            borderRadius: "14px",
                            padding: "16px 18px",
                            boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                            border: isPrincipal
                              ? "1px solid var(--gold-light)"
                              : "1px solid #F0EDE8",
                          }}
                        >
                          <p
                            style={{
                              fontSize: "11px",
                              color: "var(--gray-mid)",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                              margin: "0 0 4px 0",
                              fontWeight: "500",
                            }}
                          >
                            {et.nome}
                          </p>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: "6px",
                              marginBottom: "10px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: isPrincipal ? "28px" : "22px",
                                fontWeight: "700",
                                fontFamily: "Playfair Display, serif",
                                color: "var(--gold)",
                                lineHeight: 1,
                              }}
                            >
                              {et.total}
                            </span>
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--gray-mid)",
                              }}
                            >
                              {et.total === 1 ? "evento" : "eventos"}
                            </span>
                          </div>
                          {/* Barra de proporção */}
                          <div
                            style={{
                              height: "4px",
                              borderRadius: "999px",
                              backgroundColor: "#F5ECD7",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${percentagem}%`,
                                backgroundColor: "var(--gold)",
                                borderRadius: "999px",
                                transition: "width 0.5s ease",
                              }}
                            />
                          </div>
                          <p
                            style={{
                              fontSize: "10px",
                              color: "var(--gold-light)",
                              margin: "4px 0 0 0",
                              textAlign: "right",
                            }}
                          >
                            {percentagem}% do total
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

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

        {/* ---- TAB TIPOS DE EVENTO ---- */}
        {activeTab === "calendario" && (
          <CalendarioTab
            submissions={submissions}
            eventTypes={eventTypes}
            reservas={reservas}
            onSelectSubmission={(s) => setSelected(s)}
            onReservasChange={fetchReservas}
            onCriarQuestionario={handleCriarQuestionarioDeReserva}
          />
        )}

        {activeTab === "tiposEvento" && (
          <EventTypesTab
            eventTypes={eventTypes}
            loading={loadingEventTypes}
            onRefetch={fetchEventTypes}
          />
        )}
        {activeTab === "operacional" && (
          <OperacionalTab submissions={submissions} />
        )}
      </div>

      <SubmissionDrawer
        selected={selected}
        eventTypes={eventTypes}
        onClose={() => setSelected(null)}
        onStatusChange={handleStatusChange}
        onSaved={(atualizada) => {
          setSubmissions((prev) =>
            prev.map((s) => (s.id === atualizada.id ? atualizada : s)),
          );
          setSelected(atualizada);
        }}
      />

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
                Partilhar com{" "}
                {getTituloConvite(shareTarget, submissions, eventTypes)}
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
