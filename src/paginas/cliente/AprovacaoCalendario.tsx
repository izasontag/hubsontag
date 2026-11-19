import { useCallback, useEffect, useState } from 'react'
import { Aviso, btnPrimario, btnSecundario, Cartao, formatarData } from '../../componentes/ui'
import { nomeDoMes } from '../../lib/datas'
import { supabase } from '../../lib/supabase'
import { STATUS_CALENDARIO_ROTULO } from '../../lib/tipos'
import type { CalendarioMensal, Cliente, PostCompleto } from '../../lib/tipos'

const COR = {
  rascunho: 'border-linha bg-areia text-texto-suave',
  enviado: 'border-mostarda bg-mostarda/60 text-marrom-escuro',
  aprovado: 'border-musgo bg-musgo-claro text-musgo',
  ajuste_pedido: 'border-red-800 bg-red-50 text-red-800',
} as const

const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

// Faixa no calendário do cliente: envia o calendário do mês para o cliente aprovar e mostra a resposta dele.
export default function AprovacaoCalendario({ cliente, mes, posts, onMudou }: { cliente: Cliente; mes: string; posts: PostCompleto[]; onMudou?: () => void }) {
  const [cal, setCal] = useState<CalendarioMensal | null | undefined>(undefined)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [enviando, setEnviando] = useState(false)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('calendarios_mensais').select('*').eq('cliente_id', cliente.id).eq('mes', `${mes}-01`).maybeSingle()
    if (error) return setErro('Não foi possível carregar o envio do calendário. Confira se o arquivo 019_calendario_aprovacao.sql foi rodado no Supabase.')
    setErro('')
    setCal((data as CalendarioMensal | null) ?? null)
  }, [cliente.id, mes])

  useEffect(() => {
    setMsg('')
    void carregar()
  }, [carregar])

  const status = cal?.status ?? 'rascunho'
  const link = `${window.location.origin}/portal/${cliente.token_portal}/calendario-editorial?mes=${mes}`

  async function enviar() {
    setErro('')
    setMsg('')
    if (posts.length === 0) return setErro(`Não há posts em ${nomeDoMes(mes)}. Planeje o mês antes de enviar.`)
    const reenvio = status !== 'rascunho'
    if (!window.confirm(`${reenvio ? 'Reenviar' : 'Enviar'} o calendário de ${nomeDoMes(mes)} (${posts.length} ${posts.length === 1 ? 'post' : 'posts'}) para ${cliente.nome} aprovar?`)) return
    setEnviando(true)
    const { error } = await supabase.rpc('enviar_calendario', { p_cliente: cliente.id, p_mes: `${mes}-01` })
    setEnviando(false)
    if (error) return setErro('Não foi possível enviar o calendário.')
    setMsg('Calendário enviado. Copie o link e mande para o cliente (ou ele vê no portal, em Calendário editorial).')
    void carregar()
    onMudou?.()
  }

  async function voltarRascunho() {
    if (!cal || !window.confirm('Tirar o calendário do portal e voltar para rascunho? O cliente deixa de ver.')) return
    const { error } = await supabase.from('calendarios_mensais').update({ status: 'rascunho' }).eq('id', cal.id)
    if (error) return setErro('Não foi possível mudar.')
    void carregar()
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link)
      setMsg('Link copiado. É só enviar ao cliente.')
    } catch {
      setErro('Não deu para copiar sozinho. Selecione o link e copie.')
    }
  }

  if (cal === undefined) return erro ? <Aviso tipo="erro">{erro}</Aviso> : null
  const temas = new Map(posts.map((p) => [p.id, p.tema || 'Post sem tema']))

  return (
    <Cartao className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Aprovação do calendário de {nomeDoMes(mes)}</p>
          <p className="mt-1 text-sm text-texto-suave">
            Envie o planejamento do mês (datas, formatos, temas e ganchos) para o cliente aprovar ou pedir ajustes, sem precisar das artes prontas.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-sm ${COR[status]}`}>{STATUS_CALENDARIO_ROTULO[status]}</span>
      </div>

      {cal && status !== 'rascunho' && (
        <p className="text-sm text-texto-suave">
          Enviado em {cal.enviado_em ? quando(cal.enviado_em) : '-'}
          {cal.rodada > 1 && ` (envio ${cal.rodada})`}
          {cal.decidido_em && ` · respondido em ${quando(cal.decidido_em)}`}
        </p>
      )}
      {cal?.status === 'aprovado' && <Aviso tipo="ok">{cliente.nome} aprovou o calendário.{cal.mensagem ? ` Recado: "${cal.mensagem}"` : ''}</Aviso>}
      {cal?.status === 'ajuste_pedido' && (
        <div className="space-y-2 rounded-md border border-red-800 bg-red-50 p-3 text-sm">
          <p className="font-medium text-red-800">{cliente.nome} pediu ajustes.</p>
          {cal.mensagem && <p className="whitespace-pre-wrap">Recado: {cal.mensagem}</p>}
          {cal.ajustes.length > 0 && (
            <ul className="list-disc space-y-1 pl-5">
              {cal.ajustes.map((a, i) => (
                <li key={`${a.post_id}-${i}`}>
                  <strong>{temas.get(a.post_id) ?? 'Post'}</strong>
                  {a.nota ? `: ${a.nota}` : ''}
                </li>
              ))}
            </ul>
          )}
          <p className="text-texto-suave">Ajuste os posts no calendário e use "Reenviar para aprovação".</p>
        </div>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}
      {!cliente.portal_ativo && <Aviso tipo="erro">O portal deste cliente está desativado: ele não consegue abrir o link. Ative na aba Portal.</Aviso>}

      <div className="flex flex-wrap gap-2">
        <button className={btnPrimario} disabled={enviando} onClick={() => void enviar()}>
          {enviando ? 'Enviando…' : status === 'rascunho' ? 'Enviar para aprovação' : 'Reenviar para aprovação'}
        </button>
        {status !== 'rascunho' && <button className={btnSecundario} onClick={() => void copiar()}>Copiar link do calendário</button>}
        {status === 'enviado' && <button className={btnSecundario} onClick={() => void voltarRascunho()}>Tirar do portal</button>}
        {status !== 'rascunho' && status !== 'enviado' && <button className="min-h-11 cursor-pointer px-2 text-sm text-texto-suave underline" onClick={() => void voltarRascunho()}>Tirar do portal</button>}
      </div>
      <p className="text-xs text-texto-suave">{posts.length} {posts.length === 1 ? 'post' : 'posts'} em {nomeDoMes(mes)}{cal?.enviado_em ? ` · último envio em ${formatarData(cal.enviado_em.slice(0, 10))}` : ''}.</p>
    </Cartao>
  )
}
