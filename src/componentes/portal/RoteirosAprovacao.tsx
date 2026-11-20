import { useState } from 'react'
import { nomeDoMes } from '../../lib/datas'
import { FORMATO_ROTEIRO_ROTULO } from '../../lib/tipos'
import type { AprovacaoRoteiro, PortalRoteiro } from '../../lib/tipos'
import { Aviso, btnPrimario, btnSecundario, formatarData, inputCls } from '../ui'

const COR: Record<AprovacaoRoteiro, string> = {
  nao_enviado: 'border-linha bg-areia text-texto-suave',
  enviado: 'border-mostarda bg-mostarda/60 text-marrom-escuro',
  aprovado: 'border-musgo bg-musgo-claro text-musgo',
  ajuste_pedido: 'border-red-800 bg-red-50 text-red-800',
}
const ROTULO: Record<AprovacaoRoteiro, string> = { nao_enviado: '', enviado: 'Esperando a sua resposta', aprovado: 'Você aprovou', ajuste_pedido: 'Você pediu ajuste' }
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

type Filtro = 'todos' | 'enviado' | 'aprovado' | 'ajuste_pedido'

function Cartao({ r, decidir }: { r: PortalRoteiro; decidir: (id: string, decisao: 'aprovado' | 'ajuste_pedido', mensagem: string) => Promise<string | null> }) {
  const [recado, setRecado] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')

  async function responder(decisao: 'aprovado' | 'ajuste_pedido') {
    setErro('')
    if (decisao === 'ajuste_pedido' && !recado.trim()) return setErro('Escreva o que precisa mudar neste roteiro.')
    setEnviando(true)
    const falha = await decidir(r.id, decisao, recado)
    setEnviando(false)
    if (falha) setErro(falha)
  }

  return (
    <li className="space-y-3 rounded-[18px] border border-linha bg-superficie p-5 shadow-suave">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="eyebrow">
            {FORMATO_ROTEIRO_ROTULO[r.formato]}
            {r.data_prevista ? ` · previsto para ${formatarData(r.data_prevista)}` : ''}
          </p>
          <h3 className="font-titulo text-2xl font-semibold leading-snug">{r.titulo}</h3>
        </div>
        <span className={`rounded-full border px-3 py-0.5 text-xs ${COR[r.aprovacao]}`}>{ROTULO[r.aprovacao]}</span>
      </div>
      <p className="whitespace-pre-wrap rounded-md bg-fundo p-4 text-[0.95rem] leading-relaxed">{r.texto}</p>

      {r.aprovacao === 'enviado' ? (
        <div className="space-y-3 border-t border-linha pt-4">
          <label className="block text-sm text-texto-suave">
            Seu recado (obrigatório só para pedir ajuste)
            <textarea className={`${inputCls} mt-1 min-h-24`} maxLength={2000} value={recado} onChange={(e) => setRecado(e.target.value)} placeholder="Ex.: Gostei! Só trocaria a abertura." />
          </label>
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          <div className="flex flex-wrap gap-3">
            <button className={btnPrimario} disabled={enviando} onClick={() => void responder('aprovado')}>Aprovar roteiro</button>
            <button className={btnSecundario} disabled={enviando} onClick={() => void responder('ajuste_pedido')}>Pedir ajuste</button>
          </div>
        </div>
      ) : (
        <div className="space-y-1 border-t border-linha pt-3 text-sm">
          {r.decidido_em && <p className="text-texto-suave">{r.aprovacao === 'aprovado' ? 'Aprovado' : 'Ajuste pedido'} em {quando(r.decidido_em)}.</p>}
          {r.mensagem && <p className="whitespace-pre-wrap">Seu recado: {r.mensagem}</p>}
          {r.aprovacao === 'ajuste_pedido' && <p className="text-texto-suave">A Sontag já foi avisada e vai enviar uma nova versão.</p>}
        </div>
      )}
    </li>
  )
}

// Lista de roteiros para o cliente aprovar. Os que esperam resposta ficam em cima; os respondidos ficam no histórico, por mês.
export default function RoteirosAprovacao({ roteiros, decidir }: { roteiros: PortalRoteiro[]; decidir: (id: string, decisao: 'aprovado' | 'ajuste_pedido', mensagem: string) => Promise<string | null> }) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const visiveis = roteiros.filter((r) => filtro === 'todos' || r.aprovacao === filtro)
  const aguardando = visiveis.filter((r) => r.aprovacao === 'enviado')
  const respondidos = visiveis.filter((r) => r.aprovacao !== 'enviado')
  // histórico agrupado pelo mês da resposta (ou do envio)
  const grupos = new Map<string, PortalRoteiro[]>()
  for (const r of respondidos) {
    const mes = (r.decidido_em ?? r.enviado_em ?? '').slice(0, 7)
    grupos.set(mes, [...(grupos.get(mes) ?? []), r])
  }
  const chip = (c: Filtro, rotulo: string, n: number) => (
    <button key={c} type="button" aria-pressed={filtro === c} onClick={() => setFiltro(c)} className={`min-h-11 cursor-pointer rounded-full border px-4 text-sm transition-colors ${filtro === c ? 'border-marrom bg-superficie font-medium text-marrom' : 'border-linha text-texto-suave hover:bg-areia'}`}>
      {rotulo} ({n})
    </button>
  )

  return (
    <div className="space-y-8">
      {roteiros.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar roteiros">
          {chip('todos', 'Todos', roteiros.length)}
          {chip('enviado', 'Aguardando você', roteiros.filter((r) => r.aprovacao === 'enviado').length)}
          {chip('aprovado', 'Aprovados', roteiros.filter((r) => r.aprovacao === 'aprovado').length)}
          {chip('ajuste_pedido', 'Com ajuste', roteiros.filter((r) => r.aprovacao === 'ajuste_pedido').length)}
        </div>
      )}
      {aguardando.length > 0 && (
        <section className="space-y-4" aria-label="Roteiros esperando a sua resposta">
          <h3 className="titulo-sub">Esperando a <em>sua resposta</em></h3>
          <ul className="space-y-4">{aguardando.map((r) => <Cartao key={`${r.id}-${r.enviado_em}`} r={r} decidir={decidir} />)}</ul>
        </section>
      )}
      {[...grupos.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([mes, itens]) => (
        <section key={mes} className="space-y-4" aria-label={mes ? nomeDoMes(mes) : 'Respondidos'}>
          <h3 className="titulo-sub first-letter:uppercase">{mes ? nomeDoMes(mes) : 'Respondidos'}</h3>
          <ul className="space-y-4">{itens.map((r) => <Cartao key={`${r.id}-${r.enviado_em}`} r={r} decidir={decidir} />)}</ul>
        </section>
      ))}
      {visiveis.length === 0 && <p className="text-texto-suave">Nenhum roteiro neste filtro.</p>}
    </div>
  )
}
