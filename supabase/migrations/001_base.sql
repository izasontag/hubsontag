-- Fase 1: base interna (perfis, clientes, manual da marca, metas, acessos, histórico)
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

-- Atualiza "atualizado_em" sozinho a cada edição
create or replace function public.atualizar_timestamp()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  papel text not null check (papel in ('dona', 'equipe')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  -- código longo e aleatório do link secreto do portal (64 caracteres)
  token_portal text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  portal_ativo boolean not null default true,
  instagram text,
  nicho text,
  contato text,
  status text not null default 'ativo' check (status in ('ativo', 'pausado', 'encerrado')),
  data_inicio date,
  cor_destaque text not null default '#5C6B47',
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.equipe_clientes (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (perfil_id, cliente_id)
);

create table public.manual_marca (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null unique references public.clientes (id) on delete cascade,
  essencia text,
  posicionamento text,
  publico text,
  estrategia text,
  tom_voz text,
  identidade_visual text,
  regras text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.metas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  nome text not null,
  valor_atual numeric not null default 0,
  valor_meta numeric not null default 0,
  prazo date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.acessos_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  servico text not null,
  link text,
  observacao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.historico_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  data date not null default current_date,
  tipo text not null check (tipo in ('reuniao', 'decisao', 'feedback')),
  texto text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index on public.equipe_clientes (perfil_id);
create index on public.equipe_clientes (cliente_id);
create index on public.metas (cliente_id);
create index on public.acessos_cliente (cliente_id);
create index on public.historico_cliente (cliente_id, data desc);

-- "atualizado_em" automático em todas as tabelas
do $$
declare t text;
begin
  foreach t in array array[
    'perfis', 'clientes', 'equipe_clientes', 'manual_marca',
    'metas', 'acessos_cliente', 'historico_cliente'
  ] loop
    execute format(
      'create trigger atualizar_timestamp before update on public.%I
       for each row execute function public.atualizar_timestamp()', t);
  end loop;
end;
$$;

-- Todo cliente novo já nasce com o manual da marca criado (vazio)
create or replace function public.criar_manual_do_cliente()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.manual_marca (cliente_id) values (new.id);
  return new;
end;
$$;

create trigger criar_manual_do_cliente after insert on public.clientes
  for each row execute function public.criar_manual_do_cliente();

-- ---------------------------------------------------------------
-- Funções de apoio para as regras de segurança
-- ---------------------------------------------------------------

create or replace function public.eh_dona()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'dona' from public.perfis where id = auth.uid()), false)
$$;

create or replace function public.pode_ver_cliente(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.eh_dona() or exists (
    select 1 from public.equipe_clientes
    where perfil_id = auth.uid() and cliente_id = cid
  )
$$;

revoke execute on function public.eh_dona() from public, anon;
revoke execute on function public.pode_ver_cliente(uuid) from public, anon;
grant execute on function public.eh_dona() to authenticated;
grant execute on function public.pode_ver_cliente(uuid) to authenticated;

-- ---------------------------------------------------------------
-- Segurança (RLS): nenhuma tabela fica aberta
-- ---------------------------------------------------------------

alter table public.perfis enable row level security;
alter table public.clientes enable row level security;
alter table public.equipe_clientes enable row level security;
alter table public.manual_marca enable row level security;
alter table public.metas enable row level security;
alter table public.acessos_cliente enable row level security;
alter table public.historico_cliente enable row level security;

-- perfis: cada pessoa vê o próprio; a dona vê e gerencia todos
create policy perfis_ler on public.perfis for select to authenticated
  using (id = auth.uid() or public.eh_dona());
create policy perfis_dona_inserir on public.perfis for insert to authenticated
  with check (public.eh_dona());
create policy perfis_dona_editar on public.perfis for update to authenticated
  using (public.eh_dona()) with check (public.eh_dona());
create policy perfis_dona_apagar on public.perfis for delete to authenticated
  using (public.eh_dona());

-- clientes: dona gerencia; equipe só lê os clientes que atende
create policy clientes_ler on public.clientes for select to authenticated
  using (public.pode_ver_cliente(id));
create policy clientes_dona_inserir on public.clientes for insert to authenticated
  with check (public.eh_dona());
create policy clientes_dona_editar on public.clientes for update to authenticated
  using (public.eh_dona()) with check (public.eh_dona());
create policy clientes_dona_apagar on public.clientes for delete to authenticated
  using (public.eh_dona());

-- equipe_clientes: dona gerencia; equipe vê as próprias linhas
create policy equipe_clientes_ler on public.equipe_clientes for select to authenticated
  using (perfil_id = auth.uid() or public.eh_dona());
create policy equipe_clientes_dona_inserir on public.equipe_clientes for insert to authenticated
  with check (public.eh_dona());
create policy equipe_clientes_dona_editar on public.equipe_clientes for update to authenticated
  using (public.eh_dona()) with check (public.eh_dona());
create policy equipe_clientes_dona_apagar on public.equipe_clientes for delete to authenticated
  using (public.eh_dona());

-- manual_marca, metas e historico_cliente: dona e equipe do cliente leem e editam; só a dona apaga
do $$
declare t text;
begin
  foreach t in array array['manual_marca', 'metas', 'historico_cliente'] loop
    execute format(
      'create policy %1$s_ler on public.%1$s for select to authenticated
         using (public.pode_ver_cliente(cliente_id))', t);
    execute format(
      'create policy %1$s_inserir on public.%1$s for insert to authenticated
         with check (public.pode_ver_cliente(cliente_id))', t);
    execute format(
      'create policy %1$s_editar on public.%1$s for update to authenticated
         using (public.pode_ver_cliente(cliente_id))
         with check (public.pode_ver_cliente(cliente_id))', t);
    execute format(
      'create policy %1$s_dona_apagar on public.%1$s for delete to authenticated
         using (public.eh_dona())', t);
  end loop;
end;
$$;

-- acessos_cliente: SÓ a dona (equipe nunca vê)
create policy acessos_cliente_dona on public.acessos_cliente for all to authenticated
  using (public.eh_dona()) with check (public.eh_dona());
