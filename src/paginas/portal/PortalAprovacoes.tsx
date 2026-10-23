import { Conversa, FormComentario } from '../../componentes/portal/ConteudoPost'
import PainelDecisao from '../../componentes/portal/PainelDecisao'
import CartaoFeed from '../../componentes/CartaoFeed'
import { SeloStatus } from '../../componentes/Selos'
import { formatarData } from '../../componentes/ui'
import { formatarDataHora, usePortal } from '../../lib/portal'
import type { PortalPost, PortalRodada } from '../../lib/tipos'

function PostAprovacao({ post }: { post: PortalPost }) {
  const { dados } = usePortal()
  if (!dados) return null
  const ajuste = [...post.aprovacoes].reverse().find((a) => a.decisao === 'ajuste_pedido')
  return (
    <CartaoFeed cliente={dados} post={post} topo={<SeloStatus status={post.status} />}>
      {post.status === 'em_aprovacao' && (
        <>
          <Conversa post={post} />
          <PainelDecisao post={post} />
        </>
      )}
      {post.status === 'ajuste_pedido' && (
        <>
          <p className="text-sm text-texto-suave">
            Você pediu ajuste{ajuste ? ` em ${formatarDataHora(ajuste.criado_em)}` : ''}. Quando a Sontag Media terminar, o
            post volta para aprovação.
          </p>
          <Conversa post={post} />
          <FormComentario post={post} />
        </>
      )}
      {post.status !== 'em_aprovacao' && post.status !== 'ajuste_pedido' && (
        <>
          <Conversa post={post} />
          <details>
            <summary className="min-h-11 cursor-pointer py-2 text-sm text-musgo underline">Deixar um comentário</summary>
            <FormComentario post={post} />
          </details>
        </>
      )}
    </CartaoFeed>
  )
}

function BlocoRodada({ rodada, posts, aberta }: { rodada: PortalRodada; posts: PortalPost[]; aberta: boolean }) {
  const pendentes = posts.filter((p) => p.status === 'em_aprovacao')
  const respondidos = posts.length - pendentes.length
  const pct = posts.length > 0 ? Math.round((respondidos / posts.length) * 100) : 0
  const ordenados = [...pendentes, ...posts.filter((p) => p.status !== 'em_aprovacao')]
  const periodo = rodada.inicio && rodada.fim ? `${formatarData(rodada.inicio)} a ${formatarData(rodada.fim)}` : ''

  return (
    <details open={aberta} className="space-y-6">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 rounded-md border border-linha bg-superficie p-4">
        <span>
          <span className="block font-titulo text-2xl font-semibold text-texto">{rodada.titulo}</span>
          <span className="block text-sm text-texto-suave">
            {periodo && `${periodo} · `}enviada em {formatarData(rodada.enviada_em.slice(0, 10))}
          </span>
        </span>
        <span className="text-sm text-texto-suave">
          {pendentes.length > 0 ? `${pendentes.length} esperando você` : 'Tudo respondido'}
        </span>
      </summary>
      <div className="mt-4 space-y-2">
        <div className="h-2 rounded-sm bg-linha" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${respondidos} de ${posts.length} posts respondidos`}>
          <div className="h-2 rounded-sm bg-musgo" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-texto-suave">
          {respondidos} de {posts.length} respondidos
        </p>
      </div>
      <div className="mt-6 space-y-8">
        {ordenados.map((p) => (
          <PostAprovacao key={p.id} post={p} />
        ))}
      </div>
    </details>
  )
}

export default function PortalAprovacoes() {
  const { posts, rodadas } = usePortal()
  const avulsos = posts.filter((p) => !p.rodada_id && (p.status === 'em_aprovacao' || p.status === 'ajuste_pedido'))
  const vazio = rodadas.length === 0 && avulsos.length === 0

  return (
    <div className="space-y-8">
      <h2 className="font-titulo text-3xl font-semibold text-marrom">Aprovações</h2>
      {vazio && <p className="text-texto-suave">Nada esperando a sua aprovação agora.</p>}
      {rodadas.map((r, i) => (
        <BlocoRodada key={r.id} rodada={r} posts={posts.filter((p) => p.rodada_id === r.id)} aberta={i === 0} />
      ))}
      {avulsos.length > 0 && (
        <section className="space-y-6">
          <h3 className="font-titulo text-2xl font-semibold text-texto">Outros posts</h3>
          {avulsos.map((p) => (
            <PostAprovacao key={p.id} post={p} />
          ))}
        </section>
      )}
    </div>
  )
}
