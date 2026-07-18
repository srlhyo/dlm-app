# Prompt de migração — dlm-app (schema v1)

Cola o texto abaixo num chat de IA (ChatGPT, Claude...) **junto com os
documentos do cliente**. Formatos que podes anexar: PDF, Word (.docx),
Excel (.xlsx), imagens (JPG, PNG, capturas de ecrã de conversas), .txt
— e texto colado directamente (mensagens de WhatsApp, emails, notas).
O chat devolve UM ficheiro JSON que a app importa em "Importar
clientes". Podes juntar vários clientes no mesmo chat — todos entram
no mesmo JSON.

---

## O PROMPT (copiar daqui para baixo)

És um assistente de migração de dados. Vou dar-te documentos históricos
de clientes de uma empresa de decoração e buffet de eventos ("Do Luxo à
Mesa"). A tua tarefa é devolver **UM único JSON válido** com o schema
abaixo — sem texto antes ou depois, sem comentários, sem ```.

Regras:
1. Não inventes dados. O que não estiver nos documentos fica `null`
   (campos simples) ou omite-se (secções inteiras, como um documento
   que não existe).
2. Datas SEMPRE no formato `"AAAA-MM-DD"`. Valores monetários como
   número (`650`, não `"650€"`).
3. `tipoEvento` é o nome do tipo, por extenso ("Casamento",
   "Aniversário", "Batizado"...). Escreve o que os documentos disserem
   — a app trata de o ligar aos modelos existentes.
4. Eventos históricos concluídos: podes omitir `estado`, `fase` e
   `pagamentoFinal` — a app assume "Concluído" / "contrato" / pago.
   Só os preenchas se o evento NÃO tiver terminado (ex.: foi perdido →
   `"fase": "perdido"`).
5. Nas `respostas`, usa EXACTAMENTE as chaves da lista abaixo quando a
   informação corresponder; informação que não encaixe em nenhuma chave
   entra com uma chave descritiva em camelCase (é importada na mesma).
7. Quando os documentos divergem entre si (ex.: orçamento diz 25
   lugares, contrato diz 20), o CONTRATO prevalece nos dados do
   evento (numeroConvidados, valorAcordado, datas, horas) — mas cada
   documento importa-se fiel a si próprio, sem "corrigir" o texto
   original das linhas.
8. Linhas de orçamento incluídas no preço ou sem custo (ex.:
   "Deslocação — Incluída") levam "valor": null — nunca 0.
9. A resposta começa em { e acaba em } — o JSON completo, sempre.
10. As `respostas` de cada evento incluem SEMPRE o nome: casamentos
    levam `nomeNoivo` e `nomeNoiva`; os restantes eventos levam
    `nomeDoCliente`. É este nome que aparece no calendário e nas
    listas da app.

### Schema

```json
{
  "versao": 1,
  "clientes": [
    {
      "cliente": {
        "nome": "Brenda Lorrana",
        "contacto": "912345678",
        "email": null,
        "nif": null,
        "morada": null,
        "notas": null
      },
      "eventos": [
        {
          "tipoEvento": "Casamento",
          "dataEvento": "2024-08-22",
          "valorAcordado": 650,
          "numeroConvidados": 50,
          "respostas": {
            "localEvento": "Guia Lounge Cascais",
            "estiloEvento": ["Clássico"],
            "paletaCores": ["Champanhe"],
            "horaInicio": "16:00",
            "observacoesGerais": "..."
          },
          "formularioPreenchido": true,
          "documentos": {
            "orcamento": {
              "cliente": "Brenda Lorrana",
              "tipoEvento": "Casamento",
              "dataEvento": "2024-08-22",
              "local": "Guia Lounge Cascais",
              "subtitulo": "",
              "linhas": [
                {
                  "descricao": "Decoração de Mesas — 50 Lugares Completos",
                  "inclui": ["Mesa posta completa", "Centros de mesa"],
                  "qtd": 1,
                  "valor": 650
                }
              ]
            },
            "contrato": {
              "contraentes": [{ "nome": "Brenda Lorrana", "nif": "299217833" }],
              "morada": "Rua ...",
              "contacto": "912345678",
              "tipoEvento": "Casamento",
              "dataEvento": "2024-08-22",
              "horaInicio": "16:00",
              "horaFim": "23:00",
              "local": "Av. ... Cascais",
              "lugares": "50",
              "composicao": "Prato principal e de sobremesa\nTalheres\nGuardanapo de tecido",
              "seccoesExtra": [
                { "titulo": "Serviços Adicionais", "itens": "Espaço fotografável\nPainéis decorativos" }
              ],
              "valor": "650",
              "valorExtenso": "seiscentos e cinquenta euros",
              "localAssinatura": "Ericeira",
              "dataAssinatura": "2024-05-01"
            },
            "proposta": {
              "cliente": "Brenda Lorrana",
              "tipoEvento": "Casamento",
              "dataEvento": "2024-08-22",
              "subtitulo": "Decoração desenvolvida dentro da estética Do Luxo à Mesa.",
              "seccoes": [
                { "titulo": "Mesa dos convidados", "descricao": "Para 50 convidados:\n- Mesa posta completa\n- Centros de mesa" }
              ]
            }
          }
        }
      ]
    }
  ]
}
```

Notas sobre os documentos: `"proposta"` é o Projecto (usa essa chave);
`composicao`, `itens` e as `descricao` das secções da proposta são
texto com **um item por linha** (`\n`); linhas começadas por `-` na
proposta viram bullets. Imagens NÃO entram no JSON (não são
importadas). Um documento que não exista simplesmente não aparece em
`documentos`.

### Chaves canónicas das `respostas`

nomeNoivo, nomeNoiva, nomeDoCliente, nomeResponsavel,
contactoResponsavel, relacaoResponsavel, contactoPrincipal,
numeroWhatsapp, email, morada, localEvento, moradaExacta,
numeroConvidados, dataEvento, horaInicio, horaTermino, horaMontagem,
horaLimiteMontagem, horaRecolha, recolhaDiaSeguinte, estiloEvento
(array), estiloOutro, paletaCores (array), paletaObservacoes,
mesaNoivos, descricaoMesaNoivos, cartoesPratos, observacoesCartoes,
cenarioPalco, descricaoCenario, medidasEspaco, centrosMesa, tipoFlores,
numeroMesas, formatoMesas, lugaresporMesa, observacoesMesas,
textoPrincipalPlaca, textoSecundarioPlaca, estiloPlaca, notasPlaca,
pessoaAbreEspaco, contactoPessoaAbre, acessoLocal, notasAcesso,
observacoesGerais, tipoLocal, servicos (array), servicosBalcao (array),
mensagemInicial, tipoEventoOutro.

As chaves marcadas com (array) levam SEMPRE uma lista JSON — mesmo
com um só valor: `"estiloEvento": ["Clássico"]`, nunca
`"estiloEvento": "Clássico"`.

Devolve agora o JSON.