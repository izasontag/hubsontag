-- Calendário editorial do mês enviado para APROVAÇÃO do cliente (só texto: datas, formatos, temas, ganchos).
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

create table public.calendarios_mensais (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'aprovado', 'ajuste_pedido')),
  rodada integer not null default 0, -- quantas vezes foi enviado
  enviado_em timestamptz,
  decidido_em timestamptz,
  mensagem text check (mensagem is null or char_length(mensagem) <= 2000), -- recado do cliente na última decisão
  ajustes jsonb not null default '[]'::jsonb check (jsonb_typeof(ajustes) = 'array' and jsonb_array_length(ajustes) <= 80), -- [{post_id, nota}]
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (cliente_id, mes)
);

-- registro permanente de cada resposta (quando o cliente aprovou ou pediu ajuste)
create table public.calendario_decisoes (
  id uuid primary key default gen_random_uuid(),
  calendario_id uuid not null references public.calendarios_mensais (id) on delete cascade,
  rodada integer not null,
  decisao text not null check (decisao in ('aprovado', 'ajuste_pedido')),
  mensagem text,
  ajustes jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now()
);
create index on public.calendario_decisoes (calendario_id, criado_em);

create trigger atualizar_timestamp before update on public.calendarios_mensais
  for each row execute function public.atualizar_timestamp();

alter table public.calendarios_mensais enable row level security;
alter table public.calendario_decisoes enable row level security;

create policy calendarios_tudo on public.calendarios_mensais for all to authenticated
  using (public.pode_ver_cliente(cliente_id)) with check (public.pode_ver_cliente(cliente_id));
-- o histórico de respostas só se lê (quem grava é a função do portal)
create policy calendario_decisoes_ler on public.calendario_decisoes for select to authenticated
  using (exists (select 1 from public.calendarios_mensais c where c.id = calendario_id and public.pode_ver_cliente(c.cliente_id)));

-- Envia (ou reenvia) o calendário do mês ao cliente. Roda com as permissões de quem chamou.
create or replace function public.enviar_calendario(p_cliente uuid, p_mes date)
returns void language plpgsql security invoker set search_path = public as $$
declare m date := date_trunc('month', p_mes)::date;
begin
  if not exists (select 1 from public.clientes where id = p_cliente) then raise exception 'cliente_inexistente'; end if;
  insert into public.calendarios_mensais (cliente_id, mes, status, rodada, enviado_em)
  values (p_cliente, m, 'enviado', 1, now())
  on conflict (cliente_id, mes) do update
    set status = 'enviado', rodada = public.calendarios_mensais.rodada + 1, enviado_em = now(),
        decidido_em = null, mensagem = null, ajustes = '[]'::jsonb;
end;
$$;
revoke all on function public.enviar_calendario(uuid, date) from public, anon;
grant execute on function public.enviar_calendario(uuid, date) to authenticated;

-- ---------------------------------------------------------------
-- Portal (só o que foi ENVIADO, só do cliente do link)
-- ---------------------------------------------------------------
create or replace function public.portal_calendarios(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'mes', c.mes, 'status', c.status, 'enviado_em', c.enviado_em, 'decidido_em', c.decidido_em)
    order by c.mes desc), '[]'::jsonb)
  from public.calendarios_mensais c
  where c.cliente_id = public.cliente_do_token(p_token) and c.status <> 'rascunho'
$$;

create or replace function public.portal_calendario_mes(p_token text, p_mes date)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'mes', c.mes, 'status', c.status, 'enviado_em', c.enviado_em, 'decidido_em', c.decidido_em,
    'mensagem', c.mensagem, 'ajustes', c.ajustes,
    'posts', (select coalesce(jsonb_agg(jsonb_build_object(
                'id', p.id, 'data_publicacao', p.data_publicacao, 'horario', p.horario,
                'formato', p.formato, 'pilar', p.pilar, 'formato_cbs', p.formato_cbs,
                'tema', p.tema, 'gancho', p.gancho, 'legenda', p.legenda)
                order by p.data_publicacao, p.horario nulls first), '[]'::jsonb)
              from public.posts p
              where p.cliente_id = c.cliente_id
                and p.data_publicacao >= c.mes and p.data_publicacao < (c.mes + interval '1 month')::date))
  from public.calendarios_mensais c
  where c.cliente_id = public.cliente_do_token(p_token) and c.mes = date_trunc('month', p_mes)::date and c.status <> 'rascunho'
