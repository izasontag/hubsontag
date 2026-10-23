import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { formatarData } from '../ui'
import { Aviso, btnPrimario, inputCls } from '../ui'
import { ChipTag, SeloDesempenho, SeloStatus } from '../Selos'
import { formatarDataHora, mensagemDeErro, usePortal } from '../../lib/portal'
import { supabase } from '../../lib/supabase'
import { FORMATO_ROTULO } from '../../lib/tipos'
import type { PortalPost } from '../../lib/tipos'
import { horaCurta } from '../../lib/datas'
import ImagensPost from './ImagensPost'

function Conversa({ post }: { post: PortalPost }) {
  const itens = [
    ...post.comentarios.map((c) => ({
      quando: c.criado_em,
      chave: `c${c.id}`,
      quem: c.origem === 'portal' ? 'Você' : 'Sontag Media',
      texto: c.texto,
      destaque: null as string | null,
    })),
    ...post.aprovacoes.map((a, i) => ({
      quando: a.criado_em,
      chave: `a${i}`,
      quem: 'Você',
      texto: a.mensagem ?? '',
      destaque: a.decisao === 'aprovado' ? 'Aprovou este post' : 'Pediu ajuste',
    })),
  ].sort((a, b) => a.quando.localeCompare(b.quando))
  if (itens.length === 0) return null
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-texto-suave">Conversa</h4>
      <ul className="space-y-2">
        {itens.map((i) => (
          <li key={i.chave} className="rounded-sm border border-linha bg-fundo p-3 text-sm">
            <p className="text-xs text-texto-suave">
              {i.quem} · {formatarDataHora(i.quando)}
            </p>
            {i.destaque && <p className="font-medium text-marrom">{i.destaque}</p>}
            {i.texto && <p className="whitespace-pre-wrap">{i.texto}</p>}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function FormComentario({ post }: { post: PortalPost }) {
  const { token, recarregar } = usePortal()
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await supabase.rpc('portal_comentar', { p_token: token, p_post_id: post.id, p_texto: texto })
    if (error) setErro(mensagemDeErro(error))
    else {
      setTexto('')
      await recarregar()
    }
    setEnviando(false)
  }

  return (
    <form onSubmit={enviar} className="space-y-2">
      <label className="block text-sm text-texto-suave" htmlFor={`com-${post.id}`}>
        Deixar um comentário
      </label>
      <textarea id={`com-${post.id}`} required rows={3} maxLength={2000} className={inputCls} value={texto} onChange={(e) => setTexto(e.target.value)} />
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <button type="submit" disabled={enviando} className={btnPrimario}>
        {enviando ? 'Enviando...' : 'Enviar comentário'}
      </button>
    </form>
  )
}

export default function ConteudoPost({ post, children }: { post: PortalPost; children?: ReactNode }) {
  const titulo = post.tema || 'Post'
  const numeros: [string, number | null][] = [
    ['Alcance', post.alcance],
    ['Salvamentos', post.salvamentos],
    ['Compartilhamentos', post.compartilhamentos],
    ['Comentários', post.comentarios_qtd],
  ]
  return (
    <article className="space-y-4">
      <ImagensPost midias={post.midias} titulo={titulo} />
      <header className="space-y-1">
        <p className="text-sm text-texto-suave">
          {formatarData(post.data_publicacao)}
          {post.horario ? ` às ${horaCurta(post.horario)}` : ''} · {FORMATO_ROTULO[post.formato]}
        </p>
        <h3 className="font-titulo text-2xl font-semibold text-texto">{titulo}</h3>
        <div className="flex flex-wrap gap-1">
          <SeloStatus status={post.status} />
          {post.desempenho && <SeloDesempenho desempenho={post.desempenho} />}
          {post.tags.map((t) => (
            <ChipTag key={t.nome} tag={t} />
          ))}
        </div>
      </header>
      {post.gancho && (
        <div>
          <h4 className="text-sm font-medium text-texto-suave">Gancho</h4>
          <p className="whitespace-pre-wrap">{post.gancho}</p>
        </div>
      )}
      {post.legenda && (
        <div>
          <h4 className="text-sm font-medium text-texto-suave">Legenda</h4>
          <p className="whitespace-pre-wrap">{post.legenda}</p>
        </div>
      )}
      {post.copy && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-musgo underline">Ver o texto das artes</summary>
          <p className="whitespace-pre-wrap">{post.copy}</p>
        </details>
      )}
      {post.status === 'publicado' && (post.desempenho || numeros.some(([, v]) => v !== null) || post.nota_desempenho) && (
        <div className="space-y-2 rounded-sm border border-linha bg-fundo p-3">
          <h4 className="text-sm font-medium text-texto-suave">Resultado</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {numeros.map(([rotulo, valor]) =>
              valor === null ? null : (
                <div key={rotulo}>
                  <dt className="text-texto-suave">{rotulo}</dt>
                  <dd className="font-medium">{valor.toLocaleString('pt-BR')}</dd>
                </div>
              ),
            )}
          </dl>
          {post.nota_desempenho && <p className="whitespace-pre-wrap text-sm">{post.nota_desempenho}</p>}
        </div>
      )}
      <Conversa post={post} />
      {children}
    </article>
  )
}
