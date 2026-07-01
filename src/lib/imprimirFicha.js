import { gerarListas } from "./materiais";

// ============================================================
// imprimirFicha.js — gera um documento imprimível (HTML + CSS)
// com as 3 listas operacionais e abre o diálogo de impressão do
// browser (que permite imprimir em papel ou guardar como PDF).
//
// Cada lista tem colunas próprias, pensadas para o seu momento:
//   • Carga        → o que sai do armazém: qtd, unidade, cores
//   • Montagem     → no local: qtd, cores, observações (instruções)
//   • Higienização → regresso: só qtd (o que voltou para limpar)
// Cada lista começa em página nova e tem checkbox manual.
// ============================================================

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatData(data) {
  if (!data) return "—";
  return new Date(data).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// Título legível do evento (mesma lógica do seletor da ficha)
function tituloEvento(submissao) {
  const nomes = [submissao.nome_noivo, submissao.nome_noiva].filter(
    (n) => typeof n === "string" && n.trim() !== "",
  );
  if (nomes.length > 0) return nomes.join(" & ");
  if (submissao.local_evento) return submissao.local_evento;
  return "Evento";
}

// Colunas por lista: quais mostrar em cada uma.
const COLUNAS = {
  carga: { quantidade: true, unidade: true, cores: true, observacoes: false },
  montagem: {
    quantidade: true,
    unidade: true,
    cores: true,
    observacoes: true,
  },
  higienizacao: {
    quantidade: true,
    unidade: true,
    cores: false,
    observacoes: false,
  },
};

const TITULOS = {
  carga: "Lista de Carga",
  montagem: "Lista de Montagem",
  higienizacao: "Lista de Higienização",
};

const SUBTITULOS = {
  carga: "O que sai do armazém",
  montagem: "O que vai para o local e como",
  higienizacao: "O que volta e precisa de limpeza",
};

// Constrói o HTML de uma tabela de itens para uma lista.
function tabelaCategoria(grupo, cols) {
  const linhas = grupo.itens
    .map((item) => {
      const celulas = [];
      celulas.push(`<td class="check"><span class="box"></span></td>`);
      celulas.push(`<td class="nome">${escapeHtml(item.nome)}</td>`);
      if (cols.quantidade)
        celulas.push(
          `<td class="qtd">${item.quantidade ? escapeHtml(item.quantidade) : "—"}</td>`,
        );
      if (cols.unidade)
        celulas.push(`<td class="un">${escapeHtml(item.unidade || "")}</td>`);
      if (cols.cores)
        celulas.push(`<td class="cores">${escapeHtml(item.cores || "")}</td>`);
      if (cols.observacoes)
        celulas.push(
          `<td class="obs">${escapeHtml(item.observacoes || "")}</td>`,
        );
      return `<tr>${celulas.join("")}</tr>`;
    })
    .join("");

  const cabecalhos = [];
  cabecalhos.push(`<th class="check"></th>`);
  cabecalhos.push(`<th class="nome">Material</th>`);
  if (cols.quantidade) cabecalhos.push(`<th class="qtd">Qtd.</th>`);
  if (cols.unidade) cabecalhos.push(`<th class="un">Un.</th>`);
  if (cols.cores) cabecalhos.push(`<th class="cores">Cores</th>`);
  if (cols.observacoes) cabecalhos.push(`<th class="obs">Observações</th>`);

  return `
    <div class="categoria">
      <h3>${escapeHtml(grupo.categoria)}</h3>
      <table>
        <thead><tr>${cabecalhos.join("")}</tr></thead>
        <tbody>${linhas}</tbody>
      </table>
    </div>`;
}

// Constrói uma secção (uma das 3 listas) — página própria.
function seccaoLista(chave, grupos, submissao, ehPrimeira) {
  const cols = COLUNAS[chave];
  const totalItens = grupos.reduce((s, g) => s + g.itens.length, 0);

  const corpo =
    totalItens === 0
      ? `<p class="vazio">Sem materiais nesta lista.</p>`
      : grupos.map((g) => tabelaCategoria(g, cols)).join("");

  return `
    <section class="lista ${ehPrimeira ? "" : "quebra"}">
      <header class="cabecalho-lista">
        <div class="marca">
          <p class="marca-nome">Do Luxo à Mesa</p>
          <p class="marca-sub">by Luxury Events</p>
        </div>
        <div class="titulo-lista">
          <h2>${TITULOS[chave]}</h2>
          <p class="subtitulo">${SUBTITULOS[chave]}</p>
        </div>
      </header>
      <div class="evento-info">
        <span><strong>${escapeHtml(tituloEvento(submissao))}</strong></span>
        <span>${formatData(submissao.data_evento)}</span>
        ${submissao.local_evento ? `<span>${escapeHtml(submissao.local_evento)}</span>` : ""}
      </div>
      ${corpo}
    </section>`;
}

const ESTILO = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    color: #1A1A1A;
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .lista {
    padding: 32px 28px;
    max-width: 800px;
    margin: 0 auto;
  }
  .quebra { page-break-before: always; }
  .cabecalho-lista {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid #C9A84C;
    padding-bottom: 14px;
    margin-bottom: 4px;
  }
  .marca-nome {
    font-family: Georgia, 'Playfair Display', serif;
    font-size: 16px;
    color: #C9A84C;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin: 0;
  }
  .marca-sub {
    font-size: 8px;
    color: #C9A84C;
    text-transform: uppercase;
    letter-spacing: 0.25em;
    margin: 2px 0 0 0;
  }
  .titulo-lista { text-align: right; }
  .titulo-lista h2 {
    font-family: Georgia, 'Playfair Display', serif;
    font-size: 22px;
    color: #1A1A1A;
    margin: 0;
  }
  .subtitulo {
    font-size: 11px;
    color: #6B6B6B;
    margin: 2px 0 0 0;
    font-style: italic;
  }
  .evento-info {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    font-size: 12px;
    color: #6B6B6B;
    margin: 14px 0 24px 0;
    padding: 10px 14px;
    background: #FAFAF8;
    border-radius: 8px;
  }
  .evento-info strong { color: #1A1A1A; }
  .categoria { margin-bottom: 20px; }
  .categoria h3 {
    font-size: 11px;
    font-weight: 700;
    color: #C9A84C;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin: 0 0 6px 0;
    padding-bottom: 4px;
    border-bottom: 1px solid #E8D5A3;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  thead th {
    text-align: left;
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6B6B6B;
    font-weight: 600;
    padding: 4px 8px;
    border-bottom: 1px solid #E8D5A3;
  }
  tbody td {
    padding: 7px 8px;
    border-bottom: 1px solid #F0EDE8;
    vertical-align: top;
  }
  th.check, td.check { width: 28px; text-align: center; }
  .box {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 1.5px solid #C9A84C;
    border-radius: 3px;
  }
  th.nome, td.nome { font-weight: 500; }
  th.qtd, td.qtd { width: 50px; text-align: center; }
  th.un, td.un { width: 44px; color: #6B6B6B; }
  th.cores, td.cores { width: 120px; color: #6B6B6B; }
  td.obs { color: #6B6B6B; font-size: 12px; }
  .vazio {
    font-size: 13px;
    color: #6B6B6B;
    font-style: italic;
    padding: 20px 0;
  }
  @page { margin: 1.5cm; }
`;

// API principal: recebe as linhas de evento_materiais (com .material)
// e a submissão, e abre o diálogo de impressão.
export function imprimirFicha(eventoMateriais, submissao) {
  const listas = gerarListas(eventoMateriais);

  const seccoes = [
    seccaoLista("carga", listas.carga, submissao, true),
    seccaoLista("montagem", listas.montagem, submissao, false),
    seccaoLista("higienizacao", listas.higienizacao, submissao, false),
  ].join("");

  const html = `<!DOCTYPE html>
    <html lang="pt">
    <head>
      <meta charset="utf-8" />
      <title>Ficha Operacional — ${escapeHtml(tituloEvento(submissao))}</title>
      <style>${ESTILO}</style>
    </head>
    <body>${seccoes}</body>
    </html>`;

  const janela = window.open("", "_blank");
  if (!janela) {
    alert(
      "O browser bloqueou a janela de impressão. Permite pop-ups para este site e tenta novamente.",
    );
    return;
  }
  janela.document.open();
  janela.document.write(html);
  janela.document.close();

  // dá um instante ao browser para renderizar antes de abrir o print
  janela.onload = () => {
    janela.focus();
    janela.print();
  };
  // fallback caso onload não dispare (alguns browsers com about:blank)
  setTimeout(() => {
    try {
      janela.focus();
      janela.print();
    } catch (e) {
      /* já foi tratado no onload */
    }
  }, 500);
}