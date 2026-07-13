import { useState, useEffect } from "react";

// ============================================================
// useRascunho — um useState que sobrevive ao F5.
//
// Grava no localStorage a cada mudança e renasce de lá ao montar.
// Serve os geradores de documentos: o que a Nádia escreve num
// orçamento/contrato/projecto não morre com um refresh ou um
// fecho acidental do browser. A chave inclui o evento (ou
// "manual"), por isso cada documento tem o seu rascunho.
//
// Nota: valores têm de ser serializáveis (JSON) — os geradores
// guardam URLs de imagens (não ficheiros), por isso servem.
// ============================================================
const PREFIXO = "dlm_rascunho_";

export function useRascunho(chave, inicial) {
  const [valor, setValor] = useState(() => {
    try {
      const bruto = localStorage.getItem(PREFIXO + chave);
      if (bruto !== null) return JSON.parse(bruto);
    } catch {
      /* storage indisponível ou JSON corrompido — segue o inicial */
    }
    return typeof inicial === "function" ? inicial() : inicial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(PREFIXO + chave, JSON.stringify(valor));
    } catch {
      /* quota cheia ou privado — o pior caso é voltar ao normal */
    }
  }, [chave, valor]);

  return [valor, setValor];
}