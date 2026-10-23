import { FORMATO_ROTULO } from '../lib/tipos'
import type { PostCompleto, Tag } from '../lib/tipos'
import { horaCurta } from '../lib/datas'
import { formatarData } from './ui'
import { paraVista } from '../lib/midias'
import { MiniaturaMidia } from './Midias'
import { ChipTag, SeloDesempenho, SeloStatus } from './Selos'

interface Props {
  post: PostCompleto
  tags: Tag[]
  mostrarCliente?: boolean
  mostrarData?: boolean
  vertical?: boolean
  onAbrir: (post: PostCompleto) => void
}

export default function CartaoPost({ post, tags, mostrarCliente, mostrarData, vertical, onAbrir }: Props) {
  const tagsDoPost = tags.filter((t) => post.post_tags.some((pt) => pt.tag_id === t.id))
  const cor = post.cliente?.cor_destaque
  return (
    <button
      type="button"
      onClick={() => onAbrir(post)}
      className={`flex w-full cursor-pointer gap-2 rounded-sm border border-linha bg-superficie p-2 text-left hover:border-marrom ${vertical ? 'flex-col' : ''}`}
      style={mostrarCliente && cor ? { borderLeft: `4px solid ${cor}` } : undefined}
    >
      <MiniaturaMidia midias={post.post_midias.map(paraVista)} alt="" className={`shrink-0 rounded-sm ${vertical ? 'h-20 w-full' : 'h-12 w-12'}`} />
      <span className="w-full min-w-0 flex-1 space-y-1">
        {mostrarCliente && post.cliente && (
          <span className="block truncate text-xs font-medium text-texto-suave">{post.cliente.nome}</span>
        )}
        <span className="block truncate text-sm text-texto">{post.tema || 'Sem tema'}</span>
        <span className="block text-xs text-texto-suave">
          {mostrarData ? `${formatarData(post.data_publicacao).slice(0, 5)} · ` : ''}
          {FORMATO_ROTULO[post.formato]}
          {post.horario ? ` · ${horaCurta(post.horario)}` : ''}
        </span>
        <span className="flex flex-wrap gap-1">
          <SeloStatus status={post.status} />
          {post.desempenho && <SeloDesempenho desempenho={post.desempenho} />}
          {tagsDoPost.map((t) => (
            <ChipTag key={t.id} tag={t} />
          ))}
        </span>
      </span>
    </button>
  )
}
