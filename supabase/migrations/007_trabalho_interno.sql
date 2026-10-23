-- Prompts e skills, banco de ideias (com arquivos), plano de ação / tarefas,
-- modelos de checklist, e campos novos da ficha e do manual (do Notion da Sontag).
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

-- ---------------------------------------------------------------
-- Campos novos
-- ---------------------------------------------------------------

alter table public.clientes add column objetivo text;  -- objetivo do cliente, em uma frase
alter table public.clientes add column suporte text;   -- horário de suporte e WhatsApp

alter table public.manual_marca add column diagnostico text;
alter table public.manual_marca add column como_trabalhamos text;

-- Função de apoio: a pessoa logada tem perfil (dona ou equipe)
create or replace function public.eh_da_casa()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.perfis where id = auth.uid())
$$;
revoke execute on function public.eh_da_casa() from public, anon;
grant execute on function public.eh_da_casa() to authenticated;

-- ---------------------------------------------------------------
-- Prompts e skills (só área interna; o cliente nunca vê)
-- cliente_id vazio = biblioteca geral, vale para todos os clientes
-- ---------------------------------------------------------------

create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes (id) on delete cascade,
  categoria text not null default 'design' check (categoria in ('design', 'video', 'legenda', 'outro')),
  titulo text not null,
  ferramenta text,
  texto text not null,
  notas text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.prompts (cliente_id, categoria);

-- ---------------------------------------------------------------
-- Banco de ideias
-- ---------------------------------------------------------------

