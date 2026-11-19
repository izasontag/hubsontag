-- Gastos fixos do mês (pessoal e da agência): checklist de pago / não pago, recorrentes ou parcelados.
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

-- O gasto em si: "Aluguel", "Internet", "Celular parcelado em 10x"...
create table public.gastos_fixos (
  id uuid primary key default gen_random_uuid(),
  area text not null default 'pessoal' check (area in ('pessoal', 'agencia')),
  nome text not null check (char_length(btrim(nome)) between 1 and 120),
  categoria text not null default 'outros',
  valor numeric(12, 2) not null check (valor >= 0),
  dia_vencimento integer not null default 1 check (dia_vencimento between 1 and 31),
  mes_inicio date not null check (extract(day from mes_inicio) = 1), -- primeiro dia do mês da 1ª cobrança
  parcelas_total integer check (parcelas_total is null or parcelas_total between 2 and 120), -- vazio = todo mês, sem fim
  ativo boolean not null default true,
  observacao text check (observacao is null or char_length(observacao) <= 500),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.gastos_fixos (area, ativo);

-- O que vence em cada mês (um por gasto e por mês): é a linha do checklist
create table public.gastos_fixos_mes (
  id uuid primary key default gen_random_uuid(),
  gasto_id uuid not null references public.gastos_fixos (id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  valor numeric(12, 2) not null check (valor >= 0), -- pode mudar no mês (conta de luz varia)
  vencimento date not null,
  parcela_numero integer,
  status text not null default 'a_pagar' check (status in ('a_pagar', 'pago')),
  pago_em date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (gasto_id, mes),
  check (status <> 'pago' or pago_em is not null)
);
create index on public.gastos_fixos_mes (mes);

create trigger atualizar_timestamp before update on public.gastos_fixos
  for each row execute function public.atualizar_timestamp();
create trigger atualizar_timestamp before update on public.gastos_fixos_mes
  for each row execute function public.atualizar_timestamp();

alter table public.gastos_fixos enable row level security;
alter table public.gastos_fixos_mes enable row level security;
-- só a dona
create policy gastos_fixos_dona on public.gastos_fixos for all to authenticated
  using (public.eh_dona()) with check (public.eh_dona());
create policy gastos_fixos_mes_dona on public.gastos_fixos_mes for all to authenticated
  using (public.eh_dona()) with check (public.eh_dona());

-- Cria as linhas do mês que ainda não existem (sem duplicar) para os gastos ativos da área.
-- Parcelado: só até a última parcela. Dia 31 em mês curto vira o último dia do mês.
-- Roda com as permissões de quem chamou (a segurança das tabelas continua valendo).
create or replace function public.gerar_gastos_fixos(p_area text, p_mes date)
returns integer language plpgsql security invoker set search_path = public as $$
declare
  m date := date_trunc('month', p_mes)::date;
  g record;
  n integer := 0;
  indice integer;
  ultimo integer;
begin
  if p_area not in ('pessoal', 'agencia') then raise exception 'area_invalida'; end if;
  ultimo := extract(day from (m + interval '1 month' - interval '1 day'))::integer;
  for g in select * from public.gastos_fixos where area = p_area and ativo and mes_inicio <= m loop
    indice := (extract(year from m) * 12 + extract(month from m) - extract(year from g.mes_inicio) * 12 - extract(month from g.mes_inicio))::integer + 1;
    if g.parcelas_total is not null and indice > g.parcelas_total then continue; end if;
    insert into public.gastos_fixos_mes (gasto_id, mes, valor, vencimento, parcela_numero)
    values (g.id, m, g.valor, m + (least(g.dia_vencimento, ultimo) - 1), case when g.parcelas_total is null then null else indice end)
    on conflict (gasto_id, mes) do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end;
$$;
revoke all on function public.gerar_gastos_fixos(text, date) from public, anon;
grant execute on function public.gerar_gastos_fixos(text, date) to authenticated;
