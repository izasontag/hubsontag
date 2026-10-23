import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { NavegacaoMes } from '../../componentes/CalendarioMensal'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import { dataDeHoje, limitesDoMes } from '../../lib/datas'
import { numero, reais, soma } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import { FORMA_ROTULO, FORMAS_PAGAMENTO, STATUS_COBRANCA_ROTULO } from '../../lib/tipos'
import type { Cobranca, FormaPagamento } from '../../lib/tipos'

interface ClienteMin {
  id: string
  nome: string
}
interface Rascunho {
  id: string | null
  cliente_id: string
  descricao: string
  vencimento: string
  valor: string
  forma: FormaPagamento | ''
}

const SELO = {
  pago: 'border-musgo bg-musgo text-superficie',
  a_vencer: 'border-linha text-texto-suave',
  atrasado: 'border-marrom bg-marrom text-superficie',
} as const

export default function Cobrancas({ mes, onMes }: { mes: string; onMes: (m: string) => void }) {
  const [itens, setItens] = useState<Cobranca[] | null>(null)
  const [clientes, setClientes] = useState<ClienteMin[]>([])
  const [filtro, setFiltro] = useState('')
  const [form, setForm] = useState<Rascunho | null>(null)
  const [pagando, setPagando] = useState<{ id: string; data: string; forma: FormaPagamento } | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { inicio, fim } = limitesDoMes(mes)
    const [c, k] = await Promise.all([
      supabase
        .from('cobrancas')
        .select('*, cliente:clientes(nome)')
        .or(`and(vencimento.gte.${inicio},vencimento.lte.${fim}),status.eq.atrasado`)
        .order('vencimento'),
      supabase.from('clientes').select('id, nome').order('nome'),
    ])
    if (c.error) return setErro('Não foi possível carregar as cobranças.')
    setItens(c.data as Cobranca[])
    setClientes((k.data as ClienteMin[]) ?? [])
  }, [mes])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro('')
    const campos = {
      cliente_id: form.cliente_id || null,
      descricao: form.descricao.trim(),
      vencimento: form.vencimento,
      valor: numero(form.valor),
      forma_pagamento: form.forma || null,
    }
    const { error } = form.id ? await supabase.from('cobrancas').update(campos).eq('id', form.id) : await supabase.from('cobrancas').insert(campos)
    if (error) return setErro('Não foi possível salvar a cobrança.')
    setForm(null)
    void carregar()
  }

  async function marcarPaga(e: FormEvent) {
    e.preventDefault()
    if (!pagando) return
    const { error } = await supabase
      .from('cobrancas')
      .update({ status: 'pago', pago_em: pagando.data, forma_pagamento: pagando.forma })
      .eq('id', pagando.id)
    if (error) return setErro('Não foi possível marcar como paga.')
    setPagando(null)
    void carregar()
  }

  async function desfazer(c: Cobranca) {
    const status = c.vencimento < dataDeHoje() ? 'atrasado' : 'a_vencer'
    await supabase.from('cobrancas').update({ status, pago_em: null }).eq('id', c.id)
    void carregar()
  }

  async function remover(c: Cobranca) {
    if (!window.confirm(`Apagar a cobrança "${c.descricao}"?`)) return
    await supabase.from('cobrancas').delete().eq('id', c.id)
    void carregar()
  }

  const visiveis = (itens ?? []).filter((c) => !filtro || c.status === filtro)
  const total = soma(visiveis, (c) => Number(c.valor))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NavegacaoMes mes={mes} onMes={onMes} />
        <button className={btnPrimario} onClick={() => setForm({ id: null, cliente_id: '', descricao: '', vencimento: `${mes}-10`, valor: '', forma: '' })}>
          Nova cobrança
        </button>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className="block text-sm text-texto-suave">
          Mostrar
          <select className={`${inputCls} mt-1 min-w-48`} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todas</option>
            <option value="a_vencer">A vencer</option>
            <option value="atrasado">Atrasadas</option>
            <option value="pago">Pagas</option>
          </select>
        </label>
        <p className="text-sm text-texto-suave">
          {visiveis.length} cobranças · <strong className="font-medium text-texto">{reais(total)}</strong>
        </p>
      </div>
      <p className="text-xs text-texto-suave">As atrasadas de meses anteriores aparecem aqui até serem pagas.</p>

      {form && (
        <Cartao>
          <form onSubmit={salvar} className="space-y-4">
            <Titulo>{form.id ? 'Editar cobrança' : 'Nova cobrança'}</Titulo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Cliente">
                <select className={inputCls} value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })}>
                  <option value="">Sem cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Descrição">
                <input required className={inputCls} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </Campo>
              <Campo rotulo="Vencimento">
                <input type="date" required className={inputCls} value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
              </Campo>
              <Campo rotulo="Valor (R$)">
                <input type="number" step="0.01" min="0" required className={inputCls} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </Campo>
              <Campo rotulo="Forma de pagamento">
                <select className={inputCls} value={form.forma} onChange={(e) => setForm({ ...form, forma: e.target.value as FormaPagamento | '' })}>
                  <option value="">A definir</option>
                  {FORMAS_PAGAMENTO.map((f) => (
                    <option key={f} value={f}>
                      {FORMA_ROTULO[f]}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <div className="flex gap-3">
              <button type="submit" className={btnPrimario}>
                Salvar
              </button>
              <button type="button" className={btnSecundario} onClick={() => setForm(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Cartao>
      )}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {itens === null && !erro && <p className="anim-respirar text-texto-suave">Carregando...</p>}
      {itens && visiveis.length === 0 && <p className="text-texto-suave">Nenhuma cobrança neste filtro.</p>}

      <ul className="divide-y divide-linha rounded-md border border-linha bg-superficie shadow-suave">
        {visiveis.map((c) => (
          <li key={c.id} className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-sm border px-1.5 py-0.5 text-xs ${SELO[c.status]}`}>{STATUS_COBRANCA_ROTULO[c.status]}</span>
              <div className="min-w-48 flex-1">
                <p>{c.cliente?.nome ?? 'Sem cliente'}</p>
                <p className="text-xs text-texto-suave">
                  {c.descricao} · vence {formatarData(c.vencimento)}
                  {c.status === 'pago' && c.pago_em && ` · pago em ${formatarData(c.pago_em)}`}
                  {c.forma_pagamento && ` · ${FORMA_ROTULO[c.forma_pagamento]}`}
                </p>
              </div>
              <strong className="text-lg font-medium tabular-nums">{reais(Number(c.valor))}</strong>
            </div>
            {pagando?.id === c.id ? (
              <form onSubmit={marcarPaga} className="flex flex-wrap items-end gap-3 rounded-sm bg-fundo p-3">
                <Campo rotulo="Pago em">
                  <input type="date" required className={inputCls} value={pagando.data} onChange={(e) => setPagando({ ...pagando, data: e.target.value })} />
                </Campo>
                <Campo rotulo="Forma">
                  <select className={inputCls} value={pagando.forma} onChange={(e) => setPagando({ ...pagando, forma: e.target.value as FormaPagamento })}>
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f} value={f}>
                        {FORMA_ROTULO[f]}
                      </option>
                    ))}
                  </select>
                </Campo>
                <button type="submit" className={btnPrimario}>
                  Confirmar pagamento
                </button>
                <button type="button" className={btnSecundario} onClick={() => setPagando(null)}>
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                {c.status !== 'pago' ? (
                  <button className={btnPrimario} onClick={() => setPagando({ id: c.id, data: dataDeHoje(), forma: c.forma_pagamento ?? 'pix' })}>
                    Marcar como paga
                  </button>
                ) : (
                  <button className={btnSecundario} onClick={() => void desfazer(c)}>
                    Desfazer pagamento
                  </button>
                )}
                <button
                  className={btnSecundario}
                  onClick={() => setForm({ id: c.id, cliente_id: c.cliente_id ?? '', descricao: c.descricao, vencimento: c.vencimento, valor: String(c.valor), forma: c.forma_pagamento ?? '' })}
                >
                  Editar
                </button>
                <button className={btnSecundario} onClick={() => void remover(c)}>
                  Apagar
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
