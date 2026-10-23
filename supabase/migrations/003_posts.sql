-- Fase 2: calendário editorial (posts, artes, tags) + armazenamento das artes
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

-- ---------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null default '#5C6B47',
  cliente_id uuid references public.clientes (id) on delete cascade, -- vazio = tag geral
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  data_publicacao date not null,
  horario time,
  formato text not null default 'post_unico'
    check (formato in ('carrossel', 'reels', 'post_unico', 'stories')),
  pilar text,
  formato_cbs text,
  tema text,
  gancho text,
  copy text,
  legenda text,
  status text not null default 'ideia'
    check (status in ('ideia', 'roteiro', 'design', 'em_aprovacao', 'ajuste_pedido',
                      'aprovado', 'agendado', 'publicado')),
  prazo_interno date, -- só área interna
  -- desempenho, preenchido depois de publicado
  desempenho text check (desempenho in ('bom', 'media', 'abaixo')),
  alcance integer check (alcance >= 0),
  salvamentos integer check (salvamentos >= 0),
  compartilhamentos integer check (compartilhamentos >= 0),
  comentarios_qtd integer check (comentarios_qtd >= 0),
  nota_desempenho text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.post_midias (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  caminho_storage text not null,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.post_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (post_id, tag_id)
);

create index on public.tags (cliente_id);
create index on public.posts (cliente_id, data_publicacao);
create index on public.posts (data_publicacao);
create index on public.post_midias (post_id, ordem);
create index on public.post_tags (post_id);
create index on public.post_tags (tag_id);

do $$
declare t text;
begin
  foreach t in array array['tags', 'posts', 'post_midias', 'post_tags'] loop
    execute format(
      'create trigger atualizar_timestamp before update on public.%I
       for each row execute function public.atualizar_timestamp()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------
-- Funções de apoio
-- ---------------------------------------------------------------

create or replace function public.pode_ver_post(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.posts p
    where p.id = pid and public.pode_ver_cliente(p.cliente_id)
  )
$$;

revoke execute on function public.pode_ver_post(uuid) from public, anon;
grant execute on function public.pode_ver_post(uuid) to authenticated;

-- ---------------------------------------------------------------
-- Segurança (RLS)
-- ---------------------------------------------------------------

alter table public.tags enable row level security;
alter table public.posts enable row level security;
alter table public.post_midias enable row level security;
alter table public.post_tags enable row level security;

-- posts: dona e equipe do cliente leem, criam e editam; só a dona apaga
create policy posts_ler on public.posts for select to authenticated
  using (public.pode_ver_cliente(cliente_id));
create policy posts_inserir on public.posts for insert to authenticated
  with check (public.pode_ver_cliente(cliente_id));
create policy posts_editar on public.posts for update to authenticated
  using (public.pode_ver_cliente(cliente_id))
  with check (public.pode_ver_cliente(cliente_id));
create policy posts_dona_apagar on public.posts for delete to authenticated
  using (public.eh_dona());

-- post_midias e post_tags: quem enxerga o post pode mexer
create policy post_midias_tudo on public.post_midias for all to authenticated
  using (public.pode_ver_post(post_id)) with check (public.pode_ver_post(post_id));

-- a tag escolhida precisa ser geral ou do mesmo cliente do post
create policy post_tags_tudo on public.post_tags for all to authenticated
  using (public.pode_ver_post(post_id))
  with check (
    public.pode_ver_post(post_id)
    and exists (
      select 1 from public.tags t join public.posts p on p.id = post_tags.post_id
      where t.id = post_tags.tag_id and (t.cliente_id is null or t.cliente_id = p.cliente_id)
    )
  );

-- tags: todos os logados leem as gerais e as dos seus clientes;
-- a dona gerencia todas; a equipe gerencia só as tags dos clientes que atende
create policy tags_ler on public.tags for select to authenticated
  using (cliente_id is null or public.pode_ver_cliente(cliente_id));
create policy tags_inserir on public.tags for insert to authenticated
  with check (
    public.eh_dona() or (cliente_id is not null and public.pode_ver_cliente(cliente_id))
  );
create policy tags_editar on public.tags for update to authenticated
  using (public.eh_dona() or (cliente_id is not null and public.pode_ver_cliente(cliente_id)))
  with check (public.eh_dona() or (cliente_id is not null and public.pode_ver_cliente(cliente_id)));
create policy tags_apagar on public.tags for delete to authenticated
  using (public.eh_dona() or (cliente_id is not null and public.pode_ver_cliente(cliente_id)));

-- ---------------------------------------------------------------
-- Armazenamento das artes (bucket privado "posts")
-- Os arquivos ficam em: <id do cliente>/<id do post>/<arquivo>
-- ---------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('posts', 'posts', false)
on conflict (id) do nothing;

create policy posts_arquivos_ler on storage.objects for select to authenticated
  using (bucket_id = 'posts'
         and public.pode_ver_cliente(((storage.foldername(name))[1])::uuid));
create policy posts_arquivos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'posts'
              and public.pode_ver_cliente(((storage.foldername(name))[1])::uuid));
create policy posts_arquivos_editar on storage.objects for update to authenticated
  using (bucket_id = 'posts'
         and public.pode_ver_cliente(((storage.foldername(name))[1])::uuid));
create policy posts_arquivos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'posts'
         and public.pode_ver_cliente(((storage.foldername(name))[1])::uuid));