create table public.ideias (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  tipo text not null default 'ideia_post'
    check (tipo in ('ideia_post', 'referencia_visual', 'filme', 'livro', 'trend', 'formato_funcionou')),
  cliente_id uuid references public.clientes (id) on delete cascade, -- vazio = geral
  para_sontag boolean not null default false, -- ideia da própria agência: só a dona vê
  tags text[] not null default '{}',
  fonte text,
  post_id uuid references public.posts (id) on delete set null, -- post que nasceu desta ideia
  criado_por uuid default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.ideias (cliente_id, criado_em desc);

create table public.ideia_arquivos (
  id uuid primary key default gen_random_uuid(),
  ideia_id uuid not null references public.ideias (id) on delete cascade,
  caminho_storage text not null,
  nome text not null,
  tipo text not null default 'arquivo' check (tipo in ('imagem', 'video', 'arquivo')),
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.ideia_arquivos (ideia_id, ordem);

create or replace function public.pode_ver_ideia(iid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.ideias i
    where i.id = iid
      and (public.eh_dona()
           or (public.eh_da_casa() and not i.para_sontag
               and (i.cliente_id is null or public.pode_ver_cliente(i.cliente_id))))
  )
$$;
revoke execute on function public.pode_ver_ideia(uuid) from public, anon;
grant execute on function public.pode_ver_ideia(uuid) to authenticated;

-- ---------------------------------------------------------------
-- Tarefas / plano de ação (cliente_id vazio = tarefa geral da agência, só a dona)
-- ---------------------------------------------------------------

create table public.tarefas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes (id) on delete cascade,
  titulo text not null,
  data date,
  tipo text not null default 'tarefa' check (tipo in ('tarefa', 'reuniao', 'captacao', 'entrega')),
  status text not null default 'fazer' check (status in ('fazer', 'fazendo', 'feito')),
  responsavel text not null default 'agencia' check (responsavel in ('agencia', 'cliente')),
  visivel_cliente boolean not null default false,
  material text check (material is null or material ~* '^https?://'),
  concluido_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (not visivel_cliente or cliente_id is not null)
);
create index on public.tarefas (cliente_id, status, data);

create or replace function public.marcar_conclusao()
returns trigger language plpgsql as $$
begin
  if new.status = 'feito' then
    if tg_op = 'INSERT' or old.status is distinct from 'feito' then new.concluido_em := now(); end if;
  else
    new.concluido_em := null;
  end if;
  return new;
end;
$$;
create trigger marcar_conclusao before insert or update on public.tarefas
  for each row execute function public.marcar_conclusao();

-- ---------------------------------------------------------------
-- Modelos de checklist (como a Central de Processos)
-- itens: [{"titulo": "...", "dias": 3, "tipo": "tarefa", "responsavel": "agencia", "visivel_cliente": false}]
-- ---------------------------------------------------------------

create table public.modelos_checklist (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  itens jsonb not null default '[]'::jsonb check (jsonb_typeof(itens) = 'array'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['prompts', 'ideias', 'ideia_arquivos', 'tarefas', 'modelos_checklist'] loop
    execute format(
      'create trigger atualizar_timestamp before update on public.%I
       for each row execute function public.atualizar_timestamp()', t);
  end loop;
end;
$$;

-- Aplica um modelo em um cliente: cria uma tarefa por item, com a data = data base + dias.
-- Roda com as permissões de quem chamou (a segurança das tabelas continua valendo).
create or replace function public.aplicar_modelo(p_modelo uuid, p_cliente uuid, p_base date default current_date)
returns integer language plpgsql security invoker set search_path = public as $$
declare
  m record;
  item jsonb;
  n integer := 0;
begin
  select * into m from public.modelos_checklist where id = p_modelo;
  if not found then raise exception 'modelo_inexistente'; end if;
  for item in select * from jsonb_array_elements(m.itens) loop
    if coalesce(btrim(item->>'titulo'), '') = '' then continue; end if;
    insert into public.tarefas (cliente_id, titulo, data, tipo, responsavel, visivel_cliente)
    values (
      p_cliente,
      btrim(item->>'titulo'),
      p_base + coalesce((item->>'dias')::integer, 0),
      coalesce(item->>'tipo', 'tarefa'),
      coalesce(item->>'responsavel', 'agencia'),
      p_cliente is not null and coalesce((item->>'visivel_cliente')::boolean, false)
    );
    n := n + 1;
  end loop;
  return n;
end;
$$;
revoke all on function public.aplicar_modelo(uuid, uuid, date) from public, anon;
grant execute on function public.aplicar_modelo(uuid, uuid, date) to authenticated;

insert into public.modelos_checklist (nome, descricao, itens) values
('Onboarding de cliente', 'Primeiras semanas de um cliente novo de social media.', '[
  {"titulo": "Reunião de onboarding", "dias": 0, "tipo": "reuniao", "visivel_cliente": true},
  {"titulo": "Enviar acessos e materiais da marca", "dias": 3, "tipo": "tarefa", "responsavel": "cliente", "visivel_cliente": true},
  {"titulo": "Preencher o manual da marca", "dias": 7, "tipo": "tarefa"},
  {"titulo": "Diagnóstico do perfil", "dias": 7, "tipo": "tarefa"},
  {"titulo": "Captação de conteúdo", "dias": 10, "tipo": "captacao", "visivel_cliente": true},
  {"titulo": "Calendário estratégico do primeiro mês", "dias": 10, "tipo": "entrega", "visivel_cliente": true},
  {"titulo": "Primeira rodada de aprovação", "dias": 14, "tipo": "entrega", "visivel_cliente": true},
  {"titulo": "Reunião de alinhamento", "dias": 30, "tipo": "reuniao", "visivel_cliente": true}
]'::jsonb),
('Rodada quinzenal', 'Rotina de cada quinzena de aprovação.', '[
  {"titulo": "Montar a rodada de posts", "dias": 0, "tipo": "tarefa"},
  {"titulo": "Enviar a rodada ao cliente", "dias": 3, "tipo": "entrega", "visivel_cliente": true},
  {"titulo": "Cobrar a aprovação", "dias": 6, "tipo": "tarefa"},
  {"titulo": "Aplicar os ajustes pedidos", "dias": 8, "tipo": "tarefa"},
  {"titulo": "Agendar os posts aprovados", "dias": 10, "tipo": "tarefa"}
]'::jsonb);

-- ---------------------------------------------------------------
-- Segurança (RLS)
-- ---------------------------------------------------------------

alter table public.prompts enable row level security;
alter table public.ideias enable row level security;
alter table public.ideia_arquivos enable row level security;
alter table public.tarefas enable row level security;
alter table public.modelos_checklist enable row level security;

-- prompts: dona e equipe leem os gerais e os dos seus clientes; só a dona edita os gerais
create policy prompts_ler on public.prompts for select to authenticated
  using (public.eh_da_casa() and (cliente_id is null or public.pode_ver_cliente(cliente_id)));
create policy prompts_inserir on public.prompts for insert to authenticated
  with check ((cliente_id is null and public.eh_dona())
              or (cliente_id is not null and public.pode_ver_cliente(cliente_id)));
create policy prompts_editar on public.prompts for update to authenticated
  using ((cliente_id is null and public.eh_dona())
         or (cliente_id is not null and public.pode_ver_cliente(cliente_id)))
  with check ((cliente_id is null and public.eh_dona())
              or (cliente_id is not null and public.pode_ver_cliente(cliente_id)));
create policy prompts_apagar on public.prompts for delete to authenticated
  using ((cliente_id is null and public.eh_dona())
         or (cliente_id is not null and public.pode_ver_cliente(cliente_id)));

-- ideias: a dona vê tudo; a equipe vê as gerais e as dos seus clientes, nunca as "para a Sontag"
create policy ideias_ler on public.ideias for select to authenticated
  using (public.eh_dona()
         or (public.eh_da_casa() and not para_sontag
             and (cliente_id is null or public.pode_ver_cliente(cliente_id))));
create policy ideias_inserir on public.ideias for insert to authenticated
  with check (public.eh_dona()
              or (public.eh_da_casa() and not para_sontag
                  and (cliente_id is null or public.pode_ver_cliente(cliente_id))));
create policy ideias_editar on public.ideias for update to authenticated
  using (public.eh_dona()
         or (public.eh_da_casa() and not para_sontag
             and (cliente_id is null or public.pode_ver_cliente(cliente_id))))
  with check (public.eh_dona()
              or (public.eh_da_casa() and not para_sontag
                  and (cliente_id is null or public.pode_ver_cliente(cliente_id))));
create policy ideias_apagar on public.ideias for delete to authenticated
  using (public.eh_dona() or criado_por = auth.uid());

create policy ideia_arquivos_tudo on public.ideia_arquivos for all to authenticated
  using (public.pode_ver_ideia(ideia_id)) with check (public.pode_ver_ideia(ideia_id));

-- tarefas: a dona vê tudo; a equipe só as dos clientes que atende (nunca as gerais)
create policy tarefas_tudo on public.tarefas for all to authenticated
  using (public.eh_dona() or (cliente_id is not null and public.pode_ver_cliente(cliente_id)))
  with check (public.eh_dona() or (cliente_id is not null and public.pode_ver_cliente(cliente_id)));

-- modelos: dona e equipe leem; só a dona cria e edita
create policy modelos_ler on public.modelos_checklist for select to authenticated
  using (public.eh_da_casa());
create policy modelos_dona on public.modelos_checklist for all to authenticated
  using (public.eh_dona()) with check (public.eh_dona());

-- ---------------------------------------------------------------
-- Arquivos das ideias (bucket PRIVADO "ideias"; caminho: <id da ideia>/<arquivo>)
-- ---------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('ideias', 'ideias', false, 52428800)
on conflict (id) do nothing;

create policy ideias_arquivos_ler on storage.objects for select to authenticated
  using (bucket_id = 'ideias' and public.pode_ver_ideia(((storage.foldername(name))[1])::uuid));
create policy ideias_arquivos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'ideias' and public.pode_ver_ideia(((storage.foldername(name))[1])::uuid));
create policy ideias_arquivos_editar on storage.objects for update to authenticated
  using (bucket_id = 'ideias' and public.pode_ver_ideia(((storage.foldername(name))[1])::uuid));
create policy ideias_arquivos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'ideias' and public.pode_ver_ideia(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------
-- Portal: objetivo e suporte no início, e o plano de ação (só leitura)
-- ---------------------------------------------------------------

create or replace function public.portal_dados(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', c.nome, 'instagram', c.instagram, 'nicho', c.nicho,
    'cor_destaque', c.cor_destaque, 'recado', c.recado_portal,
    'objetivo', c.objetivo, 'suporte', c.suporte)
  from public.clientes c
  where c.id = public.cliente_do_token(p_token)
$$;

create or replace function public.portal_tarefas(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'titulo', t.titulo, 'data', t.data, 'tipo', t.tipo, 'status', t.status,
    'responsavel', t.responsavel, 'material', t.material)
    order by (t.status = 'feito'), t.data nulls last, t.criado_em), '[]'::jsonb)
  from public.tarefas t
  where t.cliente_id = public.cliente_do_token(p_token) and t.visivel_cliente
$$;

revoke all on function public.portal_tarefas(text) from public;
grant execute on function public.portal_tarefas(text) to anon, authenticated;
