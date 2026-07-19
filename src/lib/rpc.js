// ============================================================
// rpc.js — utilitários para as funções RPC dos formulários públicos
// (migração 020).
//
// Enquanto uma migração ainda não correu numa BD, as funções não
// existem lá — o código detecta isso e usa o caminho antigo (acesso
// directo às tabelas), que continua a funcionar até à migração 021.
// Assim o deploy do código e as migrações podem acontecer por
// qualquer ordem sem partir nenhum dos ambientes.
// ============================================================

// O PostgREST responde com PGRST202 quando a função não existe.
export const ehFuncaoRpcEmFalta = (erro) =>
  erro?.code === "PGRST202" ||
  /could not find the function|function .* does not exist/i.test(
    erro?.message || "",
  );

// As funções sinalizam erros de negócio com códigos no message
// (ex: "CONVITE_JA_USADO"). Devolve o código, ou null.
export const codigoErroRpc = (erro) => {
  const m = (erro?.message || "").match(/[A-Z][A-Z_]{3,}/);
  return m ? m[0] : null;
};