$$;

-- O cliente aprova ou pede ajuste (com recado geral e/ou notas em itens). Fica o registro com data e hora.
create or replace function public.portal_calendario_decidir(
  p_token text, p_mes date, p_decisao text, p_mensagem text default null, p_ajustes jsonb default '[]'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.cliente_do_token(p_token);
  cal public.calendarios_mensais;
  msg text := nullif(btrim(coalesce(p_mensagem, '')), '');
  limpos jsonb := '[]'::jsonb;
  item jsonb;
begin
  if cid is null then raise exception 'link_invalido'; end if;
  if p_decisao not in ('aprovado', 'ajuste_pedido') then raise exception 'decisao_invalida'; end if;
  if msg is not null and char_length(msg) > 2000 then raise exception 'texto_invalido'; end if;
  select * into cal from public.calendarios_mensais
  where cliente_id = cid and mes = date_trunc('month', p_mes)::date and status = 'enviado';
  if not found then raise exception 'calendario_indisponivel'; end if;

  if jsonb_typeof(coalesce(p_ajustes, '[]'::jsonb)) = 'array' then
    for item in select * from jsonb_array_elements(coalesce(p_ajustes, '[]'::jsonb)) loop
      -- só itens que são deste cliente e deste mês
      if (item ? 'post_id') and exists (
        select 1 from public.posts p
        where p.id::text = item->>'post_id' and p.cliente_id = cid
          and p.data_publicacao >= cal.mes and p.data_publicacao < (cal.mes + interval '1 month')::date)
      then
        limpos := limpos || jsonb_build_array(jsonb_build_object('post_id', item->>'post_id', 'nota', left(coalesce(item->>'nota', ''), 500)));
      end if;
    end loop;
  end if;
  if p_decisao = 'ajuste_pedido' and msg is null and jsonb_array_length(limpos) = 0 then raise exception 'mensagem_obrigatoria'; end if;
  if p_decisao = 'aprovado' then limpos := '[]'::jsonb; end if;

  update public.calendarios_mensais
  set status = p_decisao, decidido_em = now(), mensagem = msg, ajustes = limpos
  where id = cal.id;
  insert into public.calendario_decisoes (calendario_id, rodada, decisao, mensagem, ajustes)
  values (cal.id, cal.rodada, p_decisao, msg, limpos);
end;
$$;

-- o menu do portal só mostra o "Calendário editorial" quando algo foi enviado
create or replace function public.portal_dados(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', c.nome, 'instagram', c.instagram, 'nicho', c.nicho,
    'cor_destaque', c.cor_destaque, 'recado', c.recado_portal,
    'objetivo', c.objetivo, 'suporte', c.suporte,
    'tem_estrategia', exists (select 1 from public.estrategias_mensais e where e.cliente_id = c.id and e.publicado),
    'tem_kickoff', exists (select 1 from public.kickoffs k where k.cliente_id = c.id and k.publicado),
    'tem_calendario', exists (select 1 from public.calendarios_mensais m where m.cliente_id = c.id and m.status <> 'rascunho'),
    'calendario_aguardando', (select count(*) from public.calendarios_mensais m where m.cliente_id = c.id and m.status = 'enviado'))
  from public.clientes c
  where c.id = public.cliente_do_token(p_token)
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'portal_calendarios(text)', 'portal_calendario_mes(text, date)',
    'portal_calendario_decidir(text, date, text, text, jsonb)', 'portal_dados(text)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end;
$$;
