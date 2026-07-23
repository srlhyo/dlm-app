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
  {
    id: "consulta-rapida-deslocacao-v1",
    pagina: "inicio",
    icon: "deslocacao",
    titulo: "Nova ferramenta: consulta rápida de deslocação",
    resumo:
      "Ao telefone com um cliente, já não precisas de abrir o orçamento para saberes o custo da deslocação. A pílula «Deslocação», ao lado da pesquisa, abre uma consulta instantânea — escreves a morada, lês o valor em voz alta, e não guarda nada.",
    destinos: [
      {
        icon: "deslocacao",
        nome: "Consulta Rápida",
        sub: "uma consulta instantânea, sem abrir o orçamento",
      },
    ],
  },
  {
    id: "remover-evento-cliente-v1",
    pagina: "clientes",
    icon: "lixo",
    titulo: "Agora dá para remover um evento criado por engano",
    resumo:
      "Na ficha de um cliente, passa o rato por cima de um evento — o ícone do lixo acende a vermelho. Um clique pede confirmação (e avisa se esse evento já tiver documentos ou convites ligados) antes de apagar de vez.",
    destinos: [
      {
        icon: "lixo",
        nome: "Eventos do Cliente",
        sub: "remoção com confirmação, direto na lista",
      },
    ],
  },
  {
    id: "editar-data-evento-dois-caminhos-v1",
    pagina: "clientes",
    icon: "calendario",
    titulo: "A data do evento tem dois sítios onde a corrigir",
    resumo:
      "Abre a ficha de qualquer evento (mesmo de um cliente antigo importado, sem modelo com campo de data): a data por baixo do nome, no cabeçalho, é SEMPRE editável com um clique. Se o modelo desse evento tiver o seu próprio campo de data — o que veio do formulário de onboarding preenchido pelo cliente — corrige-o em «Editar». Os dois caminhos funcionam, para qualquer evento, de qualquer cliente.",
    destinos: [
      {
        icon: "calendario",
        nome: "Cabeçalho da Ficha",
        sub: "sempre disponível, mesmo sem modelo",
      },
      {
        icon: "lapis",
        nome: "Editar → campo do modelo",
        sub: "a data que veio do formulário público",
      },
    ],
  },
  {
    id: "calculo-deslocacao-orcamento-v1",
    pagina: "orcamento",
    icon: "deslocacao",
    // Um aviso "em destaque" — a funcionalidade mais importante desta
    // leva merece mais do que uma linha a desbloquear: merece mostrar-se
    // a funcionar. `vantagens` e `demoCalculo` são só usados por este
    // (ver ConteudoAviso em AvisosBloqueantes.jsx) — opcionais para
    // avisos normais.
    titulo: "Cálculo de Deslocação: a funcionalidade que muda o jogo",
    resumo:
      "Até agora, calcular a deslocação de um evento significava saberes a distância de cor, ires à calculadora, e escreveres o valor à mão na linha do orçamento — com espaço para erro em cada passo. Isso acabou.",
    vantagens: [
      "Não precisas de saber a distância — escreve só a morada e a ferramenta calcula-a sozinha.",
      "Não fazes contas — a fórmula (5 km grátis, o resto a 1€ ou 2€/km consoante os troços) aplica-se sozinha.",
      "O valor entra sozinho na linha do orçamento — sem copiar, sem escrever, sem esquecer.",
      "Cobre montagem véspera (4 troços) e ida-e-volta no mesmo dia (2 troços), sem cálculo à parte.",
      "Podes oferecer a deslocação com um interruptor — o valor original fica visível, riscado, para se saber que foi uma oferta.",
      "Se a morada já estiver no modelo do evento, chega pré-preenchida — nem escreves nada.",
    ],
    // O mesmo exemplo que já tinhas visto a funcionar: 30,8 km, 4 troços.
    demoCalculo: {
      distanciaKm: 30.8,
      kmIncluidos: 5,
      kmForaDoRaio: 25.8,
      euroPorKm: 2,
      custo: "51,60",
    },
    destinos: [
      {
        icon: "deslocacao",
        nome: "Valor da Linha",
        sub: "preenchido sozinho, sem escrever nada",
      },
    ],
  },
];

// Só os avisos desta página, ainda por reconhecer — a mesma lista serve
// para decidir se a barra aparece E o que o assistente mostra.
export const listarAvisosPendentes = (pagina) =>
  AVISOS.filter((a) => a.pagina === pagina && !avisoReconhecido(a.id));
