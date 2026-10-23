-- Fase 3: portal do cliente (link secreto, sem login), aprovações e comentários
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

-- ---------------------------------------------------------------
-- Novas tabelas e colunas
-- ---------------------------------------------------------------

alter table public.clientes add column recado_portal text;

create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  autor_id uuid references public.perfis (id) on delete set null, -- vazio = veio do portal
  origem text not null check (origem in ('interno', 'portal')),
  visivel_cliente boolean not null default false, -- comentário interno só aparece no portal se marcado
  texto text not null check (char_length(texto) between 1 and 2000),
  referencia text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Registro permanente de quem aprovou (ou pediu ajuste) e quando
create table public.aprovacoes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  autor_id uuid references public.perfis (id) on delete set null, -- vazio = cliente pelo link
  decisao text not null check (decisao in ('aprovado', 'ajuste_pedido')),
  mensagem text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.feed_atual (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  caminho_storage text not null,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.materiais (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  titulo text not null,
  tipo text not null default 'documento'
    check (tipo in ('briefing', 'contrato', 'identidade', 'documento')),
  link text,
  caminho_storage text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.relatorios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  mes date not null, -- primeiro dia do mês
  resumo text,
  destaques text,
  proximos_passos text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index on public.comentarios (post_id, criado_em);
create index on public.aprovacoes (post_id, criado_em);
create index on public.feed_atual (cliente_id, ordem);
create index on public.materiais (cliente_id);
create index on public.relatorios (cliente_id, mes desc);

do $$
declare t text;
begin
  foreach t in array array['comentarios', 'aprovacoes', 'feed_atual', 'materiais', 'relatorios'] loop
    execute format(
      'create trigger atualizar_timestamp before update on public.%I
       for each row execute function public.atualizar_timestamp()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------
-- Segurança (RLS) da área interna
-- ---------------------------------------------------------------

alter table public.comentarios enable row level security;
alter table public.aprovacoes enable row level security;
alter table public.feed_atual enable row level security;
alter table public.materiais enable row level security;
alter table public.relatorios enable row level security;

-- comentários: dona e equipe do cliente leem e escrevem (sempre como "interno"); só a dona apaga
create policy comentarios_ler on public.comentarios for select to authenticated
  using (public.pode_ver_post(post_id));
create policy comentarios_inserir on public.comentarios for insert to authenticated
  with check (public.pode_ver_post(post_id) and origem = 'interno' and autor_id = auth.uid());
create policy comentarios_dona_apagar on public.comentarios for delete to authenticated
  using (public.eh_dona());

-- aprovações: só leitura na área interna. Quem grava é o portal, pela função portal_decidir.
-- Ninguém edita nem apaga: é o registro permanente.
create policy aprovacoes_ler on public.aprovacoes for select to authenticated
  using (public.pode_ver_post(post_id));

-- feed_atual e materiais: dona e equipe do cliente
create policy feed_atual_tudo on public.feed_atual for all to authenticated
  using (public.pode_ver_cliente(cliente_id)) with check (public.pode_ver_cliente(cliente_id));
create policy materiais_tudo on public.materiais for all to authenticated
  using (public.pode_ver_cliente(cliente_id)) with check (public.pode_ver_cliente(cliente_id));

-- relatórios: dona e equipe leem e editam; só a dona apaga
create policy relatorios_ler on public.relatorios for select to authenticated
  using (public.pode_ver_cliente(cliente_id));
create policy relatorios_inserir on public.relatorios for insert to authenticated
  with check (public.pode_ver_cliente(cliente_id));
create policy relatorios_editar on public.relatorios for update to authenticated
  using (public.pode_ver_cliente(cliente_id)) with check (public.pode_ver_cliente(cliente_id));
create policy relatorios_dona_apagar on public.relatorios for delete to authenticated
  using (public.eh_dona());

-- ---------------------------------------------------------------
-- Funções do portal (o cliente NÃO lê as tabelas; só chama estas funções com o link)
-- ---------------------------------------------------------------

-- uso interno das outras funções: descobre o cliente a partir do link
create or replace function public.cliente_do_token(p_token text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.clientes
  where token_portal = p_token and portal_ativo and length(p_token) >= 32
  limit 1
$$;
revoke all on function public.cliente_do_token(text) from public, anon, authenticated;

create or replace function public.portal_dados(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', c.nome, 'instagram', c.instagram, 'nicho', c.nicho,
    'cor_destaque', c.cor_destaque, 'recado', c.recado_portal)
  from public.clientes c
  where c.id = public.cliente_do_token(p_token)
$$;

-- Posts a partir de "em aprovação". Nunca devolve prazo_interno nem status de produção.
create or replace function public.portal_posts(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id, 'data_publicacao', p.data_publicacao, 'horario', p.horario,
      'formato', p.formato, 'pilar', p.pilar, 'formato_cbs', p.formato_cbs,
      'tema', p.tema, 'gancho', p.gancho, 'copy', p.copy, 'legenda', p.legenda,
      'status', p.status, 'desempenho', p.desempenho, 'alcance', p.alcance,
      'salvamentos', p.salvamentos, 'compartilhamentos', p.compartilhamentos,
      'comentarios_qtd', p.comentarios_qtd, 'nota_desempenho', p.nota_desempenho,
      'tags', (select coalesce(jsonb_agg(jsonb_build_object('nome', t.nome, 'cor', t.cor)
                                         order by t.nome), '[]'::jsonb)
               from public.post_tags pt join public.tags t on t.id = pt.tag_id
               where pt.post_id = p.id),
      'midias', (select coalesce(jsonb_agg(m.caminho_storage order by m.ordem), '[]'::jsonb)
                 from public.post_midias m where m.post_id = p.id),
      'comentarios', (select coalesce(jsonb_agg(jsonb_build_object(
                        'id', c.id, 'origem', c.origem, 'texto', c.texto,
                        'referencia', c.referencia, 'criado_em', c.criado_em)
                        order by c.criado_em), '[]'::jsonb)
                      from public.comentarios c
                      where c.post_id = p.id and c.visivel_cliente),
      'aprovacoes', (select coalesce(jsonb_agg(jsonb_build_object(
                       'decisao', a.decisao, 'mensagem', a.mensagem, 'criado_em', a.criado_em)
                       order by a.criado_em), '[]'::jsonb)
                     from public.aprovacoes a where a.post_id = p.id)
    ) order by p.data_publicacao, p.horario nulls first
  ), '[]'::jsonb)
  from public.posts p
  where p.cliente_id = public.cliente_do_token(p_token)
    and p.status in ('em_aprovacao', 'ajuste_pedido', 'aprovado', 'agendado', 'publicado')
$$;

create or replace function public.portal_manual(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'manual', (select to_jsonb(m) - 'id' - 'cliente_id' - 'criado_em' - 'atualizado_em'
               from public.manual_marca m where m.cliente_id = public.cliente_do_token(p_token)),
    'metas', (select coalesce(jsonb_agg(jsonb_build_object(
                'nome', mt.nome, 'valor_atual', mt.valor_atual,
                'valor_meta', mt.valor_meta, 'prazo', mt.prazo) order by mt.criado_em), '[]'::jsonb)
              from public.metas mt where mt.cliente_id = public.cliente_do_token(p_token))
  )
  where public.cliente_do_token(p_token) is not null
$$;

create or replace function public.portal_feed(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(f.caminho_storage order by f.ordem), '[]'::jsonb)
  from public.feed_atual f where f.cliente_id = public.cliente_do_token(p_token)
$$;

create or replace function public.portal_materiais(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'titulo', m.titulo, 'tipo', m.tipo, 'link', m.link) order by m.criado_em), '[]'::jsonb)
  from public.materiais m
  where m.cliente_id = public.cliente_do_token(p_token) and m.link is not null
