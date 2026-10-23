-- Fase 3B + 5: eventos e casamentos, equipe, relatórios únicos por mês, e itens do painel
-- (atalhos da agenda e do Pinterest, versículos próprios).
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

-- ---------------------------------------------------------------
-- Eventos e casamentos (clientes próprios, separados da tabela "clientes")
-- ---------------------------------------------------------------

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null default 'casamento' check (tipo in ('casamento', 'evento')),
  data_evento date not null,
  horario time,
  local text,
  contato text,
  status text not null default 'em_negociacao'
    check (status in ('em_negociacao', 'contrato_assinado', 'em_andamento', 'realizado', 'entregue', 'cancelado')),
  contrato_storage text, -- contrato no bucket privado "eventos"
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.eventos (data_evento);

create table public.equipe_eventos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references public.perfis (id) on delete cascade,
  evento_id uuid not null references public.eventos (id) on delete cascade,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (perfil_id, evento_id)
);
create index on public.equipe_eventos (evento_id);

create table public.evento_checklist (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  titulo text not null,
  concluido boolean not null default false,
  concluido_em timestamptz,
  prazo date,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.evento_checklist (evento_id, ordem);

-- Parcelas e vencimentos: SÓ a dona (a equipe nunca vê valores)
create table public.evento_parcelas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  descricao text not null,
  vencimento date not null,
  valor numeric(12, 2) not null check (valor >= 0),
  forma_pagamento text check (forma_pagamento in ('pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro')),
  status text not null default 'a_vencer' check (status in ('a_vencer', 'pago', 'atrasado')),
  pago_em date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (status <> 'pago' or pago_em is not null)
);
create index on public.evento_parcelas (evento_id);
create index on public.evento_parcelas (vencimento);
create index on public.evento_parcelas (pago_em);

-- Todo evento novo nasce com o checklist padrão (editável). Os prazos seguem a data do evento.
create or replace function public.criar_checklist_padrao()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.evento_checklist (evento_id, titulo, prazo, ordem)
  select new.id, t.titulo, case when t.dias is null then null else new.data_evento + t.dias end, t.ordem
  from (values
    (1, 'Assinatura do contrato', null::integer),
    (2, 'Pagamento da entrada', null),
    (3, 'Reunião de alinhamento', -45),
    (4, 'Questionário ou lista de momentos importantes', -30),
    (5, 'Visita ao local e cronograma do dia', -21),
    (6, 'Confirmação final com os clientes', -7),
    (7, 'Cobertura do evento', 0),
    (8, 'Entrega prévia', 7),
    (9, 'Entrega final', 30),
    (10, 'Pagamento do saldo', null)
  ) as t(ordem, titulo, dias);
  return new;
end;
$$;
create trigger criar_checklist_padrao after insert on public.eventos
  for each row execute function public.criar_checklist_padrao();

create or replace function public.marcar_conclusao_checklist()
returns trigger language plpgsql as $$
begin
  if new.concluido then
    if tg_op = 'INSERT' or old.concluido is distinct from true then new.concluido_em := now(); end if;
  else
    new.concluido_em := null;
  end if;
  return new;
end;
$$;
create trigger marcar_conclusao before insert or update on public.evento_checklist
  for each row execute function public.marcar_conclusao_checklist();

create or replace function public.pode_ver_evento(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.eh_dona() or exists (
    select 1 from public.equipe_eventos where perfil_id = auth.uid() and evento_id = eid
  )
$$;
revoke execute on function public.pode_ver_evento(uuid) from public, anon;
grant execute on function public.pode_ver_evento(uuid) to authenticated;

-- ---------------------------------------------------------------
-- Painel: atalhos (agenda e Pinterest) e versículos próprios. Só a dona.
-- ---------------------------------------------------------------

create table public.atalhos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('agenda', 'pinterest_quadro', 'pinterest_pin')),
  titulo text not null,
  url text not null,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- só endereços dos sites certos (o painel monta o player a partir deles)
  check (
    (tipo = 'agenda' and url ~* '^https://calendar\.google\.com/calendar/')
    or (tipo = 'pinterest_quadro' and url ~* '^https://([a-z0-9-]+\.)?pinterest\.[a-z.]+/')
    or (tipo = 'pinterest_pin' and url ~* '^https://([a-z0-9-]+\.)?pinterest\.[a-z.]+/pin/[0-9]+')
  )
);

