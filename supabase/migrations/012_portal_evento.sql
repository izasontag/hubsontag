-- Portal do cliente de cada evento (link secreto, sem login):
--  1) checklist de perguntas importantes do grande dia (o cliente responde);
--  2) acesso ao Instagram do cliente, CRIPTOGRAFADO no celular dele antes de chegar aqui.
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

-- ---------------------------------------------------------------
-- Link secreto de cada evento
-- ---------------------------------------------------------------
alter table public.eventos
  add column token_portal text not null unique
    default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  add column portal_ativo boolean not null default true,
  add column recado_portal text check (recado_portal is null or char_length(recado_portal) <= 1000);

-- ---------------------------------------------------------------
-- Perguntas e respostas
-- ---------------------------------------------------------------
create table public.evento_perguntas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.eventos (id) on delete cascade,
  secao text not null default 'Geral' check (char_length(btrim(secao)) between 1 and 80),
  pergunta text not null check (char_length(btrim(pergunta)) between 1 and 500),
  resposta text check (resposta is null or char_length(resposta) <= 4000),
  respondida_em timestamptz,
  ordem integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index on public.evento_perguntas (evento_id, ordem);
create trigger atualizar_timestamp before update on public.evento_perguntas
  for each row execute function public.atualizar_timestamp();

