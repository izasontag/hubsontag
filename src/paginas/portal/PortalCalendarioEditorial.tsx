import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Aviso, btnPrimario, btnSecundario, Esqueleto, inputCls } from '../../componentes/ui'
import { diaSemanaLongo, mesDeHoje, nomeDoMes } from '../../lib/datas'
import { mensagemDeErro, usePortal } from '../../lib/portal'
import { supabase } from '../../lib/supabase'
import { FORMATO_ROTULO, STATUS_CALENDARIO_ROTULO } from '../../lib/tipos'
import type { PortalCalendarioMes, StatusCalendario } from '../../lib/tipos'

type StatusPortal = StatusCalendario | 'historico'

interface Resumo {
  mes: string
  status: StatusPortal
  enviado_em: string | null
  decidido_em: string | null
}

const COR: Record<StatusPortal, string> = {
  historico: 'border-linha bg-areia text-texto-suave',
  rascunho: 'border-linha bg-areia text-texto-suave',
  enviado: 'border-mostarda bg-mostarda/60 text-marrom-escuro',
  aprovado: 'border-musgo bg-musgo-claro text-musgo',
  ajuste_pedido: 'border-red-800 bg-red-50 text-red-800',
}
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

// O calendário do mês, em texto, para o cliente aprovar ou pedir ajustes (item por item e/ou um recado geral).
export default function PortalCalendarioEditorial() {
  const { token, recarregar } = usePortal()
  const [params, setParams] = useSearchParams()
  const [lista, setLista] = useState<Resumo[] | null>(null)
  const [cal, setCal] = useState<PortalCalendarioMes | null>(null)
  const [ajustes, setAjustes] = useState<Record<string, string>>({})
  const [recado, setRecado] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const pedido = params.get('mes')

  useEffect(() => {
    supabase.rpc('portal_calendarios', { p_token: token }).then(({ data, error }) => {
      if (error) return setErro('Não foi possível carregar o calendário.')
      const itens = ((data as Resumo[]) ?? []).map((x) => ({ ...x, mes: x.mes.slice(0, 7) }))
      setLista(itens)
    })
  }, [token])

  // mês aberto: o do link, senão o primeiro aguardando resposta, senão o mais recente
  const aberto = lista ? (lista.find((x) => x.mes === pedido) ?? lista.find((x) => x.status === 'enviado') ?? lista.find((x) => x.mes === mesDeHoje()) ?? lista[0])?.mes : undefined

  const carregarMes = useCallback(async () => {
    if (!aberto) return
    const { data, error } = await supabase.rpc('portal_calendario_mes', { p_token: token, p_mes: `${aberto}-01` })
    if (error || !data) return setErro('Não foi possível abrir este calendário.')
    setErro('')
    setCal(data as PortalCalendarioMes)
  }, [token, aberto])

  useEffect(() => {
    setCal(null)
    setAjustes({})
    setRecado('')
    void carregarMes()
  }, [carregarMes])

  async function decidir(decisao: 'aprovado' | 'ajuste_pedido') {
    if (!cal || !aberto) return
    setErro('')
    const marcados = Object.entries(ajustes).map(([post_id, nota]) => ({ post_id, nota }))
    if (decisao === 'ajuste_pedido' && !recado.trim() && marcados.length === 0) return setErro('Escreva o que precisa mudar ou marque os itens que quer ajustar.')
    if (decisao === 'aprovado' && !window.confirm('Aprovar o calendário deste mês?')) return
    setEnviando(true)
    const { error } = await supabase.rpc('portal_calendario_decidir', { p_token: token, p_mes: `${aberto}-01`, p_decisao: decisao, p_mensagem: recado, p_ajustes: decisao === 'ajuste_pedido' ? marcados : [] })
    setEnviando(false)
    if (error) return setErro(mensagemDeErro(error))
    await carregarMes()
    const { data } = await supabase.rpc('portal_calendarios', { p_token: token })
    setLista(((data as Resumo[]) ?? []).map((x) => ({ ...x, mes: x.mes.slice(0, 7) })))
    void recarregar()
  }

  if (!lista) return erro ? <Aviso tipo="erro">{erro}</Aviso> : <Esqueleto className="h-48" />
  if (lista.length === 0) return <p className="text-texto-suave">Quando a Sontag enviar o calendário do mês para a sua aprovação, ele aparece aqui.</p>
  if (!cal) return erro ? <Aviso tipo="erro">{erro}</Aviso> : <Esqueleto className="h-48" />

  const podeDecidir = cal.status === 'enviado'
  const nomes = new Map(cal.posts.map((p) => [p.id, p.tema || 'Post']))
  const porDia = new Map<string, typeof cal.posts>()
  for (const p of cal.posts) porDia.set(p.data_publicacao, [...(porDia.get(p.data_publicacao) ?? []), p])

  return (
    <div className="space-y-8">
      {lista.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Meses">
          {lista.map((x) => (
            <button key={x.mes} role="tab" aria-selected={x.mes === aberto} onClick={() => setParams({ mes: x.mes })} className={`min-h-11 shrink-0 cursor-pointer rounded-full border px-4 text-sm first-letter:uppercase transition-colors ${x.mes === aberto ? 'border-marrom bg-superficie font-medium text-marrom' : 'border-linha text-texto-suave hover:bg-areia'}`}>
              {nomeDoMes(x.mes)}{x.status === 'enviado' ? ' · aguardando você' : x.status === 'aprovado' ? ' · aprovado' : ''}
            </button>
          ))}
        </div>
      )}

      <header className="space-y-3">
        <p className="eyebrow first-letter:uppercase">Calendário editorial</p>
        <h2 className="titulo-pagina first-letter:uppercase">{nomeDoMes(aberto!)}</h2>
        <span className={`inline-block rounded-full border px-3 py-1 text-sm ${COR[cal.status]}`}>{cal.status === 'historico' ? 'Mês anterior' : STATUS_CALENDARIO_ROTULO[cal.status]}</span>
        {cal.status === 'historico' && <p className="max-w-2xl text-texto-suave">Este é um mês que já passou: aqui ficam os posts que você já viu e aprovou, só para consulta.</p>}
        {podeDecidir && <p className="max-w-2xl text-texto-suave">Estes são os temas planejados para o mês. Leia com calma: você pode aprovar tudo, ou pedir ajuste em itens específicos e/ou deixar um recado geral.</p>}
      </header>

      {cal.status === 'aprovado' && (
        <Aviso tipo="ok">Você aprovou este calendário{cal.decidido_em ? ` em ${quando(cal.decidido_em)}` : ''}. Obrigada!{cal.mensagem ? ` Seu recado: "${cal.mensagem}"` : ''}</Aviso>
      )}
      {cal.status === 'ajuste_pedido' && (
        <div className="space-y-2 rounded-md border border-linha bg-superficie p-4 text-sm">
          <p className="font-medium">Você pediu ajustes{cal.decidido_em ? ` em ${quando(cal.decidido_em)}` : ''}. A Sontag já foi avisada e vai enviar uma nova versão.</p>
          {cal.mensagem && <p className="whitespace-pre-wrap">Seu recado: {cal.mensagem}</p>}
          {cal.ajustes.length > 0 && (
            <ul className="list-disc space-y-1 pl-5">
              {cal.ajustes.map((a, i) => <li key={`${a.post_id}-${i}`}><strong>{nomes.get(a.post_id) ?? 'Post'}</strong>{a.nota ? `: ${a.nota}` : ''}</li>)}
            </ul>
          )}
        </div>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {cal.posts.length === 0 && <p className="text-texto-suave">Nenhum post neste mês.</p>}
      <ol className="space-y-4" aria-label="Posts do mês">
        {[...porDia.entries()].map(([dia, itens]) => (
          <li key={dia} className="grid gap-3 sm:grid-cols-[5rem_1fr]">
            <div className="sm:text-center">
              <p className="numeros-grandes text-3xl leading-none">{dia.slice(8, 10)}</p>
              <p className="eyebrow mt-1 !text-[0.6rem] first-letter:uppercase">{diaSemanaLongo(dia).slice(0, 3)}</p>
            </div>
            <ul className="space-y-3">
              {itens.map((p) => {
                const marcado = p.id in ajustes
                return (
                  <li key={p.id} className={`space-y-2 rounded-[16px] border bg-superficie p-4 shadow-suave ${marcado ? 'border-marrom' : 'border-linha'}`}>
                    <p className="eyebrow">
                      {FORMATO_ROTULO[p.formato]}
                      {p.pilar ? ` · ${p.pilar}` : ''}
                      {p.horario ? ` · ${p.horario.slice(0, 5)}` : ''}
                    </p>
                    <p className="font-titulo text-2xl leading-snug">{p.tema || 'Post'}</p>
                    {p.gancho && <p className="text-texto-suave">Gancho: {p.gancho}</p>}
                    {p.legenda && (
                      <details>
                        <summary className="min-h-11 cursor-pointer py-2 text-sm text-marrom underline">Ver a legenda</summary>
                        <p className="whitespace-pre-wrap text-sm">{p.legenda}</p>
                      </details>
                    )}
                    {podeDecidir && (
                      <div className="space-y-2 border-t border-linha pt-3">
                        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
                          <input type="checkbox" className="h-5 w-5" checked={marcado} onChange={(e) => setAjustes((a) => { const n = { ...a }; if (e.target.checked) n[p.id] = ''; else delete n[p.id]; return n })} />
                          Quero ajustar este item
                        </label>
                        {marcado && <textarea aria-label={`O que ajustar em ${p.tema || 'este post'}`} className={`${inputCls} min-h-20`} maxLength={500} placeholder="O que você gostaria de mudar?" value={ajustes[p.id]} onChange={(e) => setAjustes((a) => ({ ...a, [p.id]: e.target.value }))} />}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>

      {podeDecidir && (
        <section className="space-y-4 rounded-[18px] border border-linha bg-superficie p-5 shadow-suave" aria-label="Sua resposta">
          <h3 className="titulo-sub">Sua <em>resposta</em></h3>
          <label className="block text-sm text-texto-suave">
            Recado geral (opcional para aprovar)
            <textarea className={`${inputCls} mt-1 min-h-24`} maxLength={2000} value={recado} onChange={(e) => setRecado(e.target.value)} placeholder="Ex.: Gostei! Só trocaria a data do dia 10." />
          </label>
          {Object.keys(ajustes).length > 0 && <p className="text-sm text-texto-suave">{Object.keys(ajustes).length} {Object.keys(ajustes).length === 1 ? 'item marcado' : 'itens marcados'} para ajuste.</p>}
          <div className="flex flex-wrap gap-3">
            <button className={btnPrimario} disabled={enviando} onClick={() => void decidir('aprovado')}>Aprovar calendário</button>
            <button className={btnSecundario} disabled={enviando} onClick={() => void decidir('ajuste_pedido')}>Pedir ajustes</button>
          </div>
        </section>
      )}
    </div>
  )
}
