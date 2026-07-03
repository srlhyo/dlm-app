import { supabase } from "./supabase";

// =====================================================================
// Fase C — Gestão de Stock + Alertas
//
// Este módulo tem duas partes:
//   1. CRUD simples: ler/escrever o stock dos materiais e a config.
//   2. Lógica pura de disponibilidade: dado um material e uma janela de
//      datas, quantas unidades estão livres? É o coração da Fase C.
//
// Princípio-chave: o "disponível" NUNCA é guardado. Guardamos só o total
// (materiais.quantidade_total); o disponível é sempre calculado na hora,
// porque depende SEMPRE de que datas estamos a perguntar.
// =====================================================================

// ---------------------------------------------------------------------
// 1. Config (app_config) — buffer de ocupação
// ---------------------------------------------------------------------

// Lê toda a config como um objecto { chave: valor }
export const getAppConfig = async () => {
  const { data, error } = await supabase.from("app_config").select("*");
  if (error) {
    console.error("Erro ao ir buscar config:", error);
    return {};
  }
  return (data || []).reduce((acc, linha) => {
    acc[linha.chave] = linha.valor;
    return acc;
  }, {});
};

// Escreve um valor de config (upsert pela chave)
export const updateAppConfig = async (chave, valor) => {
  const { data, error } = await supabase
    .from("app_config")
    .update({ valor: String(valor), updated_at: new Date().toISOString() })
    .eq("chave", chave)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Devolve o buffer de ocupação já convertido em números: { antes, depois }.
// Aceita a config já carregada (para não ir à BD duas vezes), ou vai
// buscá-la se não lhe passarem nada. Cai para 2/2 se faltar algum valor.
export const getBuffer = async (config = null) => {
  const cfg = config || (await getAppConfig());
  const antes = Number.parseInt(cfg.buffer_dias_antes, 10);
  const depois = Number.parseInt(cfg.buffer_dias_depois, 10);
  return {
    antes: Number.isFinite(antes) ? antes : 2,
    depois: Number.isFinite(depois) ? depois : 2,
  };
};

// ---------------------------------------------------------------------
// 2. Stock dos materiais
// ---------------------------------------------------------------------

// Escreve a quantidade total em stock de um material
export const updateStock = async (materialId, quantidade) => {
  const qtd = Math.max(0, Math.round(Number(quantidade) || 0));
  const { data, error } = await supabase
    .from("materiais")
    .update({ quantidade_total: qtd })
    .eq("id", materialId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// ---------------------------------------------------------------------
// 3. Lógica pura de datas e sobreposição
// ---------------------------------------------------------------------

// Normaliza qualquer entrada de data para meia-noite UTC, para que as
// comparações sejam feitas por DIA e não por instante (uma toalha ocupada
// "no dia 12" está ocupada o dia inteiro, não só a partir da hora X).
const aoDia = (data) => {
  if (!data) return null;
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
};

// Soma (ou subtrai) dias a uma data, ao nível do dia
const somaDias = (data, dias) => {
  const d = aoDia(data);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
};

// A janela de ocupação de um evento: o dia do evento, alargado pelo buffer
// (montagem antes, higienização/devolução depois). Devolve { inicio, fim }
// como Datas ao dia, ou null se a data do evento for inválida.
export const janelaDoEvento = (dataEvento, buffer) => {
  const ancora = aoDia(dataEvento);
  if (!ancora) return null;
  return {
    inicio: somaDias(ancora, -buffer.antes),
    fim: somaDias(ancora, buffer.depois),
  };
};

// Regra standard de sobreposição de dois intervalos [inicioA, fimA] e
// [inicioB, fimB]: cruzam-se sse inicioA <= fimB E inicioB <= fimA.
// Inclusiva nos limites (se um acaba no dia em que o outro começa,
// consideramos que ainda se tocam — o material não teve tempo de rodar).
export const intervalosSobrepoem = (a, b) => {
  if (!a || !b || !a.inicio || !a.fim || !b.inicio || !b.fim) return false;
  return a.inicio <= b.fim && b.inicio <= a.fim;
};

// ---------------------------------------------------------------------
// 4. Cálculo de disponibilidade — o coração da Fase C
// ---------------------------------------------------------------------

// Para um material, numa janela de datas, calcula quanto está livre.
//
// É uma função PURA: recebe todos os dados já carregados e não faz
// nenhuma query. Isto torna-a trivial de testar e evita ir à BD uma vez
// por material quando estamos a calcular vários de uma vez.
//
// Parâmetros:
//   materialId       — id do material a analisar
//   quantidadeTotal  — quantas unidades a Nádia possui (materiais.quantidade_total)
//   janela           — { inicio, fim } (Datas) — o período que nos interessa.
//                      Para um evento específico, é a janelaDoEvento dele.
//                      Para a vista semanal, são os 7 dias dessa semana.
//   submissions      — lista de submissões (cada uma com id e data_evento)
//   buffer           — { antes, depois }, para alargar a janela de cada evento
//   materiaisPorEvento — Map/objecto: submission_id -> [{ material_id, quantidade }]
//                        (as fichas operacionais, agrupadas por evento)
//   ignorarSubmissionId — opcional: um evento a excluir da conta (útil
//                        quando calculamos a disponibilidade PARA esse
//                        evento, para não o contar contra si próprio)
//
// Devolve:
//   { total, ocupado, disponivel, eventosEmConflito: [{ submissionId, dataEvento, quantidade }] }
//
// NOTA sobre reservas provisórias (decisão b2): NÃO entram neste cálculo.
// Uma reserva provisória tem data mas não tem materiais associados, por
// isso subtraí-la seria inventar números. As reservas tratam-se ao nível
// do AVISO (na UI), não do número. Esta função só conta eventos com ficha.
export const calcularDisponibilidade = ({
  materialId,
  quantidadeTotal,
  janela,
  submissions,
  buffer,
  materiaisPorEvento,
  ignorarSubmissionId = null,
}) => {
  const total = Math.max(0, Number(quantidadeTotal) || 0);

  // Acesso uniforme ao mapa de materiais por evento (aceita Map ou objecto)
  const materiaisDe = (submissionId) => {
    if (!materiaisPorEvento) return [];
    if (materiaisPorEvento instanceof Map) {
      return materiaisPorEvento.get(submissionId) || [];
    }
    return materiaisPorEvento[submissionId] || [];
  };

  const eventosEmConflito = [];
  let ocupado = 0;

  (submissions || []).forEach((s) => {
    if (!s || !s.data_evento) return;
    if (ignorarSubmissionId && s.id === ignorarSubmissionId) return;

    // Este evento sobrepõe-se à janela que nos interessa?
    const janelaEvento = janelaDoEvento(s.data_evento, buffer);
    if (!intervalosSobrepoem(janela, janelaEvento)) return;

    // Quanto deste material é que o evento usa?
    const linha = materiaisDe(s.id).find((m) => m.material_id === materialId);
    const qtd = linha ? Math.max(0, Number(linha.quantidade) || 0) : 0;
    if (qtd <= 0) return;

    ocupado += qtd;
    eventosEmConflito.push({
      submissionId: s.id,
      dataEvento: s.data_evento,
      quantidade: qtd,
    });
  });

  return {
    total,
    ocupado,
    disponivel: total - ocupado,
    eventosEmConflito,
  };
};