$$;

create or replace function public.portal_relatorios(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'mes', r.mes, 'resumo', r.resumo, 'destaques', r.destaques,
    'proximos_passos', r.proximos_passos) order by r.mes desc), '[]'::jsonb)
  from public.relatorios r where r.cliente_id = public.cliente_do_token(p_token)
$$;

-- O cliente comenta em um post dele (a partir de "em aprovação")
create or replace function public.portal_comentar(
  p_token text, p_post_id uuid, p_texto text, p_referencia text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.cliente_do_token(p_token);
  txt text := btrim(coalesce(p_texto, ''));
begin
  if cid is null then raise exception 'link_invalido'; end if;
  if char_length(txt) < 1 or char_length(txt) > 2000 then raise exception 'texto_invalido'; end if;
  if not exists (
    select 1 from public.posts
    where id = p_post_id and cliente_id = cid
      and status in ('em_aprovacao', 'ajuste_pedido', 'aprovado', 'agendado', 'publicado')
  ) then raise exception 'post_indisponivel'; end if;
  insert into public.comentarios (post_id, autor_id, origem, visivel_cliente, texto, referencia)
  values (p_post_id, null, 'portal', true, txt, nullif(btrim(coalesce(p_referencia, '')), ''));
end;
$$;

-- O cliente aprova ou pede ajuste. O status do post muda e fica o registro com data e hora.
create or replace function public.portal_decidir(
  p_token text, p_post_id uuid, p_decisao text, p_mensagem text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.cliente_do_token(p_token);
  msg text := nullif(btrim(coalesce(p_mensagem, '')), '');
begin
  if cid is null then raise exception 'link_invalido'; end if;
  if p_decisao not in ('aprovado', 'ajuste_pedido') then raise exception 'decisao_invalida'; end if;
  if p_decisao = 'ajuste_pedido' and msg is null then raise exception 'mensagem_obrigatoria'; end if;
  if msg is not null and char_length(msg) > 2000 then raise exception 'texto_invalido'; end if;

  update public.posts set status = p_decisao
  where id = p_post_id and cliente_id = cid and status = 'em_aprovacao';
  if not found then raise exception 'post_indisponivel'; end if;

  insert into public.aprovacoes (post_id, autor_id, decisao, mensagem)
  values (p_post_id, null, p_decisao, msg);
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'portal_dados(text)', 'portal_posts(text)', 'portal_manual(text)', 'portal_feed(text)',
    'portal_materiais(text)', 'portal_relatorios(text)',
    'portal_comentar(text, uuid, text, text)', 'portal_decidir(text, uuid, text, text)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end;
$$;

-- ---------------------------------------------------------------
-- Imagens do portal
-- O bucket "posts" passa a ser público: quem tem o endereço exato de uma imagem consegue
-- abri-la. Os endereços têm 3 códigos aleatórios e só aparecem para quem tem o link
-- do portal. Ninguém consegue listar os arquivos, e o envio continua restrito à equipe.
-- ---------------------------------------------------------------
update storage.buckets set public = true where id = 'posts';
