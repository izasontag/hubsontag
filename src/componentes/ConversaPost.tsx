import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { formatarDataHora } from '../lib/portal'
import { supabase } from '../lib/supabase'
import { Aviso, btnPrimario, inputCls } from './ui'

interface Aprovacao {
  id: string
  decisao: 'aprovado' | 'ajuste_pedido'
  mensagem: string | null
  criado_em: string
}

interface Comentario {
  id: string
  origem: 'interno' | 'portal'
  visivel_cliente: boolean
  texto: string
  criado_em: string
}

export default function ConversaPost({ postId, onMudou }: { postId: string; onMudou: () => void }) {
  const { perfil } = useAuth()
  const [aprovacoes, setAprovacoes] = useState<Aprovacao[]>([])
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [texto, setTexto] = useState('')
  const [mostrar, setMostrar] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const [a, c] = await Promise.all([
      supabase.from('aprovacoes').select('*').eq('post_id', postId),
      supabase.from('comentarios').select('*').eq('post_id', postId),
    ])
    setAprovacoes((a.data as Aprovacao[]) ?? [])
    setComentarios((c.data as Comentario[]) ?? [])
  }, [postId])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!perfil) return
    setErro('')
    const { error } = await supabase.from('comentarios').insert({
      post_id: postId,
      autor_id: perfil.id,
      origem: 'interno',
      visivel_cliente: mostrar,
      texto: texto.trim(),
    })
    if (error) return setErro('Não foi possível enviar.')
    setTexto('')
    void carregar()
    onMudou()
  }

  const itens = [
    ...aprovacoes.map((a) => ({
      chave: `a${a.id}`,
      quando: a.criado_em,
      quem: 'Cliente',
      destaque: a.decisao === 'aprovado' ? 'Aprovou' : 'Pediu ajuste',
      texto: a.mensagem ?? '',
      nota: '',
    })),
    ...comentarios.map((c) => ({
      chave: `c${c.id}`,
      quando: c.criado_em,
      quem: c.origem === 'portal' ? 'Cliente' : 'Equipe',
      destaque: '',
      texto: c.texto,
      nota: c.origem === 'interno' ? (c.visivel_cliente ? 'visível ao cliente' : 'só interno') : '',
    })),
  ].sort((a, b) => a.quando.localeCompare(b.quando))

  return (
    <section className="mt-8 space-y-3 border-t border-linha pt-6">
      <h3 className="font-titulo text-2xl font-semibold text-marrom">Conversa com o cliente</h3>
      {itens.length === 0 && <p className="text-sm text-texto-suave">Nenhuma aprovação ou comentário ainda.</p>}
      <ul className="space-y-2">
        {itens.map((i) => (
          <li key={i.chave} className="rounded-sm border border-linha bg-superficie p-3 text-sm">
            <p className="text-xs text-texto-suave">
              {i.quem} · {formatarDataHora(i.quando)}
              {i.nota ? ` · ${i.nota}` : ''}
            </p>
            {i.destaque && <p className="font-medium text-marrom">{i.destaque}</p>}
            {i.texto && <p className="whitespace-pre-wrap">{i.texto}</p>}
          </li>
        ))}
      </ul>
      <form onSubmit={enviar} className="space-y-2">
        <label className="block text-sm text-texto-suave" htmlFor="nova-msg">
          Novo comentário
        </label>
        <textarea id="nova-msg" required rows={3} maxLength={2000} className={inputCls} value={texto} onChange={(e) => setTexto(e.target.value)} />
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} className="h-5 w-5" />
          Mostrar ao cliente no portal (desmarque para uma nota só interna)
        </label>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <button type="submit" className={btnPrimario}>
          Enviar comentário
        </button>
      </form>
    </section>
  )
}
