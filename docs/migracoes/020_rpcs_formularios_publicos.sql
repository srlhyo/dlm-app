-- ============================================================
-- 020 — RPCs dos formulários públicos (FASE 1 do endurecimento RLS).
--
-- Esta migração é ADITIVA: só cria funções, não mexe em políticas nem
-- em dados. Pode correr em qualquer altura sem partir nada — o código
-- antigo continua a funcionar, e o código novo usa estas funções com
-- fallback para o caminho antigo enquanto elas não existirem.
--
-- Porquê: hoje o papel anon (a chave pública do site) consegue ler e
-- alterar TODAS as tabelas. Estas funções SECURITY DEFINER passam a
-- ser a única porta dos formulários públicos; a migração 021 fecha
-- depois o acesso directo às tabelas.
--
-- Ordem: 020 (esta) → deploy do código → verificar → 021.
-- ============================================================

-- ---------- Helpers de conversão tolerantes ----------
-- Nunca rebentam com dados mal formados: devolvem null. Uma resposta
-- estranha de um cliente não pode voltar a falhar uma submissão
-- inteira com um erro genérico.

create or replace function public.dlm_txt(v jsonb, k text)
returns text language sql immutable as
$$ select nullif(btrim(coalesce(v ->> k, '')), '') $$;

create or replace function public.dlm_safe_int(t text)
returns integer language plpgsql immutable as
$$ begin return t::integer; exception when others then return null; end $$;

create or replace function public.dlm_safe_time(t text)
returns time language plpgsql immutable as
$$ begin return t::time; exception when others then return null; end $$;

create or replace function public.dlm_safe_date(t text)
returns date language plpgsql immutable as
$$ begin return t::date; exception when others then return null; end $$;

create or replace function public.dlm_safe_uuid(t text)
returns uuid language plpgsql immutable as
$$ begin return t::uuid; exception when others then return null; end $$;

-- Array jsonb → text[] (as colunas antigas de checkboxes são text[]).
create or replace function public.dlm_txt_array(v jsonb, k text)
returns text[] language plpgsql immutable as
$$
begin
  if v -> k is null or jsonb_typeof(v -> k) <> 'array' then
    return null;
  end if;
  return array(select jsonb_array_elements_text(v -> k));
exception when others then
  return null;
end
$$;

