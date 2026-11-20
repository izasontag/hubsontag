-- Roteiros enviados para APROVAÇÃO do cliente (de social media ou de evento) e histórico dos meses anteriores
-- do calendário editorial no portal.
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

-- ---------------------------------------------------------------
-- Aprovação do roteiro
-- ---------------------------------------------------------------
alter table public.roteiros
  add column aprovacao text not null default 'nao_enviado' check (aprovacao in ('nao_enviado', 'enviado', 'aprovado', 'ajuste_pedido')),
  add column rodada integer not null default 0,
  add column enviado_em timestamptz,
  add column decidido_em timestamptz,
  add column mensagem_cliente text check (mensagem_cliente is null or char_length(mensagem_cliente) <= 2000);

create table public.roteiro_decisoes (
  id uuid primary key default gen_random_uuid(),
  roteiro_id uuid not null references public.roteiros (id) on delete cascade,
  rodada integer not null,
  decisao text not null check (decisao in ('aprovado', 'ajuste_pedido')),
  mensagem text,
  criado_em timestamptz not null default now()
);
create index on public.roteiro_decisoes (roteiro_id, criado_em);
alter table public.roteiro_decisoes enable row level security;
create policy roteiro_decisoes_ler on public.roteiro_decisoes for select to authenticated
  using (exists (select 1 from public.roteiros r where r.id = roteiro_id and public.pode_ver_roteiro(r.cliente_id, r.evento_id)));

-- Envia (ou reenvia) roteiros ao cliente. Só vai quem tem texto. Roda com as permissões de quem chamou.
create or replace function public.enviar_roteiros(p_ids uuid[])
returns integer language plpgsql security invoker set search_path = public as $$
declare n integer;
begin
  update public.roteiros
  set aprovacao = 'enviado', rodada = rodada + 1, enviado_em = now(), decidido_em = null, mensagem_cliente = null,
      status = case when status in ('rascunho') then 'em_revisao' else status end
  where id = any(p_ids) and coalesce(btrim(texto), '') <> '';
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.enviar_roteiros(uuid[]) from public, anon;
grant execute on function public.enviar_roteiros(uuid[]) to authenticated;

-- ---------------------------------------------------------------
-- Portal do cliente de social media
-- ---------------------------------------------------------------
create or replace function public.portal_roteiros(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'titulo', r.titulo, 'formato', r.formato, 'data_prevista', r.data_prevista,
    'texto', r.texto, 'aprovacao', r.aprovacao, 'enviado_em', r.enviado_em,
    'decidido_em', r.decidido_em, 'mensagem', r.mensagem_cliente)
    order by (r.aprovacao = 'enviado') desc, r.enviado_em desc), '[]'::jsonb)
  from public.roteiros r
  where r.cliente_id = public.cliente_do_token(p_token) and r.aprovacao <> 'nao_enviado'
$$;

