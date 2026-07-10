import { supabase } from "./supabase";

// ============================================================
// captacao.js — a porta de entrada do funil.
// O interessado (ou a Nádia, a transcrever uma conversa de Instagram)
// preenche o formulário leve → nasce a PESSOA (clientes) + o EVENTO
// (submission) em fase "interessado".
//
// As respostas usam as chaves camelCase CANÓNICAS (nomeDoCliente,
// contactoPrincipal, localEvento, numeroConvidados, dataEvento...)
// para o drawer, o resumo e os documentos pré-preenchidos lerem tudo
// sem código novo (dupla fonte via getValorAtual).
// ============================================================

const BUCKET_REFERENCIAS = "referencias";
export const MAX_IMAGENS_REFERENCIA = 5;

const limpar = (v) => {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
};

// Comprime uma FOTO no browser: máx 1200px no lado maior, JPEG a 82%.
// Ao contrário das imagens de materiais (PNG para preservar
// transparência), fotos de inspiração/portefólio ficam 5-10x mais
// leves em JPEG. O fundo é pintado de BRANCO antes de desenhar, para
// um PNG transparente nunca ficar preto (bug clássico do canvas).
// Exportado: usado aqui (referências do cliente) e em propostas.js
// (imagens da Nádia).
export const comprimirFotoParaJpeg = (file, maxLado = 1200) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > height && width > maxLado) {
        height = Math.round((height * maxLado) / width);
        width = maxLado;
      } else if (height > maxLado) {
        width = Math.round((width * maxLado) / height);
        height = maxLado;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF"; // fundo branco: transparência nunca vira preto
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Falha ao comprimir a imagem."));
        },
        "image/jpeg",
        0.82,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem."));
    };
    img.src = url;
  });

// Faz upload de uma imagem de referência e devolve a URL pública.
export const uploadImagemReferencia = async (file) => {
  if (!file) throw new Error("Nenhum ficheiro selecionado.");
  if (!file.type.startsWith("image/"))
    throw new Error("O ficheiro tem de ser uma imagem.");

  const blob = await comprimirFotoParaJpeg(file);
  const caminho = `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { error: errUpload } = await supabase.storage
    .from(BUCKET_REFERENCIAS)
    .upload(caminho, blob, {
      contentType: "image/jpeg",
      upsert: false,
    });
  if (errUpload) throw errUpload;

  const { data } = supabase.storage
    .from(BUCKET_REFERENCIAS)
    .getPublicUrl(caminho);
  return data.publicUrl;
};

// ============================================================
// submeterCaptacao — cria cliente + evento em fase "interessado".
// Gémea da submeterQuestionario (clientes.js), mas para a captação:
// mesmo padrão de rollback (se a submissão falha, o cliente sai).
//
// payload:
//   nome*, contacto*         — a pessoa
//   eventTypeId | tipoOutro  — o tipo (modelo existente OU texto livre)
//   dataEvento, numeroConvidados, local, pretende[], mensagem
//   ficheiros[]              — File[] de imagens de referência (máx 5)
// ============================================================
export const submeterCaptacao = async (payload) => {
  const nome = limpar(payload.nome);
  const contacto = limpar(payload.contacto);
  if (!nome) throw new Error("O nome é obrigatório.");
  if (!contacto) throw new Error("O contacto é obrigatório.");

  // 1) Upload das imagens de referência (antes de criar registos;
  //    se a submissão falhar, ficam órfãs no bucket — aceitável)
  const ficheiros = (payload.ficheiros || []).slice(0, MAX_IMAGENS_REFERENCIA);
  const imagens = [];
  for (const f of ficheiros) {
    imagens.push(await uploadImagemReferencia(f));
  }

  // 2) Criar a PESSOA
  const { data: cliente, error: erroCliente } = await supabase
    .from("clientes")
    .insert({ nome, contacto })
    .select()
    .single();
  if (erroCliente) throw erroCliente;

  // 3) Criar o EVENTO em fase "interessado", com as respostas nas
  //    chaves canónicas (o resto do sistema lê-as sem código novo)
  const respostas = {
    nomeDoCliente: nome,
    contactoPrincipal: contacto,
  };
  const dataEvento = limpar(payload.dataEvento);
  if (dataEvento) respostas.dataEvento = dataEvento;
  const local = limpar(payload.local);
  if (local) respostas.localEvento = local;
  const convidados = limpar(payload.numeroConvidados);
  if (convidados) respostas.numeroConvidados = convidados;
  const tipoOutro = limpar(payload.tipoOutro);
  if (tipoOutro) respostas.tipoEventoOutro = tipoOutro;
  if (Array.isArray(payload.pretende) && payload.pretende.length > 0) {
    respostas.pretende = payload.pretende;
  }
  const mensagem = limpar(payload.mensagem);
  if (mensagem) respostas.mensagemInicial = mensagem;
  if (imagens.length > 0) respostas.imagensReferencia = imagens;

  const { data: submission, error: erroSub } = await supabase
    .from("submissions")
    .insert([
      {
        cliente_id: cliente.id,
        fase: "interessado",
        event_type_id: payload.eventTypeId || null,
        data_evento: dataEvento || null,
        numero_convidados: convidados ? Number(convidados) : null,
        respostas,
      },
    ])
    .select()
    .single();
  if (erroSub) {
    // Não deixar uma pessoa órfã se o evento falhar
    await supabase.from("clientes").delete().eq("id", cliente.id);
    throw erroSub;
  }

  return submission;
};

// Lê os tipos de evento para o select do formulário público. Se o
// SELECT anon falhar (policy em falta), devolve [] e o formulário
// degrada graciosamente para texto livre.
export const getTiposParaCaptacao = async () => {
  try {
    const { data, error } = await supabase
      .from("event_types")
      .select("id, nome")
      .order("nome");
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Sem acesso aos tipos de evento (anon?):", e);
    return [];
  }
};
