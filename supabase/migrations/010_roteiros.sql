-- Roteiros: uma aba por cliente e uma aba por evento (texto do roteiro + arquivo anexo).
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

create table public.roteiros (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes (id) on delete cascade,
  evento_id uuid references public.eventos (id) on delete cascade,
  titulo text not null check (btrim(titulo) <> ''),
  formato text not null default 'reels' check (formato in ('reels', 'carrossel', 'stories', 'video', 'evento', 'outro')),
  status text not null default 'rascunho' check (status in ('rascunho', 'em_revisao', 'aprovado', 'gravado', 'publicado')),
  data_prevista date,
  texto text,
  arquivo_storage text, -- no bucket privado "roteiros"
  arquivo_nome text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- pertence a um cliente OU a um evento, nunca aos dois
  check ((cliente_id is null) <> (evento_id is null))
);
create index on public.roteiros (cliente_id, criado_em desc);
create index on public.roteiros (evento_id, criado_em desc);

create trigger atualizar_timestamp before update on public.roteiros
  for each row execute function public.atualizar_timestamp();

create or replace function public.pode_ver_roteiro(cid uuid, eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when cid is not null then public.pode_ver_cliente(cid)
    when eid is not null then public.pode_ver_evento(eid)
    else false
  end
$$;
revoke execute on function public.pode_ver_roteiro(uuid, uuid) from public, anon;
grant execute on function public.pode_ver_roteiro(uuid, uuid) to authenticated;

-- a pasta do arquivo é o id do cliente ou o id do evento
create or replace function public.pode_ver_pasta_roteiro(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.pode_ver_cliente(pid) or public.pode_ver_evento(pid)
$$;
revoke execute on function public.pode_ver_pasta_roteiro(uuid) from public, anon;
grant execute on function public.pode_ver_pasta_roteiro(uuid) to authenticated;

alter table public.roteiros enable row level security;
create policy roteiros_tudo on public.roteiros for all to authenticated
  using (public.pode_ver_roteiro(cliente_id, evento_id))
  with check (public.pode_ver_roteiro(cliente_id, evento_id));

-- Arquivos (bucket PRIVADO "roteiros"; caminho: <id do cliente ou do evento>/<arquivo>)
insert into storage.buckets (id, name, public, file_size_limit)
values ('roteiros', 'roteiros', false, 52428800)
on conflict (id) do nothing;

create policy roteiros_arquivos_ler on storage.objects for select to authenticated
  using (bucket_id = 'roteiros' and public.pode_ver_pasta_roteiro(((storage.foldername(name))[1])::uuid));
create policy roteiros_arquivos_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'roteiros' and public.pode_ver_pasta_roteiro(((storage.foldername(name))[1])::uuid));
create policy roteiros_arquivos_editar on storage.objects for update to authenticated
  using (bucket_id = 'roteiros' and public.pode_ver_pasta_roteiro(((storage.foldername(name))[1])::uuid));
create policy roteiros_arquivos_apagar on storage.objects for delete to authenticated
  using (bucket_id = 'roteiros' and public.pode_ver_pasta_roteiro(((storage.foldername(name))[1])::uuid));