create table public.versiculos (
  id uuid primary key default gen_random_uuid(),
  referencia text not null,
  texto text not null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- um relatório por cliente e por mês
create unique index relatorios_cliente_mes on public.relatorios (cliente_id, mes);

do $$
declare t text;
begin
  foreach t in array array['eventos', 'equipe_eventos', 'evento_checklist', 'evento_parcelas', 'atalhos', 'versiculos'] loop
    execute format(
      'create trigger atualizar_timestamp before update on public.%I
       for each row execute function public.atualizar_timestamp()', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------
-- Segurança (RLS)
-- ---------------------------------------------------------------

-- eventos: dona faz tudo; equipe lê e edita só os atribuídos; só a dona cria e apaga
create policy eventos_ler on public.eventos for select to authenticated using (public.pode_ver_evento(id));
create policy eventos_inserir on public.eventos for insert to authenticated with check (public.eh_dona());
create policy eventos_editar on public.eventos for update to authenticated
  using (public.pode_ver_evento(id)) with check (public.pode_ver_evento(id));
create policy eventos_apagar on public.eventos for delete to authenticated using (public.eh_dona());

create policy evento_checklist_tudo on public.evento_checklist for all to authenticated
  using (public.pode_ver_evento(evento_id)) with check (public.pode_ver_evento(evento_id));

create policy evento_parcelas_dona on public.evento_parcelas for all to authenticated
  using (public.eh_dona()) with check (public.eh_dona());

create policy equipe_eventos_ler on public.equipe_eventos for select to authenticated
  using (perfil_id = auth.uid() or public.eh_dona());
create policy equipe_eventos_dona on public.equipe_eventos for all to authenticated
  using (public.eh_dona()) with check (public.eh_dona());

create policy atalhos_dona on public.atalhos for all to authenticated
  using (public.eh_dona()) with check (public.eh_dona());
create policy versiculos_dona on public.versiculos for all to authenticated
  using (public.eh_dona()) with check (public.eh_dona());

-- Arquivos dos eventos (bucket PRIVADO "eventos"; caminho: <id do evento>/<arquivo>)
insert into storage.buckets (id, name, public, file_size_limit)
values ('eventos', 'eventos', false, 52428800)
on conflict (id) do nothing;

create policy eventos_arquivos_ler on storage.objects for select to authenticated
  using (bucket_id = 'eventos' and public.pode_ver_evento(((storage.foldername(name))[1])::uuid));
create policy eventos_arquivos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'eventos' and public.pode_ver_evento(((storage.foldername(name))[1])::uuid));
create policy eventos_arquivos_editar on storage.objects for update to authenticated
  using (bucket_id = 'eventos' and public.pode_ver_evento(((storage.foldername(name))[1])::uuid));
create policy eventos_arquivos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'eventos' and public.pode_ver_evento(((storage.foldername(name))[1])::uuid));

-- ---------------------------------------------------------------
-- Funções
-- ---------------------------------------------------------------

-- As parcelas dos eventos também viram "atrasado" quando vencem sem pagamento
create or replace function public.marcar_atrasadas()
returns integer language plpgsql security invoker set search_path = public as $$
declare n integer; m integer;
begin
  update public.cobrancas set status = 'atrasado' where status = 'a_vencer' and vencimento < current_date;
  get diagnostics n = row_count;
  update public.evento_parcelas set status = 'atrasado' where status = 'a_vencer' and vencimento < current_date;
  get diagnostics m = row_count;
  return n + m;
end;
$$;

-- A dona libera o acesso de uma pessoa da equipe. O login em si é criado antes, no painel do
-- Supabase (Authentication > Users > Add user); esta função só vincula o login ao papel "equipe".
create or replace function public.liberar_equipe(p_email text, p_nome text)
returns uuid language plpgsql security definer set search_path = public, auth as $$
declare uid uuid;
begin
  if not public.eh_dona() then raise exception 'somente_dona'; end if;
  if btrim(coalesce(p_nome, '')) = '' then raise exception 'nome_obrigatorio'; end if;
  select id into uid from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
  if uid is null then raise exception 'usuario_nao_encontrado'; end if;
  insert into public.perfis (id, nome, email, papel)
  values (uid, btrim(p_nome), lower(btrim(p_email)), 'equipe')
  on conflict (id) do update set nome = excluded.nome where public.perfis.papel = 'equipe';
  return uid;
end;
$$;
revoke all on function public.liberar_equipe(text, text) from public, anon;
grant execute on function public.liberar_equipe(text, text) to authenticated;
