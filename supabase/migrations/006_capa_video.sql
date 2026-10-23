-- Capa (imagem) opcional para vídeos, por arquivo ou por link
-- Cole este arquivo inteiro no Supabase: SQL Editor > New query > Run.

alter table public.post_midias add column capa_storage text;

-- Portal: agora devolve também a capa de cada vídeo
create or replace function public.portal_posts(p_token text)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id, 'rodada_id', p.rodada_id,
      'data_publicacao', p.data_publicacao, 'horario', p.horario,
      'formato', p.formato, 'pilar', p.pilar, 'formato_cbs', p.formato_cbs,
      'tema', p.tema, 'gancho', p.gancho, 'copy', p.copy, 'legenda', p.legenda,
      'status', p.status, 'desempenho', p.desempenho, 'alcance', p.alcance,
      'salvamentos', p.salvamentos, 'compartilhamentos', p.compartilhamentos,
      'comentarios_qtd', p.comentarios_qtd, 'nota_desempenho', p.nota_desempenho,
      'tags', (select coalesce(jsonb_agg(jsonb_build_object('nome', t.nome, 'cor', t.cor)
                                         order by t.nome), '[]'::jsonb)
               from public.post_tags pt join public.tags t on t.id = pt.tag_id
               where pt.post_id = p.id),
      'midias', (select coalesce(jsonb_agg(jsonb_build_object(
                   'tipo', m.tipo, 'caminho', m.caminho_storage, 'link', m.link_externo,
                   'capa', m.capa_storage)
                   order by m.ordem), '[]'::jsonb)
                 from public.post_midias m where m.post_id = p.id),
      'comentarios', (select coalesce(jsonb_agg(jsonb_build_object(
                        'id', c.id, 'origem', c.origem, 'texto', c.texto,
                        'referencia', c.referencia, 'criado_em', c.criado_em)
                        order by c.criado_em), '[]'::jsonb)
                      from public.comentarios c
                      where c.post_id = p.id and c.visivel_cliente),
      'aprovacoes', (select coalesce(jsonb_agg(jsonb_build_object(
                       'decisao', a.decisao, 'mensagem', a.mensagem, 'criado_em', a.criado_em)
                       order by a.criado_em), '[]'::jsonb)
                     from public.aprovacoes a where a.post_id = p.id)
    ) order by p.data_publicacao, p.horario nulls first
  ), '[]'::jsonb)
  from public.posts p
  where p.cliente_id = public.cliente_do_token(p_token)
    and p.status in ('em_aprovacao', 'ajuste_pedido', 'aprovado', 'agendado', 'publicado')
$$;
