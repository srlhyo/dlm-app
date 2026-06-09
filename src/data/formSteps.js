export const formSteps = [
  {
    id: 1,
    title: "Dados Principais",
    subtitle: "Informações base sobre os noivos e o evento",
    icon: "👰",
    fields: [
      { id: "nomeNoivo", label: "Nome do Noivo", type: "text", required: true, icon: "👤", placeholder: "Ex: João Silva", errorMsg: "Indica o nome do noivo para personalizarmos o vosso questionário" },
      { id: "nomeNoiva", label: "Nome da Noiva", type: "text", required: true, icon: "👤", placeholder: "Ex: Maria Santos", errorMsg: "Indica o nome da noiva para personalizarmos o vosso questionário" },
      { id: "contactoPrincipal", label: "Contacto Principal", type: "tel", required: true, icon: "📞", placeholder: "Ex: 912 345 678", validate: "phone", errorMsg: "Introduz um número de telefone português válido (ex: 912 345 678)" },
      { id: "email", label: "E-mail", type: "email", required: true, icon: "✉️", placeholder: "Ex: joao.maria@email.com", validate: "email", errorMsg: "Introduz um endereço de email válido para podermos entrar em contacto" },
      { id: "morada", label: "Morada", type: "text", required: true, icon: "📍", placeholder: "Ex: Rua das Flores, 123, 4000-123 Porto", errorMsg: "Indica a vossa morada" },
      { id: "dataEvento", label: "Data do Evento", type: "date", required: true, icon: "📅", validate: "futureDate", errorMsg: "A data do evento não pode ser no passado" },
      { id: "localEvento", label: "Local do Evento", type: "text", required: true, icon: "🏛️", placeholder: "Ex: Quinta das Lágrimas, Coimbra", errorMsg: "Indica o local onde vai decorrer o evento" },
      { id: "numeroConvidados", label: "Nº Final de Convidados", type: "number", required: true, icon: "👥", placeholder: "Ex: 120", validate: "positive", errorMsg: "Indica o número aproximado de convidados" },
      { id: "horaInicio", label: "Hora de Início", type: "time", required: true, icon: "🕐", tooltip: "Hora a que os convidados chegam ao evento", errorMsg: "Indica a hora de início do evento" },
      { id: "horaTermino", label: "Hora de Término", type: "time", required: true, icon: "🕐", tooltip: "Hora prevista para o final do evento", errorMsg: "Indica a hora de término do evento" },
      { id: "horaMontagem", label: "Hora disponível para montagem", type: "time", required: true, icon: "🔧", tooltip: "Hora a partir da qual a nossa equipa pode entrar no espaço para montar a decoração", errorMsg: "Indica a hora a partir da qual o espaço está disponível para montagem" },
      { id: "horaLimiteMontagem", label: "Hora limite para conclusão da montagem", type: "time", required: true, icon: "⏰", tooltip: "Tudo deve estar pronto antes desta hora — normalmente antes da entrada dos convidados", errorMsg: "Indica a hora limite para concluir a montagem" },
      { id: "horaRecolha", label: "Hora prevista para recolha", type: "time", required: true, icon: "🚚", tooltip: "Hora prevista para a nossa equipa recolher todo o material decorativo", errorMsg: "Indica a hora prevista para recolha do material" },
      { id: "recolhaDiaSeguinte", label: "Existe possibilidade de recolha no dia seguinte?", type: "radio", required: true, options: ["Sim", "Não"], errorMsg: "Indica se é possível recolher o material no dia seguinte" },
    ]
  },
  {
    id: 2,
    title: "Contacto e Estilo",
    subtitle: "Quem contactar no dia e a visão estética do evento",
    icon: "✨",
    fields: [
      { id: "nomeResponsavel", label: "Nome do Responsável no Dia", type: "text", required: true, icon: "👤", placeholder: "Ex: Ana Silva", errorMsg: "Indica o nome da pessoa responsável no dia do evento" },
      { id: "contactoResponsavel", label: "Contacto Telefónico", type: "tel", required: true, icon: "📞", placeholder: "Ex: 912 345 678", validate: "phone", errorMsg: "Introduz um número de telefone português válido (ex: 912 345 678)" },
      { id: "relacaoResponsavel", label: "Relação com os Noivos", type: "text", required: true, icon: "💬", placeholder: "Ex: Mãe da noiva, Wedding planner", errorMsg: "Indica a relação do responsável com os noivos" },
      { id: "estiloEvento", label: "Estilo Pretendido", type: "checkbox", required: true, options: ["Clássico", "Elegante", "Romântico", "Moderno", "Luxo Editorial", "Minimalista", "Outro"], errorMsg: "Escolhe pelo menos um estilo para o vosso evento" },
      { id: "estiloOutro", label: "Se outro, especificar", type: "text", required: false, placeholder: "Descreve o estilo pretendido" },
      { id: "paletaCores", label: "Paleta de Cores", type: "checkbox", required: true, options: ["Branco", "Creme", "Bege", "Dourado", "Champanhe", "Rosa", "Azul", "Verde", "Preto", "Outra"], errorMsg: "Escolhe pelo menos uma cor para a paleta do evento" },
      { id: "paletaObservacoes", label: "Tons exactos / observações da paleta", type: "textarea", required: false, placeholder: "Ex: Rosa blush suave, dourado mate, verde sage..." },
    ]
  },
  {
    id: 3,
    title: "Detalhes Decorativos",
    subtitle: "Mesa dos noivos e cenário de palco",
    icon: "🌸",
    fields: [
      { id: "mesaNoivos", label: "Mesa dos Noivos", type: "checkbox", required: true, options: ["Mesa simples", "Mesa com destaque floral", "Mesa com velas", "Toalha / tecido especial", "Letras / identificação", "Outro"], errorMsg: "Selecciona pelo menos uma opção para a mesa dos noivos" },
      { id: "cartoesPratos", label: "Querem cartões personalizados nos pratos?", type: "radio", required: true, options: ["Sim", "Não", "Talvez"], errorMsg: "Indica se pretendem cartões personalizados nos pratos" },
      { id: "observacoesCartoes", label: "Observações dos cartões", type: "textarea", required: false, placeholder: "Ex: Com o nome dos convidados em caligrafia dourada..." },
      { id: "descricaoMesaNoivos", label: "Descrição pretendida para a mesa dos noivos", type: "textarea", required: true, placeholder: "Descreve como imaginam a mesa dos noivos — cores, flores, altura, estilo...", errorMsg: "Descreve como imaginam a mesa dos noivos" },
      { id: "cenarioPalco", label: "Cenário de Palco", type: "checkbox", required: true, options: ["Painel branco / claro", "Cortina / tecido", "Arranjos florais", "Estrutura arqueada", "Luzes decorativas", "Tapete / alcatifa"], errorMsg: "Selecciona pelo menos uma opção para o cenário de palco" },
      { id: "descricaoCenario", label: "Descrição do cenário de palco", type: "textarea", required: true, placeholder: "Descreve a visão para o cenário — arco floral, painel de flores, cortinas...", errorMsg: "Descreve como imaginam o cenário de palco" },
      { id: "medidasEspaco", label: "Medidas / limitações do espaço", type: "textarea", required: true, placeholder: "Ex: Palco com 4m de largura e 3m de altura, tecto baixo à entrada...", errorMsg: "Indica as medidas ou limitações do espaço" },
    ]
  },
  {
    id: 4,
    title: "Convidados e Placa",
    subtitle: "Mesas dos convidados e placa de boas-vindas",
    icon: "🥂",
    fields: [
      { id: "centrosMesa", label: "Centros de Mesa", type: "checkbox", required: true, options: ["Centros de mesa baixos", "Centros de mesa altos", "Mistura de alturas"], errorMsg: "Selecciona o tipo de centros de mesa pretendido" },
      { id: "tipoFlores", label: "Tipo de Flores", type: "checkbox", required: true, options: ["Flores naturais", "Flores artificiais premium", "Velas"], errorMsg: "Selecciona o tipo de flores ou decoração para as mesas" },
      { id: "numeroMesas", label: "Número de Mesas", type: "number", required: true, icon: "🪑", placeholder: "Ex: 12", validate: "positive", errorMsg: "Indica o número de mesas de convidados" },
      { id: "formatoMesas", label: "Formato das Mesas", type: "text", required: true, icon: "⬡", placeholder: "Ex: Redondas, rectangulares, mistas", errorMsg: "Indica o formato das mesas" },
      { id: "lugaresporMesa", label: "Nº de Lugares por Mesa", type: "number", required: true, icon: "👤", placeholder: "Ex: 10", validate: "positive", errorMsg: "Indica o número de lugares por mesa" },
      { id: "observacoesMesas", label: "Observações sobre as mesas dos convidados", type: "textarea", required: false, placeholder: "Ex: Mesa de honra com 20 lugares, mesa dos noivos separada..." },
      { id: "textoPrincipalPlaca", label: "Texto Principal da Placa de Boas-Vindas", type: "text", required: true, icon: "✍️", placeholder: "Ex: Bem-vindos ao nosso casamento", errorMsg: "Indica o texto principal da placa de boas-vindas" },
      { id: "textoSecundarioPlaca", label: "Texto Secundário / Data / Nomes", type: "text", required: false, icon: "✍️", placeholder: "Ex: João & Maria · 15 de Junho de 2025" },
      { id: "estiloPlaca", label: "Estilo da Placa", type: "checkbox", required: true, options: ["Com moldura", "Sem moldura", "Com cavalete", "Outro"], errorMsg: "Selecciona o estilo pretendido para a placa" },
      { id: "notasPlaca", label: "Notas sobre estilo da placa", type: "textarea", required: false, placeholder: "Ex: Letra script dourada, fundo espelho, moldura vintage..." },
    ]
  },
  {
    id: 5,
    title: "Logística e Observações",
    subtitle: "Detalhes de acesso e notas finais",
    icon: "📋",
    fields: [
      { id: "moradaExacta", label: "Morada exacta do local", type: "textarea", required: true, placeholder: "Ex: Quinta das Rosas, Estrada Nacional 1, km 234, 2400-000 Leiria", errorMsg: "Indica a morada exacta do local do evento" },
      { id: "pessoaAbreEspaco", label: "Pessoa que abre o espaço", type: "text", required: true, icon: "👤", placeholder: "Ex: Carlos Ferreira (gerente da quinta)", errorMsg: "Indica o nome da pessoa que vai abrir o espaço" },
      { id: "contactoPessoaAbre", label: "Contacto", type: "tel", required: true, icon: "📞", placeholder: "Ex: 912 345 678", validate: "phone", errorMsg: "Introduz um número de telefone português válido (ex: 912 345 678)" },
      { id: "acessoLocal", label: "Acesso para cargas/descargas", type: "checkbox", required: true, options: ["Elevador disponível", "Escadas", "Estacionamento próximo"], errorMsg: "Indica as condições de acesso ao local" },
      { id: "notasAcesso", label: "Notas importantes de acesso, horários ou restrições", type: "textarea", required: false, placeholder: "Ex: Entrada pela porta lateral, portão fecha às 22h, proibido estacionar na rua..." },
      { id: "observacoesGerais", label: "Observações Gerais", type: "textarea", required: false, placeholder: "Qualquer outra informação que consideres importante partilhar connosco..." },
    ]
  }
]