-- Perguntas padrão para cobertura de stories (a dona edita, apaga e acrescenta depois)
create or replace function public.criar_perguntas_padrao(p_evento uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.evento_perguntas (evento_id, secao, pergunta, ordem)
  select p_evento, t.secao, t.pergunta, t.ordem
  from (values
    (1,  'Sobre o evento', 'Quem são os protagonistas? Escreva os nomes do jeito que gostam de ser chamados.'),
    (2,  'Sobre o evento', 'Qual é o clima do evento? (romântico, divertido, clássico, intimista...)'),
    (3,  'Sobre o evento', 'Quantos convidados, mais ou menos?'),
    (4,  'Cronograma e locais', 'Qual o horário de cada momento? (chegada, cerimônia, recepção, jantar, pista, encerramento)'),
    (5,  'Cronograma e locais', 'Endereço dos locais e pontos de referência. Existe deslocamento entre eles?'),
    (6,  'Momentos que não podem faltar', 'Quais momentos precisam aparecer nos stories? (entrada, brinde, valsa, bolo, buquê, discursos...)'),
    (7,  'Momentos que não podem faltar', 'Existe alguma surpresa ou segredo que NÃO pode ser mostrado antes da hora?'),
    (8,  'Pessoas', 'Quais pessoas importantes não podem ficar de fora? Escreva o nome e quem é (família, padrinhos, amigos).'),
    (9,  'Pessoas', 'Alguém não quer ser filmado ou ter a imagem publicada?'),
    (10, 'Pessoas', 'Quem é a pessoa de contato no dia do evento? (nome e WhatsApp)'),
    (11, 'Instagram e divulgação', 'Qual é a hashtag do evento? Se ainda não tem, quer que a gente sugira?'),
    (12, 'Instagram e divulgação', 'Quais perfis (@) devemos marcar? (anfitriões, cerimonial, buffet, decoração, DJ ou banda, fotógrafo...)'),
    (13, 'Instagram e divulgação', 'Pode postar em tempo real durante o evento ou só depois? Existe algum horário em que não pode postar?'),
    (14, 'Instagram e divulgação', 'Tem alguma referência de stories ou perfis que você gosta e quer algo parecido?'),
    (15, 'Detalhes', 'Quais são as cores, a decoração e o traje (dress code)?'),
    (16, 'Detalhes', 'Músicas importantes ou que tocam em momentos especiais?'),
    (17, 'Detalhes', 'Mais alguma coisa que a gente precisa saber?')
  ) as t(ordem, secao, pergunta)
$$;
revoke all on function public.criar_perguntas_padrao(uuid) from public, anon, authenticated;

create or replace function public.criar_perguntas_do_evento()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.criar_perguntas_padrao(new.id);
  return new;
end;
$$;
create trigger criar_perguntas_padrao after insert on public.eventos
  for each row execute function public.criar_perguntas_do_evento();

-- eventos que já existem também ganham as perguntas
select public.criar_perguntas_padrao(e.id)
from public.eventos e
where not exists (select 1 from public.evento_perguntas p where p.evento_id = e.id);

-- ---------------------------------------------------------------
-- Cofre do Instagram
-- chave pública: guardada aqui (o portal usa para trancar a senha no celular do cliente)
-- chave privada: fica SÓ com a dona (arquivo/gerenciador de senhas); nunca vem para o banco
-- ---------------------------------------------------------------
create table public.cofre_config (
  id integer primary key default 1 check (id = 1),
  chave_publica text not null check (char_length(chave_publica) between 100 and 2000),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger atualizar_timestamp before update on public.cofre_config
  for each row execute function public.atualizar_timestamp();

create table public.evento_acessos (
  evento_id uuid primary key references public.eventos (id) on delete cascade,
  usuario text not null check (char_length(btrim(usuario)) between 1 and 80),
  senha_cifrada text not null check (char_length(senha_cifrada) between 20 and 2000),
  observacao text check (observacao is null or char_length(observacao) <= 500),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create trigger atualizar_timestamp before update on public.evento_acessos
  for each row execute function public.atualizar_timestamp();

-- ---------------------------------------------------------------
-- Segurança (RLS)
-- ---------------------------------------------------------------
alter table public.evento_perguntas enable row level security;
alter table public.cofre_config enable row level security;
alter table public.evento_acessos enable row level security;

create policy evento_perguntas_tudo on public.evento_perguntas for all to authenticated
  using (public.pode_ver_evento(evento_id)) with check (public.pode_ver_evento(evento_id));
-- cofre e acessos: SÓ a dona (a equipe nunca vê)
create policy cofre_config_dona on public.cofre_config for all to authenticated
  using (public.eh_dona()) with check (public.eh_dona());
create policy evento_acessos_dona on public.evento_acessos for all to authenticated
  using (public.eh_dona()) with check (public.eh_dona());

-- ---------------------------------------------------------------
-- Funções do portal do evento (o cliente NÃO lê as tabelas)
-- ---------------------------------------------------------------
create or replace function public.evento_do_token(p_token text)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.eventos
  where token_portal = p_token and portal_ativo and length(p_token) >= 32 and status <> 'cancelado'
  limit 1
$$;
revoke all on function public.evento_do_token(text) from public, anon, authenticated;

create or replace function public.portal_evento_dados(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nome', e.nome, 'categoria', e.categoria, 'data_evento', e.data_evento,
    'horario', e.horario, 'local', e.local, 'recado', e.recado_portal,
    'chave_publica', (select chave_publica from public.cofre_config where id = 1),
    'acesso', (select jsonb_build_object('usuario', a.usuario, 'enviado_em', a.atualizado_em)
               from public.evento_acessos a where a.evento_id = e.id),
    'perguntas', (select coalesce(jsonb_agg(jsonb_build_object(
                    'id', q.id, 'secao', q.secao, 'pergunta', q.pergunta, 'resposta', q.resposta)
                    order by q.ordem, q.criado_em), '[]'::jsonb)
                  from public.evento_perguntas q where q.evento_id = e.id))
  from public.eventos e
  where e.id = public.evento_do_token(p_token)
$$;

create or replace function public.portal_evento_responder(p_token text, p_pergunta uuid, p_resposta text)
returns void language plpgsql security definer set search_path = public as $$
declare
  eid uuid := public.evento_do_token(p_token);
  txt text := nullif(btrim(coalesce(p_resposta, '')), '');
begin
  if eid is null then raise exception 'link_invalido'; end if;
  if txt is not null and char_length(txt) > 4000 then raise exception 'texto_invalido'; end if;
  update public.evento_perguntas
  set resposta = txt, respondida_em = case when txt is null then null else now() end
  where id = p_pergunta and evento_id = eid;
  if not found then raise exception 'pergunta_invalida'; end if;
end;
$$;

-- recebe o usuário e a senha JÁ CRIPTOGRAFADA no celular do cliente (o banco nunca vê a senha)
create or replace function public.portal_evento_acesso(p_token text, p_usuario text, p_cifra text, p_observacao text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  eid uuid := public.evento_do_token(p_token);
  usr text := btrim(coalesce(p_usuario, ''));
  obs text := nullif(btrim(coalesce(p_observacao, '')), '');
begin
  if eid is null then raise exception 'link_invalido'; end if;
  if not exists (select 1 from public.cofre_config where id = 1) then raise exception 'cofre_indisponivel'; end if;
  if char_length(usr) < 1 or char_length(usr) > 80 then raise exception 'usuario_invalido'; end if;
  if p_cifra is null or char_length(p_cifra) not between 20 and 2000 or p_cifra !~ '^[A-Za-z0-9+/=]+$' then raise exception 'cifra_invalida'; end if;
  if obs is not null and char_length(obs) > 500 then raise exception 'texto_invalido'; end if;
  insert into public.evento_acessos (evento_id, usuario, senha_cifrada, observacao)
  values (eid, usr, p_cifra, obs)
  on conflict (evento_id) do update
    set usuario = excluded.usuario, senha_cifrada = excluded.senha_cifrada, observacao = excluded.observacao;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'portal_evento_dados(text)',
    'portal_evento_responder(text, uuid, text)',
    'portal_evento_acesso(text, text, text, text)'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
end;
$$;
