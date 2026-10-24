-- Plano de ação: o cliente pode marcar como feito e responder os itens "com o cliente" pelo portal.
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

alter table public.tarefas
  add column resposta_cliente text check (resposta_cliente is null or char_length(resposta_cliente) <= 2000),
  add column respondida_em timestamptz;

create or replace function public.portal_tarefas(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'titulo', t.titulo, 'data', t.data, 'tipo', t.tipo, 'status', t.status,
    'responsavel', t.responsavel, 'material', t.material,
    'resposta', t.resposta_cliente, 'respondida_em', t.respondida_em)
    order by (t.status = 'feito'), t.data nulls last, t.criado_em), '[]'::jsonb)
  from public.tarefas t
  where t.cliente_id = public.cliente_do_token(p_token) and t.visivel_cliente
$$;

-- O cliente responde SÓ itens dele (responsavel = cliente) que a agência deixou visíveis.
-- Muda apenas o status (feito ou a fazer) e a resposta; nada mais.
create or replace function public.portal_tarefa_responder(p_token text, p_tarefa uuid, p_feito boolean, p_resposta text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  cid uuid := public.cliente_do_token(p_token);
  txt text := nullif(btrim(coalesce(p_resposta, '')), '');
begin
  if cid is null then raise exception 'link_invalido'; end if;
  if txt is not null and char_length(txt) > 2000 then raise exception 'texto_invalido'; end if;
  update public.tarefas
  set status = case when p_feito then 'feito' else 'fazer' end,
      resposta_cliente = txt,
      respondida_em = now()
  where id = p_tarefa and cliente_id = cid and visivel_cliente and responsavel = 'cliente';
  if not found then raise exception 'tarefa_indisponivel'; end if;
end;
$$;

revoke all on function public.portal_tarefa_responder(text, uuid, boolean, text) from public;
grant execute on function public.portal_tarefa_responder(text, uuid, boolean, text) to anon, authenticated;
