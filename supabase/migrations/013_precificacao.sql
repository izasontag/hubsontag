-- Calculadora de precificação (só a dona): orçamentos salvos e a configuração do valor da hora.
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

create table public.precificacao_config (
  id integer primary key default 1 check (id = 1),
  renda_desejada numeric(12, 2) not null default 0 check (renda_desejada >= 0),   -- quanto quer ganhar por mês
  custos_fixos numeric(12, 2) not null default 0 check (custos_fixos >= 0),       -- ferramentas, internet, contador...
  dias_mes numeric(4, 1) not null default 20 check (dias_mes between 1 and 31),
  horas_dia numeric(4, 1) not null default 8 check (horas_dia between 1 and 24),
  pct_faturavel numeric(5, 2) not null default 60 check (pct_faturavel between 1 and 100), -- parte do tempo que vira trabalho pago
  valor_hora numeric(12, 2) not null default 0 check (valor_hora >= 0),            -- hora que a dona decidiu usar
  imposto_pct numeric(5, 2) not null default 6 check (imposto_pct between 0 and 60),
  lucro_pct numeric(5, 2) not null default 25 check (lucro_pct between 0 and 80),
  adicional_pct numeric(5, 2) not null default 20 check (adicional_pct between 0 and 300), -- fim de semana, feriado ou urgência
  custo_km numeric(6, 2) not null default 1.5 check (custo_km >= 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (imposto_pct + lucro_pct < 100)
);
create trigger atualizar_timestamp before update on public.precificacao_config
  for each row execute function public.atualizar_timestamp();

create table public.orcamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 1 and 120),
  tipo text not null default 'evento' check (tipo in ('evento', 'mensal', 'avulso')),
  cliente_id uuid references public.clientes (id) on delete set null,
  evento_id uuid references public.eventos (id) on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'fechado', 'perdido')),
  dados jsonb not null default '{}'::jsonb check (jsonb_typeof(dados) = 'object'), -- linhas de tempo, custos e percentuais
  horas_total numeric(8, 2) not null default 0,
  preco_sugerido numeric(12, 2) not null default 0,
  preco_final numeric(12, 2) not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.orcamentos (atualizado_em desc);
create trigger atualizar_timestamp before update on public.orcamentos
  for each row execute function public.atualizar_timestamp();

alter table public.precificacao_config enable row level security;
alter table public.orcamentos enable row level security;
-- só a dona: a equipe nunca vê valores nem orçamentos
create policy precificacao_config_dona on public.precificacao_config for all to authenticated
  using (public.eh_dona()) with check (public.eh_dona());
create policy orcamentos_dona on public.orcamentos for all to authenticated
  using (public.eh_dona()) with check (public.eh_dona());
