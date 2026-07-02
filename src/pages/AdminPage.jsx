import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { createInvite, getEventTypes } from "../lib/invites";
import { validateField } from "../lib/validation";
import { normalizeSubmission, getValorAtual } from "../lib/submissionFields";
import EventTypesTab from "../components/admin/EventTypesTab";
import CampoSeletor from "../components/admin/CampoSeletor";
import SubmissionDrawer from "../components/admin/SubmissionDrawer";
import DashboardTab from "../components/admin/DashboardTab";
import ClientesTab from "../components/admin/ClientesTab";
import ShareSheet from "../components/admin/ShareSheet";
import CalendarioTab from "../components/admin/CalendarioTab";
import OperacionalTab from "../components/admin/OperacionalTab";
import InviteCreatedModal from "../components/admin/InviteCreatedModal";
import { getReservas } from "../lib/reservas";
import FormField from "../components/form/FormField";
import { iniciarTour, tourJaVista } from "../lib/tour";
import { motion, AnimatePresence } from "framer-motion";

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

export default function AdminPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
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
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [shareTarget, setShareTarget] = useState(null);
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
          <ClientesTab
            submissions={submissions}
            loading={loading}
            eventTypes={eventTypes}
            onSelectSubmission={(s) => setSelected(s)}
          />
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
            <InviteCreatedModal
              invite={createdInvite}
              eventTypes={eventTypes}
              onClose={() => setCreatedInvite(null)}
              onShare={() => setShareTarget(createdInvite)}
              getShareMessage={getShareMessage}
              getTitulo={(invite) =>
                getTituloConvite(invite, submissions, eventTypes)
              }
            />

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
          <DashboardTab
            submissions={submissions}
            invites={invites}
            eventTypes={eventTypes}
            onSelectSubmission={(s) => setSelected(s)}
          />
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
      <ShareSheet
        shareTarget={shareTarget}
        onClose={() => setShareTarget(null)}
        getShareMessage={getShareMessage}
        getTitulo={(invite) =>
          getTituloConvite(invite, submissions, eventTypes)
        }
      />
    </div>
  );
}
