import { useState } from 'react'
import { Aviso, btnPrimario, btnSecundario, inputCls } from '../ui'
import { mensagemDeErro, usePortal } from '../../lib/portal'
import { supabase } from '../../lib/supabase'
import type { PortalPost } from '../../lib/tipos'

export default function PainelDecisao({ post }: { post: PortalPost }) {
  const { token, recarregar } = usePortal()
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function decidir(decisao: 'aprovado' | 'ajuste_pedido') {
    setErro('')
    if (decisao === 'ajuste_pedido' && texto.trim() === '') {
      return setErro('Escreva no campo acima o que precisa ser ajustado.')
    }
    setEnviando(true)
    const { error } = await supabase.rpc('portal_decidir', {
      p_token: token,
      p_post_id: post.id,
      p_decisao: decisao,
      p_mensagem: texto.trim() || null,
    })
    if (error) setErro(mensagemDeErro(error))
    else await recarregar()
    setEnviando(false)
  }

  async function soComentar() {
    setErro('')
    if (texto.trim() === '') return setErro('Escreva o comentário no campo acima.')
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
    <div className="space-y-3 border-t border-linha pt-4">
      <label className="block text-sm text-texto-suave" htmlFor={`dec-${post.id}`}>
        Comentário (obrigatório para pedir ajuste)
      </label>
      <textarea id={`dec-${post.id}`} rows={3} maxLength={2000} className={inputCls} value={texto} onChange={(e) => setTexto(e.target.value)} />
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={enviando} className={`${btnPrimario} !bg-musgo`} onClick={() => void decidir('aprovado')}>
          Aprovar
        </button>
        <button type="button" disabled={enviando} className={btnPrimario} onClick={() => void decidir('ajuste_pedido')}>
          Pedir ajuste
        </button>
        <button type="button" disabled={enviando} className={btnSecundario} onClick={() => void soComentar()}>
          Só comentar
        </button>
      </div>
    </div>
  )
}
