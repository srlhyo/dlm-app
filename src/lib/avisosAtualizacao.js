// ============================================================
// avisosAtualizacao.js — o registo de actualizações importantes que a
// Nádia TEM de reconhecer antes de poder usar uma página. Nasceu em
// "Modelos de Evento" mas é para reutilizar em qualquer página nova
// que ganhe uma actualização que valha a pena explicar — ver
// AvisosBloqueantes.jsx, que só precisa de um `pagina={...}` para
// filtrar quais mostrar.
//
// Diferença face a uma tour (ver tour.js): uma tour só SUGERE e nunca
// mais volta sozinha. Isto BLOQUEIA a página até cada aviso ser
// explicitamente reconhecido — uma acção clara, não só "ter visto passar".
//
// Cada aviso é AUTO-SUFICIENTE (ícone + destinos incluídos), para que
// acrescentar uma actualização nova nunca exija tocar no código do
// componente — só neste ficheiro. `icon` e `destinos[].icon` são
// strings resolvidas pelo mapa ICONES em AvisosBloqueantes.jsx.
//
// Para acrescentar uma actualização nova: um objecto novo na lista,
// com um id novo e único (e a `pagina` certa). Um id já reconhecido
// nunca mais bloqueia; um id novo bloqueia mesmo que os anteriores já
// tenham sido todos vistos — a lista só cresce, nunca se reinicia.
// ============================================================

const CHAVE = (id) => `dlm_aviso_lido_${id}`;

export const avisoReconhecido = (id) => {
  try {
    return localStorage.getItem(CHAVE(id)) === "sim";
  } catch {
    return false;
  }
};

export const marcarAvisoReconhecido = (id) => {
  try {
    localStorage.setItem(CHAVE(id), "sim");
  } catch {
    /* storage indisponível — o aviso volta a aparecer na próxima vez, sem consequências graves */
  }
};

export const AVISOS = [
  {
    id: "papel-data-evento-v1",
    pagina: "modelos-evento",
    icon: "calendario",
    titulo: "A data do evento agora liga-se sozinha",
    resumo:
      "Marca o papel «Data do evento» num campo de data do modelo. Essa data passa a alimentar o Dashboard e o Funil automaticamente — sem copiares nada à mão, sem esquecimentos.",
    destinos: [
      { icon: "dashboard", nome: "Dashboard", sub: "métricas pela data certa" },
      { icon: "funil", nome: "Funil", sub: "cada lead no tempo certo" },
    ],
  },
  {
    id: "tipo-morada-evento-v1",
    pagina: "modelos-evento",
    icon: "pin",
    titulo: "A morada do evento agora liga-se sozinha",
    resumo:
      "Usa o tipo «Morada / Endereço» num campo do modelo. Essa morada passa a preencher o Cálculo de Deslocação do Orçamento e o Contrato automaticamente — a mesma morada, escrita uma vez só.",
    destinos: [
      { icon: "deslocacao", nome: "Cálculo de Deslocação", sub: "pronta a calcular a distância" },
      { icon: "contrato", nome: "Contrato", sub: "endereço completo do espaço" },
    ],
  },
  {
    id: "papel-estilo-evento-v1",
    pagina: "modelos-evento",
    icon: "etiqueta",
    titulo: "O estilo do evento agora liga-se sozinho",
    resumo:
      "Marca o papel «Estilo do evento» num campo de escolha única ou múltipla do modelo. Essas respostas passam a alimentar o gráfico «Estilos Mais Pedidos» no Dashboard automaticamente.",
    destinos: [
      { icon: "dashboard", nome: "Dashboard", sub: "gráfico de estilos mais pedidos" },
    ],
  },
];

// Só os avisos desta página, ainda por reconhecer — a mesma lista serve
// para decidir se a barra aparece E o que o assistente mostra.
export const listarAvisosPendentes = (pagina) =>
  AVISOS.filter((a) => a.pagina === pagina && !avisoReconhecido(a.id));