-- ---------- Validar um código de convite ----------
-- Devolve o convite completo + o tipo de evento (nome, steps, icone)
-- + os dados do evento-alvo (para o pré-preenchimento do onboarding),
-- tudo numa chamada. Devolve null se o código não existir.
-- As regras de negócio (status "Preenchido", tipo em falta) continuam
-- no cliente, para as mensagens ficarem iguais às de sempre.
create or replace function public.formulario_validar_convite(p_codigo text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(i)
    || jsonb_build_object(
         'event_types',
         (select jsonb_build_object(
                   'nome', et.nome, 'steps', et.steps, 'icone', et.icone)
            from event_types et
           where et.id = i.event_type_id),
         'alvo_dados',
         (select jsonb_build_object(
                   'respostas', s.respostas,
                   'data_evento', s.data_evento,
                   'numero_convidados', s.numero_convidados)
            from submissions s
           where s.id = i.submission_alvo_id)
       )
    from invites i
   where i.code = upper(btrim(p_codigo))
   limit 1
$$;

-- ---------- Submeter o questionário (onboarding) ----------
-- TUDO numa transação: valida o convite, grava as respostas (update do
-- evento-alvo OU cliente novo + evento novo), marca o convite como
-- Preenchido e converte a reserva de origem. Elimina de vez os estados
-- intermédios (cliente órfão, convite pendente com respostas gravadas).
--
-- Erros de negócio saem como exceções com códigos que o cliente traduz:
--   CONVITE_INVALIDO | CONVITE_JA_USADO | EVENTO_ALVO_EM_FALTA
create or replace function public.formulario_submeter(
  p_codigo text,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite invites%rowtype;
  v_resp jsonb := coalesce(p_payload -> 'respostas', '{}'::jsonb);
  v_atual jsonb;
  v_submission_id uuid;
  v_cliente_id uuid;
  v_noivo text;
  v_noiva text;
  v_nome text;
begin
  select * into v_invite
    from invites
   where code = upper(btrim(p_codigo))
   for update;
  if not found then
    raise exception 'CONVITE_INVALIDO';
  end if;
  if v_invite.status = 'Preenchido' then
    raise exception 'CONVITE_JA_USADO';
  end if;

  if v_invite.submission_alvo_id is not null then
    -- Onboarding apontado a um evento existente: merge nas respostas
    -- (nada do que já lá vive se perde) + escrita nas colunas antigas
    -- equivalentes (dupla fonte, o mesmo padrão do drawer). Cada campo
    -- só é tocado se veio nas respostas novas; vazio grava null.
    select respostas into v_atual
      from submissions
     where id = v_invite.submission_alvo_id
     for update;
    if not found then
      raise exception 'EVENTO_ALVO_EM_FALTA';
    end if;

    update submissions set
      respostas = coalesce(v_atual, '{}'::jsonb) || v_resp,
      event_type_id = coalesce(
        dlm_safe_uuid(dlm_txt(p_payload, 'event_type_id')), event_type_id),
      data_evento = coalesce(
        dlm_safe_date(dlm_txt(p_payload, 'data_evento')), data_evento),
      -- fase NÃO é tocada (é a Nádia que a gere no funil)

      numero_convidados = case when v_resp ? 'numeroConvidados'
        then dlm_safe_int(dlm_txt(v_resp, 'numeroConvidados'))
        else numero_convidados end,

      -- texto
      nome_noivo = case when v_resp ? 'nomeNoivo' then dlm_txt(v_resp, 'nomeNoivo') else nome_noivo end,
      nome_noiva = case when v_resp ? 'nomeNoiva' then dlm_txt(v_resp, 'nomeNoiva') else nome_noiva end,
      contacto_principal = case when v_resp ? 'contactoPrincipal' then dlm_txt(v_resp, 'contactoPrincipal') else contacto_principal end,
      email = case when v_resp ? 'email' then dlm_txt(v_resp, 'email') else email end,
      morada = case when v_resp ? 'morada' then dlm_txt(v_resp, 'morada') else morada end,
      local_evento = case when v_resp ? 'localEvento' then dlm_txt(v_resp, 'localEvento') else local_evento end,
      recolha_dia_seguinte = case when v_resp ? 'recolhaDiaSeguinte' then dlm_txt(v_resp, 'recolhaDiaSeguinte') else recolha_dia_seguinte end,
      nome_responsavel = case when v_resp ? 'nomeResponsavel' then dlm_txt(v_resp, 'nomeResponsavel') else nome_responsavel end,
      contacto_responsavel = case when v_resp ? 'contactoResponsavel' then dlm_txt(v_resp, 'contactoResponsavel') else contacto_responsavel end,
      relacao_responsavel = case when v_resp ? 'relacaoResponsavel' then dlm_txt(v_resp, 'relacaoResponsavel') else relacao_responsavel end,
      estilo_outro = case when v_resp ? 'estiloOutro' then dlm_txt(v_resp, 'estiloOutro') else estilo_outro end,
      paleta_observacoes = case when v_resp ? 'paletaObservacoes' then dlm_txt(v_resp, 'paletaObservacoes') else paleta_observacoes end,
      cartoes_pratos = case when v_resp ? 'cartoesPratos' then dlm_txt(v_resp, 'cartoesPratos') else cartoes_pratos end,
      observacoes_cartoes = case when v_resp ? 'observacoesCartoes' then dlm_txt(v_resp, 'observacoesCartoes') else observacoes_cartoes end,
      descricao_mesa_noivos = case when v_resp ? 'descricaoMesaNoivos' then dlm_txt(v_resp, 'descricaoMesaNoivos') else descricao_mesa_noivos end,
      descricao_cenario = case when v_resp ? 'descricaoCenario' then dlm_txt(v_resp, 'descricaoCenario') else descricao_cenario end,
      medidas_espaco = case when v_resp ? 'medidasEspaco' then dlm_txt(v_resp, 'medidasEspaco') else medidas_espaco end,
      formato_mesas = case when v_resp ? 'formatoMesas' then dlm_txt(v_resp, 'formatoMesas') else formato_mesas end,
      observacoes_mesas = case when v_resp ? 'observacoesMesas' then dlm_txt(v_resp, 'observacoesMesas') else observacoes_mesas end,
      texto_principal_placa = case when v_resp ? 'textoPrincipalPlaca' then dlm_txt(v_resp, 'textoPrincipalPlaca') else texto_principal_placa end,
      texto_secundario_placa = case when v_resp ? 'textoSecundarioPlaca' then dlm_txt(v_resp, 'textoSecundarioPlaca') else texto_secundario_placa end,
      notas_placa = case when v_resp ? 'notasPlaca' then dlm_txt(v_resp, 'notasPlaca') else notas_placa end,
      morada_exacta = case when v_resp ? 'moradaExacta' then dlm_txt(v_resp, 'moradaExacta') else morada_exacta end,
      pessoa_abre_espaco = case when v_resp ? 'pessoaAbreEspaco' then dlm_txt(v_resp, 'pessoaAbreEspaco') else pessoa_abre_espaco end,
      contacto_pessoa_abre = case when v_resp ? 'contactoPessoaAbre' then dlm_txt(v_resp, 'contactoPessoaAbre') else contacto_pessoa_abre end,
      notas_acesso = case when v_resp ? 'notasAcesso' then dlm_txt(v_resp, 'notasAcesso') else notas_acesso end,
      observacoes_gerais = case when v_resp ? 'observacoesGerais' then dlm_txt(v_resp, 'observacoesGerais') else observacoes_gerais end,

      -- horas (time)
      hora_inicio = case when v_resp ? 'horaInicio' then dlm_safe_time(dlm_txt(v_resp, 'horaInicio')) else hora_inicio end,
      hora_termino = case when v_resp ? 'horaTermino' then dlm_safe_time(dlm_txt(v_resp, 'horaTermino')) else hora_termino end,
      hora_montagem = case when v_resp ? 'horaMontagem' then dlm_safe_time(dlm_txt(v_resp, 'horaMontagem')) else hora_montagem end,
      hora_limite_montagem = case when v_resp ? 'horaLimiteMontagem' then dlm_safe_time(dlm_txt(v_resp, 'horaLimiteMontagem')) else hora_limite_montagem end,
      hora_recolha = case when v_resp ? 'horaRecolha' then dlm_safe_time(dlm_txt(v_resp, 'horaRecolha')) else hora_recolha end,

      -- números (integer)
      numero_mesas = case when v_resp ? 'numeroMesas' then dlm_safe_int(dlm_txt(v_resp, 'numeroMesas')) else numero_mesas end,
      lugares_por_mesa = case when v_resp ? 'lugaresporMesa' then dlm_safe_int(dlm_txt(v_resp, 'lugaresporMesa')) else lugares_por_mesa end,

      -- checkboxes (text[])
      estilo_evento = case when v_resp ? 'estiloEvento' then dlm_txt_array(v_resp, 'estiloEvento') else estilo_evento end,
      paleta_cores = case when v_resp ? 'paletaCores' then dlm_txt_array(v_resp, 'paletaCores') else paleta_cores end,
      mesa_noivos = case when v_resp ? 'mesaNoivos' then dlm_txt_array(v_resp, 'mesaNoivos') else mesa_noivos end,
      cenario_palco = case when v_resp ? 'cenarioPalco' then dlm_txt_array(v_resp, 'cenarioPalco') else cenario_palco end,
      centros_mesa = case when v_resp ? 'centrosMesa' then dlm_txt_array(v_resp, 'centrosMesa') else centros_mesa end,
      tipo_flores = case when v_resp ? 'tipoFlores' then dlm_txt_array(v_resp, 'tipoFlores') else tipo_flores end,
      estilo_placa = case when v_resp ? 'estiloPlaca' then dlm_txt_array(v_resp, 'estiloPlaca') else estilo_placa end,
      acesso_local = case when v_resp ? 'acessoLocal' then dlm_txt_array(v_resp, 'acessoLocal') else acesso_local end
    where id = v_invite.submission_alvo_id;

    v_submission_id := v_invite.submission_alvo_id;

  else
    -- Convite sem alvo: cria CLIENTE + EVENTO ligados (fase "cliente").
    -- Extração do nome com a prioridade da migração 011.
    v_noivo := dlm_txt(v_resp, 'nomeNoivo');
    v_noiva := dlm_txt(v_resp, 'nomeNoiva');
    v_nome := coalesce(
      nullif(concat_ws(' & ', v_noivo, v_noiva), ''),
      dlm_txt(v_resp, 'nomeDoCliente'),
      dlm_txt(v_resp, 'nomeResponsavel'),
      'Cliente sem nome');

    insert into clientes (nome, contacto, email, morada)
    values (
      v_nome,
      dlm_txt(v_resp, 'contactoPrincipal'),
      dlm_txt(v_resp, 'email'),
      dlm_txt(v_resp, 'morada'))
    returning id into v_cliente_id;

    insert into submissions
      (cliente_id, fase, event_type_id, data_evento, numero_convidados, respostas)
    values (
      v_cliente_id,
      'cliente',
      dlm_safe_uuid(dlm_txt(p_payload, 'event_type_id')),
      dlm_safe_date(dlm_txt(p_payload, 'data_evento')),
      dlm_safe_int(dlm_txt(p_payload, 'numero_convidados')),
      v_resp)
    returning id into v_submission_id;
  end if;

  -- Marca o convite e converte a reserva de origem — na MESMA transação.
  update invites
     set status = 'Preenchido', submission_id = v_submission_id
   where id = v_invite.id;

  if v_invite.reserva_id is not null then
    update reservas
       set estado = 'Convertida', submission_id = v_submission_id
     where id = v_invite.reserva_id;
  end if;

  return jsonb_build_object('id', v_submission_id);
end
$$;

-- ---------- Captação (/interesse) ----------
-- Dedupe + cliente (novo ou reutilizado) + evento "interessado", numa
-- transação. As respostas chegam já montadas do cliente (chaves
-- canónicas + URLs das imagens, cujo upload continua no browser).
create or replace function public.captacao_submeter(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := dlm_txt(p_payload, 'nome');
  v_contacto text := dlm_txt(p_payload, 'contacto');
  v_whatsapp text := dlm_txt(p_payload, 'whatsapp');
  v_data date := dlm_safe_date(dlm_txt(p_payload, 'dataEvento'));
  v_numeros text[];
  v_numero text;
  v_hit_cliente uuid;
  v_hit_evento uuid;
  v_cliente_id uuid;
  v_reutilizado boolean := false;
  v_sub submissions%rowtype;
begin
  if v_nome is null then
    raise exception 'NOME_OBRIGATORIO';
  end if;

  -- Dedupe pelo telefone (whatsapp + contacto, cada um por si), com a
  -- função da migração 019. Se ela não existir, segue sem dedupe —
  -- a mesma resiliência do código antigo.
  select coalesce(array_agg(distinct n), '{}'::text[]) into v_numeros
    from unnest(array[v_whatsapp, v_contacto]) n
   where n is not null;

  foreach v_numero in array v_numeros loop
    v_hit_cliente := null;
    v_hit_evento := null;
    begin
      select cliente_id, evento_id into v_hit_cliente, v_hit_evento
        from captacao_dedupe(p_digitos => v_numero, p_data => v_data)
       limit 1;
    exception when others then
      v_hit_cliente := null;
      v_hit_evento := null;
    end;
    if v_hit_evento is not null then
      -- Mesmo telefone + mesma data com evento vivo: devolve o
      -- existente (mata o duplo clique e o reenvio).
      return jsonb_build_object('id', v_hit_evento, 'duplicado', true);
    end if;
    if v_hit_cliente is not null then
      v_cliente_id := v_hit_cliente;
      v_reutilizado := true;
      exit;
    end if;
  end loop;

  if v_cliente_id is null then
    insert into clientes (nome, contacto)
    values (v_nome, v_contacto)
    returning id into v_cliente_id;
  end if;

  insert into submissions
    (cliente_id, fase, event_type_id, data_evento, numero_convidados, respostas)
  values (
    v_cliente_id,
    'interessado',
    dlm_safe_uuid(dlm_txt(p_payload, 'eventTypeId')),
    v_data,
    dlm_safe_int(dlm_txt(p_payload, 'numeroConvidados')),
    coalesce(p_payload -> 'respostas', '{}'::jsonb))
  returning * into v_sub;

  return to_jsonb(v_sub)
    || case when v_reutilizado
         then jsonb_build_object('clienteReutilizado', true)
         else '{}'::jsonb end;
end
$$;

-- ---------- Briefing público (/briefing/:id) ----------
-- O id (uuid não adivinhável) é a chave de acesso, como sempre foi —
-- mas deixa de ser preciso SELECT anónimo à tabela inteira.
create or replace function public.formulario_briefing(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
           'submission', to_jsonb(s),
           'event_type', to_jsonb(et))
    from submissions s
    left join event_types et on et.id = s.event_type_id
   where s.id = p_id
$$;

-- ---------- Permissões de execução ----------
grant execute on function public.dlm_txt(jsonb, text) to anon, authenticated;
grant execute on function public.dlm_safe_int(text) to anon, authenticated;
grant execute on function public.dlm_safe_time(text) to anon, authenticated;
grant execute on function public.dlm_safe_date(text) to anon, authenticated;
grant execute on function public.dlm_safe_uuid(text) to anon, authenticated;
grant execute on function public.dlm_txt_array(jsonb, text) to anon, authenticated;
grant execute on function public.formulario_validar_convite(text) to anon, authenticated;
grant execute on function public.formulario_submeter(text, jsonb) to anon, authenticated;
grant execute on function public.captacao_submeter(jsonb) to anon, authenticated;
grant execute on function public.formulario_briefing(uuid) to anon, authenticated;