create or replace function public.portal_roteiro_decidir(p_token text, p_roteiro uuid, p_decisao text, p_mensagem text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.cliente_do_token(p_token);
  r public.roteiros;
  msg text := nullif(btrim(coalesce(p_mensagem, '')), '');
begin
  if cid is null then raise exception 'link_invalido'; end if;
  if p_decisao not in ('aprovado', 'ajuste_pedido') then raise exception 'decisao_invalida'; end if;
  if msg is not null and char_length(msg) > 2000 then raise exception 'texto_invalido'; end if;
  if p_decisao = 'ajuste_pedido' and msg is null then raise exception 'mensagem_obrigatoria'; end if;
  select * into r from public.roteiros where id = p_roteiro and cliente_id = cid and aprovacao = 'enviado';
  if not found then raise exception 'roteiro_indisponivel'; end if;
  update public.roteiros
  set aprovacao = p_decisao, decidido_em = now(), mensagem_cliente = msg,
      status = case when p_decisao = 'aprovado' and status in ('rascunho', 'em_revisao') then 'aprovado'
                    when p_decisao = 'ajuste_pedido' then 'em_revisao' else status end
  where id = r.id;
  insert into public.roteiro_decisoes (roteiro_id, rodada, decisao, mensagem) values (r.id, r.rodada, p_decisao, msg);
end;
$$;

-- ---------------------------------------------------------------
-- Portal do cliente de evento (junto do checklist)
-- ---------------------------------------------------------------
create or replace function public.portal_evento_roteiro_decidir(p_token text, p_roteiro uuid, p_decisao text, p_mensagem text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  eid uuid := public.evento_do_token(p_token);
  r public.roteiros;
  msg text := nullif(btrim(coalesce(p_mensagem, '')), '');
begin
  if eid is null then raise exception 'link_invalido'; end if;
  if p_decisao not in ('aprovado', 'ajuste_pedido') then raise exception 'decisao_invalida'; end if;
  if msg is not null and char_length(msg) > 2000 then raise exception 'texto_invalido'; end if;
  if p_decisao = 'ajuste_pedido' and msg is null then raise exception 'mensagem_obrigatoria'; end if;
  select * into r from public.roteiros where id = p_roteiro and evento_id = eid and aprovacao = 'enviado';
  if not found then raise exception 'roteiro_indisponivel'; end if;
  update public.roteiros
  set aprovacao = p_decisao, decidido_em = now(), mensagem_cliente = msg,
      status = case when p_decisao = 'aprovado' and status in ('rascunho', 'em_revisao') then 'aprovado'
                    when p_decisao = 'ajuste_pedido' then 'em_revisao' else status end
  where id = r.id;
  insert into public.roteiro_decisoes (roteiro_id, rodada, decisao, mensagem) values (r.id, r.rodada, p_decisao, msg);
end;
$$;

create or replace function public.portal_evento_dados(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', e.nome, 'categoria', e.categoria, 'data_evento', e.data_evento,
    'horario', e.horario, 'local', e.local, 'recado', e.recado_portal,
    'chave_publica', (select chave_publica from public.cofre_config where id = 1),
    'acesso', (select jsonb_build_object('usuario', a.usuario, 'enviado_em', a.atualizado_em)
               from public.evento_acessos a where a.evento_id = e.id),
    'perguntas', (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', q.id, 'secao', q.secao, 'pergunta', q.pergunta, 'resposta', q.resposta)
                    order by q.ordem, q.criado_em), '[]'::jsonb)
                  from public.evento_perguntas q where q.evento_id = e.id),
    'roteiros', (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', r.id, 'titulo', r.titulo, 'formato', r.formato, 'data_prevista', r.data_prevista,
                    'texto', r.texto, 'aprovacao', r.aprovacao, 'enviado_em', r.enviado_em,
                    'decidido_em', r.decidido_em, 'mensagem', r.mensagem_cliente)
                    order by (r.aprovacao = 'enviado') desc, r.enviado_em desc), '[]'::jsonb)
                 from public.roteiros r where r.evento_id = e.id and r.aprovacao <> 'nao_enviado'))
  from public.eventos e
  where e.id = public.evento_do_token(p_token)
$$;

