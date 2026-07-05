// ============================================================
// Configuração do módulo de orçamentos/contratos.
// Dados fixos da empresa (confirmados) e catálogo de serviços
// recorrentes. Editável aqui num sítio só.
// ============================================================

// Dados fixos da 2.ª contraente (Do Luxo à Mesa) — aparecem nos contratos.
export const EMPRESA = {
  nome: "Nádia Schultz",
  morada: "Rua dos Moinhos nº 31 - Ericeira",
  nif: "243705689",
  iban: "PT50 0193 0000 1050 1570 8076 8",
  designacao: "Do Luxo à Mesa",
  foro: "comarca de Sintra",
};

// Condições fixas que aparecem no rodapé do orçamento.
export const CONDICOES_ORCAMENTO = [
  "Reserva mediante confirmação",
  "Valor sujeito a ajuste conforme número final de convidados",
  "Alterações poderão implicar revisão",
];

export const NOTA_RODAPE_ORCAMENTO =
  "Toda a loiça reutilizável e restante material disponibilizado para a mesa posta deverá ser entregue recolhido sem resíduos alimentares no final do evento, sendo a higienização realizada posteriormente pela Do Luxo à Mesa.";

export const VALIDADE_ORCAMENTO_DIAS = 30;

// ------------------------------------------------------------
// Catálogo de serviços recorrentes. A Nádia escolhe um, ajusta o
// valor/quantidade, e o texto do "Inclui:" vem predefinido (pode editar).
// Há sempre a opção de linha livre para casos especiais.
// ------------------------------------------------------------
export const CATALOGO_SERVICOS = [
  {
    id: "decoracao_mesas",
    // {N} é substituído pelo nº de lugares
    descricaoTemplate: "Decoração de Mesas — {N} Lugares Completos",
    temLugares: true,
    inclui: [
      "Mesa posta completa",
      "Mobiliário incluído",
      "Centros de mesa decorativos",
      "Castiçais e velas decorativas",
    ],
    valorSugerido: null,
  },
  {
    id: "espaco_fotografavel",
    descricaoTemplate: "Espaço Fotografável dos Noivos",
    temLugares: false,
    inclui: [
      "Paineis decorativos",
      "Arranjos florais artificiais de aspeto natural",
      "Elementos decorativos complementares",
      "Montagem e desmontagem",
    ],
    valorSugerido: null,
  },
  {
    id: "deslocacao",
    descricaoTemplate: "Deslocação",
    temLugares: false,
    inclui: [],
    valorSugerido: null,
  },
  {
    id: "livre",
    descricaoTemplate: "",
    temLugares: false,
    inclui: [],
    valorSugerido: null,
    ehLivre: true,
  },
];

// Formata um valor numérico como euros (ex: 650 → "650€", 36.8 → "36,80€")
export const formatarEuros = (v) => {
  const n = Number(v) || 0;
  if (Number.isInteger(n)) return `${n}€`;
  return `${n.toFixed(2).replace(".", ",")}€`;
};

// Formata data ISO (yyyy-mm-dd) para dd/mm/yyyy
export const formatarDataPT = (iso) => {
  if (!iso) return "";
  const [a, m, d] = iso.split("-");
  if (!a || !m || !d) return iso;
  return `${d}/${m}/${a}`;
};
