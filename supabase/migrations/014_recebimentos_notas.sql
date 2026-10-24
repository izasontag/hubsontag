-- Recebimento mensal por cliente: quanto foi recebido e a nota (nota fiscal ou recibo) de cada cobrança.
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

alter table public.cobrancas
  add column valor_recebido numeric(12, 2) check (valor_recebido is null or valor_recebido >= 0),
  add column nota_storage text,
  add column nota_nome text;

-- Notas: bucket PRIVADO "notas", só a dona. Caminho: <id do cliente>/<id da cobrança>/<arquivo>
insert into storage.buckets (id, name, public, file_size_limit)
values ('notas', 'notas', false, 20971520)
on conflict (id) do nothing;

create policy notas_arquivos_dona on storage.objects for all to authenticated
  using (bucket_id = 'notas' and public.eh_dona())
  with check (bucket_id = 'notas' and public.eh_dona());
