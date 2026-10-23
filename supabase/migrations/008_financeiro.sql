-- Fase 4: financeiro da agência e financeiro pessoal. TUDO só para a dona.
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

-- ---------------------------------------------------------------
-- Financeiro da agência
-- ---------------------------------------------------------------

create table public.contratos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  plano text not null,
  posts_mes integer not null default 0 check (posts_mes >= 0),
  reels_mes integer not null default 0 check (reels_mes >= 0),
  stories_mes integer not null default 0 check (stories_mes >= 0),
  valor_mensal numeric(12, 2) not null check (valor_mensal >= 0),
  dia_vencimento integer not null default 10 check (dia_vencimento between 1 and 31),
  inicio date not null default current_date,
  renovacao date,
  status text not null default 'ativo' check (status in ('ativo', 'encerrado')),
  arquivo_storage text, -- contrato assinado, no bucket privado "contratos"
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.contratos (cliente_id);

create table public.projetos_avulsos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes (id) on delete set null,
  nome text not null,
  valor numeric(12, 2) not null check (valor >= 0),
  status text not null default 'proposta'
    check (status in ('proposta', 'em_andamento', 'concluido', 'cancelado')),
  data date not null default current_date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.cobrancas (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid references public.contratos (id) on delete cascade,
  projeto_id uuid references public.projetos_avulsos (id) on delete cascade,
  cliente_id uuid references public.clientes (id) on delete set null,
  descricao text not null,
  vencimento date not null,
  valor numeric(12, 2) not null check (valor >= 0),
  forma_pagamento text check (forma_pagamento in ('pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro')),
  status text not null default 'a_vencer' check (status in ('a_vencer', 'pago', 'atrasado')),
  pago_em date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (not (contrato_id is not null and projeto_id is not null)),
  check (status <> 'pago' or pago_em is not null)
);
create unique index cobrancas_contrato_vencimento on public.cobrancas (contrato_id, vencimento)
  where contrato_id is not null;
create index on public.cobrancas (vencimento);
create index on public.cobrancas (status, vencimento);
create index on public.cobrancas (pago_em);

create table public.despesas (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  categoria text not null default 'outros'
    check (categoria in ('ferramentas', 'freelancers', 'impostos', 'cursos', 'outros')),
  descricao text not null,
  valor numeric(12, 2) not null check (valor >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.despesas (data);

-- ---------------------------------------------------------------
-- Financeiro pessoal
-- ---------------------------------------------------------------

create table public.financas_pessoais (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  tipo text not null check (tipo in ('entrada', 'saida')),
  categoria text not null default 'outros',
  descricao text not null,
  valor numeric(12, 2) not null check (valor >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.financas_pessoais (data);

create table public.metas_pessoais (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor_meta numeric(12, 2) not null check (valor_meta >= 0),
  valor_atual numeric(12, 2) not null default 0 check (valor_atual >= 0),
  prazo date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array[
    'contratos', 'projetos_avulsos', 'cobrancas', 'despesas', 'financas_pessoais', 'metas_pessoais'
  ] loop
    execute format(
      'create trigger atualizar_timestamp before update on public.%I
       for each row execute function public.atualizar_timestamp()', t);
    execute format('alter table public.%I enable row level security', t);
    -- só a dona: equipe e visitantes não leem, não criam, não editam, não apagam
    execute format(
      'create policy %1$s_dona on public.%1$s for all to authenticated
         using (public.eh_dona()) with check (public.eh_dona())', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------
-- Funções (rodam com as permissões de quem chamou: para quem não é a dona, não fazem nada)
-- ---------------------------------------------------------------

-- Cobranças em aberto cujo vencimento já passou viram "atrasado"
create or replace function public.marcar_atrasadas()
returns integer language plpgsql security invoker set search_path = public as $$
declare n integer;
begin
  update public.cobrancas set status = 'atrasado'
  where status = 'a_vencer' and vencimento < current_date;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Cria as mensalidades de um contrato: uma por mês, a partir do mês atual, no dia de vencimento.
-- Não duplica (rodar de novo só cria as que faltam) e ignora datas que já passaram.
create or replace function public.gerar_cobrancas(p_contrato uuid, p_meses integer default 12)
returns integer language plpgsql security invoker set search_path = public as $$
declare
  c record;
  primeiro date;
  mes date;
  ultimo_dia integer;
  venc date;
  n integer := 0;
begin
  select * into c from public.contratos where id = p_contrato;
  if not found then raise exception 'contrato_inexistente'; end if;
  if p_meses < 1 or p_meses > 36 then raise exception 'meses_invalidos'; end if;

  primeiro := date_trunc('month', greatest(c.inicio, current_date))::date;
  for i in 0 .. p_meses - 1 loop
    mes := (primeiro + make_interval(months => i))::date;
    ultimo_dia := extract(day from (mes + interval '1 month - 1 day'))::integer;
    venc := mes + (least(c.dia_vencimento, ultimo_dia) - 1);
    if venc < current_date or (c.renovacao is not null and venc > c.renovacao) then continue; end if;
    insert into public.cobrancas (contrato_id, cliente_id, descricao, vencimento, valor)
    values (c.id, c.cliente_id, 'Mensalidade ' || to_char(venc, 'MM/YYYY'), venc, c.valor_mensal)
    on conflict (contrato_id, vencimento) where contrato_id is not null do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end;
$$;

revoke all on function public.marcar_atrasadas() from public, anon;
revoke all on function public.gerar_cobrancas(uuid, integer) from public, anon;
grant execute on function public.marcar_atrasadas() to authenticated;
grant execute on function public.gerar_cobrancas(uuid, integer) to authenticated;

-- ---------------------------------------------------------------
-- Contratos assinados: bucket PRIVADO "contratos", só a dona
-- ---------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('contratos', 'contratos', false, 52428800)
on conflict (id) do nothing;

create policy contratos_arquivos_dona on storage.objects for all to authenticated
  using (bucket_id = 'contratos' and public.eh_dona())
  with check (bucket_id = 'contratos' and public.eh_dona());