-- ---------------------------------------------------------------
-- Calendário editorial: o cliente também vê os MESES ANTERIORES
-- (enviados antes, ou meses passados que já têm posts em aprovação ou publicados)
-- ---------------------------------------------------------------
create or replace function public.portal_calendarios(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  with cid as (select public.cliente_do_token(p_token) as id),
  enviados as (
    select c.mes, c.status, c.enviado_em, c.decidido_em
    from public.calendarios_mensais c
    where c.cliente_id = (select id from cid) and c.status <> 'rascunho'),
  historicos as (
    select distinct date_trunc('month', p.data_publicacao)::date as mes, 'historico'::text as status,
           null::timestamptz as enviado_em, null::timestamptz as decidido_em
    from public.posts p
    where p.cliente_id = (select id from cid)
      and p.status in ('em_aprovacao', 'ajuste_pedido', 'aprovado', 'agendado', 'publicado')
      and date_trunc('month', p.data_publicacao)::date < date_trunc('month', current_date)::date
      and not exists (select 1 from enviados e where e.mes = date_trunc('month', p.data_publicacao)::date))
  select coalesce(jsonb_agg(jsonb_build_object(
    'mes', x.mes, 'status', x.status, 'enviado_em', x.enviado_em, 'decidido_em', x.decidido_em)
    order by x.mes desc), '[]'::jsonb)
  from (select * from enviados union all select * from historicos) x
$$;

create or replace function public.portal_calendario_mes(p_token text, p_mes date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  cid uuid := public.cliente_do_token(p_token);
  m date := date_trunc('month', p_mes)::date;
  c public.calendarios_mensais;
  historico boolean := false;
begin
  if cid is null then return null; end if;
  select * into c from public.calendarios_mensais where cliente_id = cid and mes = m and status <> 'rascunho';
  if not found then
    -- mês passado que nunca foi enviado: mostra só os posts que o cliente já pode ver
    if m < date_trunc('month', current_date)::date and exists (
      select 1 from public.posts p where p.cliente_id = cid
        and p.data_publicacao >= m and p.data_publicacao < (m + interval '1 month')::date
        and p.status in ('em_aprovacao', 'ajuste_pedido', 'aprovado', 'agendado', 'publicado'))
    then historico := true;
    else return null;
    end if;
  end if;
  return jsonb_build_object(
    'mes', m,
    'status', case when historico then 'historico' else c.status end,
    'enviado_em', case when historico then null else c.enviado_em end,
    'decidido_em', case when historico then null else c.decidido_em end,
    'mensagem', case when historico then null else c.mensagem end,
    'ajustes', case when historico then '[]'::jsonb else c.ajustes end,
    'posts', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', p.id, 'data_publicacao', p.data_publicacao, 'horario', p.horario,
                'formato', p.formato, 'pilar', p.pilar, 'formato_cbs', p.formato_cbs,
                'tema', p.tema, 'gancho', p.gancho, 'legenda', p.legenda)
                order by p.data_publicacao, p.horario nulls first), '[]'::jsonb)
              from public.posts p
              where p.cliente_id = cid
                and p.data_publicacao >= m and p.data_publicacao < (m + interval '1 month')::date
                and (not historico or p.status in ('em_aprovacao', 'ajuste_pedido', 'aprovado', 'agendado', 'publicado'))));
end;
$$;

-- o menu do portal só mostra "Roteiros" quando algo foi enviado
create or replace function public.portal_dados(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', c.nome, 'instagram', c.instagram, 'nicho', c.nicho,
    'cor_destaque', c.cor_destaque, 'recado', c.recado_portal,
    'objetivo', c.objetivo, 'suporte', c.suporte,
    'tem_estrategia', exists (select 1 from public.estrategias_mensais e where e.cliente_id = c.id and e.publicado),
    'tem_kickoff', exists (select 1 from public.kickoffs k where k.cliente_id = c.id and k.publicado),
    'tem_calendario', exists (select 1 from public.calendarios_mensais m where m.cliente_id = c.id and m.status <> 'rascunho'),
    'calendario_aguardando', (select count(*) from public.calendarios_mensais m where m.cliente_id = c.id and m.status = 'enviado'),
    'tem_roteiros', exists (select 1 from public.roteiros r where r.cliente_id = c.id and r.aprovacao <> 'nao_enviado'),
    'roteiros_aguardando', (select count(*) from public.roteiros r where r.cliente_id = c.id and r.aprovacao = 'enviado'))
  from public.clientes c
  where c.id = public.cliente_do_token(p_token)
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'portal_roteiros(text)', 'portal_roteiro_decidir(text, uuid, text, text)',
    'portal_evento_roteiro_decidir(text, uuid, text, text)', 'portal_evento_dados(text)',
    'portal_calendarios(text)', 'portal_calendario_mes(text, date)', 'portal_dados(text)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end;
$$;
