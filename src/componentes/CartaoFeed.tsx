import { useState } from 'react'
import type { ReactNode } from 'react'
import { formatarData } from './ui'
import { CarrosselMidias } from './Midias'
import { horaCurta } from '../lib/datas'
import { FORMATO_ROTULO } from '../lib/tipos'
import type { FormatoPost, MidiaVista } from '../lib/tipos'

interface Props {
  cliente: { nome: string; instagram: string | null; cor_destaque: string }
  post: {
    tema: string | null
    legenda: string | null
    midias: MidiaVista[]
    data_publicacao: string
    horario: string | null
    formato: FormatoPost
  }
  topo?: ReactNode // selos no canto do cabeçalho
  children?: ReactNode // ações e conversa, abaixo da legenda
}

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

// O post como ele aparece no Instagram: cabeçalho, mídia, legenda.
export default function CartaoFeed({ cliente, post, topo, children }: Props) {
  const [aberta, setAberta] = useState(false)
  const legenda = post.legenda ?? ''
  const longa = legenda.length > 180
  const titulo = post.tema || 'Post'

  return (
    <article className="mx-auto w-full max-w-md overflow-hidden rounded-md border border-linha bg-superficie">
      <header className="flex items-center gap-3 p-3">
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium text-superficie"
          style={{ background: cliente.cor_destaque }}
        >
          {iniciais(cliente.nome)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-texto">{cliente.instagram || cliente.nome}</span>
          <span className="block text-xs text-texto-suave">
            {FORMATO_ROTULO[post.formato]} · {formatarData(post.data_publicacao)}
            {post.horario ? ` às ${horaCurta(post.horario)}` : ''}
          </span>
        </span>
        {topo}
      </header>
      <CarrosselMidias midias={post.midias} titulo={titulo} />
      <div className="space-y-3 p-4">
        {post.tema && <h3 className="font-titulo text-2xl font-semibold leading-tight text-texto">{post.tema}</h3>}
        {legenda && (
          <div>
            <p className={`whitespace-pre-wrap text-sm leading-relaxed ${!aberta && longa ? 'line-clamp-4' : ''}`}>{legenda}</p>
            {longa && (
              <button type="button" onClick={() => setAberta(!aberta)} className="min-h-11 cursor-pointer text-sm text-texto-suave underline">
                {aberta ? 'ver menos' : 'ver legenda completa'}
              </button>
            )}
          </div>
        )}
        {!legenda && <p className="text-sm italic text-texto-suave">Sem legenda.</p>}
      </div>
      {children && <div className="space-y-4 border-t border-linha p-4">{children}</div>}
    </article>
  )
}
