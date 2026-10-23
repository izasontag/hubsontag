-- Rodadas quinzenais de aprovação + vídeos nos posts
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

-- ---------------------------------------------------------------
-- Rodadas: um grupo de posts enviado de uma vez ao cliente (ex.: a quinzena)
-- ---------------------------------------------------------------

create table public.rodadas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  titulo text not null,
  inicio date,
  fim date,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada')),
  enviada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index on public.rodadas (cliente_id, criado_em desc);

create trigger atualizar_timestamp before update on public.rodadas
  for each row execute function public.atualizar_timestamp();

alter table public.posts add column rodada_id uuid references public.rodadas (id) on delete set null;
create index on public.posts (rodada_id);

-- um post só pode estar numa rodada do mesmo cliente
create or replace function public.validar_rodada_do_post()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.rodada_id is not null and not exists (
    select 1 from public.rodadas r where r.id = new.rodada_id and r.cliente_id = new.cliente_id
  ) then
    raise exception 'rodada_de_outro_cliente';
  end if;
  return new;
end;
$$;

create trigger validar_rodada_do_post before insert or update of rodada_id, cliente_id on public.posts
  for each row execute function public.validar_rodada_do_post();

alter table public.rodadas enable row level security;

create policy rodadas_ler on public.rodadas for select to authenticated
  using (public.pode_ver_cliente(cliente_id));
create policy rodadas_inserir on public.rodadas for insert to authenticated
  with check (public.pode_ver_cliente(cliente_id));
create policy rodadas_editar on public.rodadas for update to authenticated
  using (public.pode_ver_cliente(cliente_id)) with check (public.pode_ver_cliente(cliente_id));
create policy rodadas_dona_apagar on public.rodadas for delete to authenticated
  using (public.eh_dona());

-- Envia a rodada ao cliente: todos os rascunhos viram "Em aprovação" de uma vez.
-- Roda com as permissões de quem chamou (a segurança das tabelas continua valendo).
create or replace function public.enviar_rodada(p_rodada uuid)
returns integer language plpgsql security invoker set search_path = public as $$
declare n integer;
begin
  if not exists (select 1 from public.rodadas where id = p_rodada) then
    raise exception 'rodada_inexistente';
  end if;
  update public.posts set status = 'em_aprovacao'
  where rodada_id = p_rodada and status in ('ideia', 'roteiro', 'design');
  get diagnostics n = row_count;
  update public.rodadas
  set status = 'enviada', enviada_em = coalesce(enviada_em, now())
  where id = p_rodada;
  return n;
end;
$$;

revoke all on function public.enviar_rodada(uuid) from public, anon;
grant execute on function public.enviar_rodada(uuid) to authenticated;

-- ---------------------------------------------------------------
-- Vídeos: cada mídia do post é imagem ou vídeo; o vídeo pode ser arquivo ou link
-- ---------------------------------------------------------------

alter table public.post_midias add column tipo text not null default 'imagem'
  check (tipo in ('imagem', 'video'));
alter table public.post_midias add column link_externo text
  check (link_externo is null or link_externo ~* '^https?://');
alter table public.post_midias alter column caminho_storage drop not null;
alter table public.post_midias add constraint post_midias_tem_origem
  check (caminho_storage is not null or link_externo is not null);

-- limite de 50 MB por arquivo (o máximo do plano gratuito)
update storage.buckets set file_size_limit = 52428800 where id = 'posts';

-- ---------------------------------------------------------------
-- Portal: agora com rodadas e mídias com tipo
-- ---------------------------------------------------------------

create or replace function public.portal_rodadas(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'titulo', r.titulo, 'inicio', r.inicio, 'fim', r.fim,
    'enviada_em', r.enviada_em) order by r.enviada_em desc), '[]'::jsonb)
  from public.rodadas r
  where r.cliente_id = public.cliente_do_token(p_token) and r.status = 'enviada'
$$;

revoke all on function public.portal_rodadas(text) from public;
grant execute on function public.portal_rodadas(text) to anon, authenticated;

create or replace function public.portal_posts(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id, 'rodada_id', p.rodada_id,
      'data_publicacao', p.data_publicacao, 'horario', p.horario,
      'formato', p.formato, 'pilar', p.pilar, 'formato_cbs', p.formato_cbs,
      'tema', p.tema, 'gancho', p.gancho, 'copy', p.copy, 'legenda', p.legenda,
      'status', p.status, 'desempenho', p.desempenho, 'alcance', p.alcance,
      'salvamentos', p.salvamentos, 'compartilhamentos', p.compartilhamentos,
      'comentarios_qtd', p.comentarios_qtd, 'nota_desempenho', p.nota_desempenho,
      'tags', (select coalesce(jsonb_agg(jsonb_build_object('nome', t.nome, 'cor', t.cor)
                                         order by t.nome), '[]'::jsonb)
               from public.post_tags pt join public.tags t on t.id = pt.tag_id
               where pt.post_id = p.id),
      'midias', (select coalesce(jsonb_agg(jsonb_build_object(
                   'tipo', m.tipo, 'caminho', m.caminho_storage, 'link', m.link_externo)
                   order by m.ordem), '[]'::jsonb)
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
