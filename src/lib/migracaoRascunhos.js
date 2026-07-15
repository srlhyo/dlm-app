import { obterDocumentoDoEvento, criarDocumento } from "./documentos";

// ============================================================
// migrarRascunhosLocais — a ponte entre o mundo antigo e o novo.
//
// Antes da Biblioteca (migração 021), os geradores guardavam cada
// campo numa chave própria do localStorage (useRascunho):
//   dlm_rascunho_<tipo>:<submissionId|manual>:<campo>   (27 campos)
// e, numa versão transitória, o manual num objeto único:
//   dlm_rascunho_<tipo>:manual:dados
//
// Esta função corre UMA vez por load (chamada no arranque do
// AdminPage): varre as chaves antigas, agrupa por documento e:
//   • se a BD JÁ tem o documento desse tipo+evento → a BD ganha
//     (nunca sobrepõe trabalho feito no sistema novo); limpa chaves.
//   • se não tem e o rascunho TEM conteúdo real → cria a linha na
//     BD e SÓ DEPOIS remove as chaves (nada se apaga antes de estar
//     seguro do outro lado).
//   • rascunhos vazios (aberturas sem edição, defaults) → só limpeza.
//   • erros (rede, evento entretanto apagado) → as chaves ficam e
//     tenta-se de novo no próximo load. Self-healing, idempotente.
//
// Quando o localStorage esvaziar, cada corrida é um varrimento de
// zero chaves — custo nulo. A chamada pode reformar-se uns tempos
// depois da estreia, quando todos os browsers tiverem migrado.
//
// Nota multi-dispositivo: a migração corre em cada browser. Nos
// documentos DE EVENTO, o primeiro dispositivo a abrir "ganha" (os
// restantes veem a linha existente e limpam-se). Nos manuais não há
// como comparar — importam de todos os dispositivos (duplicados
// possíveis; apagam-se na biblioteca).
// ============================================================

const PREFIXO = "dlm_rascunho_";

// Os 27 campos do mundo antigo, por tipo de documento
const CAMPOS = {
  orcamento: [
    "cliente",
    "tipoEvento",
    "dataEvento",
    "local",
    "subtitulo",
    "linhas",
    "imagens",
  ],
  contrato: [
    "contraentes",
    "morada",
    "contacto",
    "tipoEvento",
    "dataEvento",
    "horaInicio",
    "horaFim",
    "local",
    "lugares",
    "composicao",
    "servicosExtra",
    "valor",
    "valorExtenso",
    "localAssinatura",
    "dataAssinatura",
  ],
  proposta: ["cliente", "tipoEvento", "dataEvento", "subtitulo", "seccoes"],
};

const lerChave = (k) => {
  try {
    const bruto = localStorage.getItem(k);
    return bruto === null ? undefined : JSON.parse(bruto);
  } catch {
    return undefined; // JSON corrompido — ignora o campo
  }
};

const cheio = (v) =>
  v !== undefined && v !== null && String(v).trim() !== "";

// Conteúdo REAL vs abertura sem edição: os defaults (tipoEvento
// "Casamento", composição sugerida, "Ericeira", datas) não contam —
// só o que a Nádia escreveu de facto.
const temConteudo = (tipo, d) => {
  if (tipo === "orcamento") {
    return (
      cheio(d.cliente) ||
      cheio(d.local) ||
      cheio(d.subtitulo) ||
      (Array.isArray(d.imagens) && d.imagens.length > 0) ||
      (Array.isArray(d.linhas) &&
        d.linhas.some(
          (l) =>
            cheio(l.descricao) ||
            cheio(l.valor) ||
            (Array.isArray(l.inclui) && l.inclui.some(cheio)),
        ))
    );
  }
  if (tipo === "contrato") {
    return (
      (Array.isArray(d.contraentes) &&
        d.contraentes.some((c) => cheio(c?.nome) || cheio(c?.nif))) ||
      cheio(d.morada) ||
      cheio(d.contacto) ||
      cheio(d.local) ||
      cheio(d.lugares) ||
      cheio(d.servicosExtra) ||
      cheio(d.valor)
    );
  }
  if (tipo === "proposta") {
    return (
      cheio(d.cliente) ||
      (Array.isArray(d.seccoes) &&
        d.seccoes.some(
          (s) => cheio(s?.titulo) || cheio(s?.imagem) || cheio(s?.descricao),
        ))
    );
  }
  return false;
};

export const migrarRascunhosLocais = async () => {
  // 1) Varrer as chaves antigas (sync, barato)
  let chaves = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIXO)) chaves.push(k);
    }
  } catch {
    return { importados: 0, limpos: 0 }; // storage indisponível
  }
  if (chaves.length === 0) return { importados: 0, limpos: 0 };

  // 2) Agrupar por documento (tipo + alvo)
  const grupos = {}; // "tipo|alvo" -> { tipo, alvo, dados, chaves }
  for (const k of chaves) {
    const partes = k.slice(PREFIXO.length).split(":");
    if (partes.length !== 3) continue;
    const [tipo, alvo, campo] = partes;
    if (!CAMPOS[tipo]) continue;

    const id = `${tipo}|${alvo}`;
    if (!grupos[id]) grupos[id] = { tipo, alvo, dados: {}, chaves: [] };
    grupos[id].chaves.push(k);

    const valor = lerChave(k);
    if (valor === undefined) continue;
    if (campo === "dados" && typeof valor === "object" && valor !== null) {
      // formato transitório: o objeto completo numa chave só
      grupos[id].dados = { ...grupos[id].dados, ...valor };
    } else if (CAMPOS[tipo].includes(campo)) {
      grupos[id].dados[campo] = valor;
    }
  }

  // 3) Importar grupo a grupo (erros deixam as chaves para retry)
  let importados = 0;
  let limpos = 0;
  const limpar = (grupo) => {
    for (const k of grupo.chaves) {
      try {
        localStorage.removeItem(k);
      } catch {
        /* sem drama — volta a limpar no próximo load */
      }
    }
    limpos += grupo.chaves.length;
  };

  for (const grupo of Object.values(grupos)) {
    try {
      // Rascunho sem conteúdo real: só limpeza, nada a importar
      if (!temConteudo(grupo.tipo, grupo.dados)) {
        limpar(grupo);
        continue;
      }

      if (grupo.alvo === "manual") {
        await criarDocumento(grupo.tipo, null, grupo.dados);
        importados++;
        limpar(grupo);
        continue;
      }

      // Documento de evento: a BD ganha se já lá houver linha
      const existente = await obterDocumentoDoEvento(grupo.tipo, grupo.alvo);
      if (existente) {
        limpar(grupo);
        continue;
      }
      await criarDocumento(grupo.tipo, grupo.alvo, grupo.dados);
      importados++;
      limpar(grupo);
    } catch (e) {
      // FK morta (evento apagado), rede... as chaves ficam; retry
      // no próximo load. Não interrompe os restantes grupos.
      console.error(
        `migrarRascunhosLocais: falha em ${grupo.tipo}:${grupo.alvo}`,
        e,
      );
    }
  }

  if (importados > 0) {
    console.info(
      `Biblioteca: ${importados} documento(s) migrados do localStorage.`,
    );
  }
  return { importados, limpos };
};