-- Painel do cliente estilo Notion: Estratégia mensal e Kick-off (como o perfil estava no início).
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

-- ---------------------------------------------------------------
-- Estratégia mensal (uma página por cliente e por mês)
-- ---------------------------------------------------------------
create table public.estrategias_mensais (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  titulo text not null default '' check (char_length(titulo) <= 120),
  objetivo text check (objetivo is null or char_length(objetivo) <= 1000),
  texto text check (texto is null or char_length(texto) <= 20000), -- texto livre, com títulos, listas e negrito
  pilares jsonb not null default '[]'::jsonb check (jsonb_typeof(pilares) = 'array' and jsonb_array_length(pilares) <= 12),
  metas jsonb not null default '[]'::jsonb check (jsonb_typeof(metas) = 'array' and jsonb_array_length(metas) <= 20),
  datas jsonb not null default '[]'::jsonb check (jsonb_typeof(datas) = 'array' and jsonb_array_length(datas) <= 40),
  publicado boolean not null default false,
  publicado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (cliente_id, mes)
);
create index on public.estrategias_mensais (cliente_id, mes desc);

-- ---------------------------------------------------------------
-- Kick-off (um por cliente): o ponto de partida do perfil
-- ---------------------------------------------------------------
create table public.kickoffs (
  cliente_id uuid primary key references public.clientes (id) on delete cascade,
  data_inicio date,
  resumo text check (resumo is null or char_length(resumo) <= 2000),
  diagnostico text check (diagnostico is null or char_length(diagnostico) <= 20000),
  pontos_fortes text check (pontos_fortes is null or char_length(pontos_fortes) <= 4000),
  oportunidades text check (oportunidades is null or char_length(oportunidades) <= 4000),
  metricas jsonb not null default '[]'::jsonb check (jsonb_typeof(metricas) = 'array' and jsonb_array_length(metricas) <= 30), -- [{nome, inicio, atual}]
  prints jsonb not null default '[]'::jsonb check (jsonb_typeof(prints) = 'array' and jsonb_array_length(prints) <= 30), -- caminhos no bucket "posts"
  publicado boolean not null default false,
  publicado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger atualizar_timestamp before update on public.estrategias_mensais
  for each row execute function public.atualizar_timestamp();
create trigger atualizar_timestamp before update on public.kickoffs
  for each row execute function public.atualizar_timestamp();

-- ---------------------------------------------------------------
-- Segurança: dona e equipe do cliente (quem enxerga o cliente)
-- ---------------------------------------------------------------
alter table public.estrategias_mensais enable row level security;
alter table public.kickoffs enable row level security;

create policy estrategias_tudo on public.estrategias_mensais for all to authenticated
  using (public.pode_ver_cliente(cliente_id)) with check (public.pode_ver_cliente(cliente_id));
create policy kickoffs_tudo on public.kickoffs for all to authenticated
  using (public.pode_ver_cliente(cliente_id)) with check (public.pode_ver_cliente(cliente_id));

-- ---------------------------------------------------------------
-- Portal: só o que foi PUBLICADO, só do cliente do link
-- ---------------------------------------------------------------
create or replace function public.portal_estrategias(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'mes', e.mes, 'titulo', e.titulo, 'objetivo', e.objetivo, 'texto', e.texto,
    'pilares', e.pilares, 'metas', e.metas, 'datas', e.datas, 'publicado_em', e.publicado_em)
    order by e.mes desc), '[]'::jsonb)
  from public.estrategias_mensais e
  where e.cliente_id = public.cliente_do_token(p_token) and e.publicado
$$;

create or replace function public.portal_kickoff(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'data_inicio', k.data_inicio, 'resumo', k.resumo, 'diagnostico', k.diagnostico,
    'pontos_fortes', k.pontos_fortes, 'oportunidades', k.oportunidades,
    'metricas', k.metricas, 'prints', k.prints, 'publicado_em', k.publicado_em)
  from public.kickoffs k
  where k.cliente_id = public.cliente_do_token(p_token) and k.publicado
$$;

-- o menu do portal só mostra Estratégia e Kick-off quando há algo publicado
create or replace function public.portal_dados(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', c.nome, 'instagram', c.instagram, 'nicho', c.nicho,
    'cor_destaque', c.cor_destaque, 'recado', c.recado_portal,
    'objetivo', c.objetivo, 'suporte', c.suporte,
    'tem_estrategia', exists (select 1 from public.estrategias_mensais e where e.cliente_id = c.id and e.publicado),
    'tem_kickoff', exists (select 1 from public.kickoffs k where k.cliente_id = c.id and k.publicado))
  from public.clientes c
  where c.id = public.cliente_do_token(p_token)
$$;

do $$
declare f text;
begin
  foreach f in array array['portal_estrategias(text)', 'portal_kickoff(text)', 'portal_dados(text)'] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end;
$$;
