import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import { dataDeHoje } from '../../lib/datas'
import { numero, reais, soma } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import { FORMA_ROTULO, FORMAS_PAGAMENTO, STATUS_COBRANCA_ROTULO } from '../../lib/tipos'
import type { Evento, FormaPagamento, Parcela } from '../../lib/tipos'

const SELO = {
  pago: 'border-musgo bg-musgo text-superficie',
  a_vencer: 'border-linha text-texto-suave',
  atrasado: 'border-marrom bg-marrom text-superficie',
} as const

const somarMeses = (data: string, n: number) => {
  const [a, m, d] = data.split('-').map(Number)
  const alvo = new Date(a, m - 1 + n, 1)
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate()
  return `${alvo.getFullYear()}-${String(alvo.getMonth() + 1).padStart(2, '0')}-${String(Math.min(d, ultimo)).padStart(2, '0')}`
}

export default function PagamentosEvento({ evento }: { evento: Evento }) {
  const [itens, setItens] = useState<Parcela[] | null>(null)
  const [form, setForm] = useState<{ id: string | null; descricao: string; vencimento: string; valor: string; forma: FormaPagamento | '' } | null>(null)
  const [pagando, setPagando] = useState<{ id: string; data: string; forma: FormaPagamento } | null>(null)
  const [divisao, setDivisao] = useState<{ total: string; entrada: string; parcelas: string; primeiro: string } | null>(null)
  const [erro, setErro] = useState('')
  const hoje = dataDeHoje()

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.from('evento_parcelas').select('*').eq('evento_id', evento.id).order('vencimento')
    if (error) return setErro('Não foi possível carregar as parcelas.')
    setItens(data as Parcela[])
  }, [evento.id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro('')
    const campos = { descricao: form.descricao.trim(), vencimento: form.vencimento, valor: numero(form.valor), forma_pagamento: form.forma || null }
    const { error } = form.id
      ? await supabase.from('evento_parcelas').update(campos).eq('id', form.id)
      : await supabase.from('evento_parcelas').insert({ ...campos, evento_id: evento.id })
    if (error) return setErro('Não foi possível salvar a parcela.')
    setForm(null)
    void carregar()
  }

  async function dividir(e: FormEvent) {
    e.preventDefault()
    if (!divisao) return
    setErro('')
    const total = numero(divisao.total)
    const entrada = numero(divisao.entrada)
    const n = Math.max(1, Math.min(48, Math.round(numero(divisao.parcelas))))
    if (total <= 0 || entrada < 0 || entrada >= total) return setErro('Confira o valor total e a entrada: a entrada precisa ser menor que o total.')
    const restante = Math.round((total - entrada) * 100)
    const base = Math.floor(restante / n)
    const linhas: { evento_id: string; descricao: string; vencimento: string; valor: number }[] = []
    if (entrada > 0) linhas.push({ evento_id: evento.id, descricao: 'Entrada', vencimento: hoje, valor: entrada })
    for (let i = 0; i < n; i += 1) {
      const centavos = i === n - 1 ? restante - base * (n - 1) : base
      linhas.push({
        evento_id: evento.id,
        descricao: n === 1 ? 'Saldo' : `Parcela ${i + 1} de ${n}`,
        vencimento: somarMeses(divisao.primeiro, i),
        valor: centavos / 100,
      })
    }
    const { error } = await supabase.from('evento_parcelas').insert(linhas)
    if (error) return setErro('Não foi possível criar as parcelas.')
    setDivisao(null)
    void carregar()
  }

  async function marcarPaga(e: FormEvent) {
    e.preventDefault()
    if (!pagando) return
    const { error } = await supabase.from('evento_parcelas').update({ status: 'pago', pago_em: pagando.data, forma_pagamento: pagando.forma }).eq('id', pagando.id)
    if (error) return setErro('Não foi possível marcar como paga.')
    setPagando(null)
    void carregar()
  }

  async function desfazer(p: Parcela) {
    await supabase.from('evento_parcelas').update({ status: p.vencimento < hoje ? 'atrasado' : 'a_vencer', pago_em: null }).eq('id', p.id)
    void carregar()
  }

  async function remover(p: Parcela) {
    if (!window.confirm(`Apagar a parcela "${p.descricao}"?`)) return
    await supabase.from('evento_parcelas').delete().eq('id', p.id)
    void carregar()
  }

  const lista = itens ?? []
  const total = soma(lista, (p) => Number(p.valor))
  const pago = soma(lista.filter((p) => p.status === 'pago'), (p) => Number(p.valor))
  const atrasado = soma(lista.filter((p) => p.status !== 'pago' && p.vencimento < hoje), (p) => Number(p.valor))

  return (
    <div className="space-y-6">
      <ul className="grid gap-4 sm:grid-cols-3">
        {[
          { r: 'Valor total do evento', v: total, nota: 'soma das parcelas' },
          { r: 'Já recebido', v: pago },
          { r: 'A receber', v: total - pago, alerta: atrasado > 0, nota: atrasado > 0 ? `${reais(atrasado)} em atraso` : undefined },
        ].map((t) => (
          <li key={t.r} className={`rounded-md border p-5 shadow-suave ${t.alerta ? 'border-marrom bg-marrom-claro' : 'border-linha bg-superficie'}`}>
            <p className="eyebrow">{t.r}</p>
            <p className="numeros-grandes mt-3 text-3xl font-medium leading-none">{reais(t.v)}</p>
            {t.nota && <p className="mt-2 text-xs text-texto-suave">{t.nota}</p>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-texto-suave">Estas parcelas entram na receita prevista e recebida do Financeiro da agência. A equipe nunca vê esta aba.</p>

      <div className="flex flex-wrap gap-3">
        <button className={btnPrimario} onClick={() => setForm({ id: null, descricao: '', vencimento: hoje, valor: '', forma: '' })}>
          Nova parcela
        </button>
        <button className={btnSecundario} onClick={() => setDivisao({ total: '', entrada: '', parcelas: '3', primeiro: somarMeses(hoje, 1) })}>
          Dividir o valor em parcelas
        </button>
      </div>

      {divisao && (
        <Cartao>
          <form onSubmit={dividir} className="space-y-4">
            <Titulo>Dividir o valor em parcelas</Titulo>
            <div className="grid gap-4 sm:grid-cols-4">
              <Campo rotulo="Valor total (R$)">
                <input type="number" step="0.01" min="0" required className={inputCls} value={divisao.total} onChange={(e) => setDivisao({ ...divisao, total: e.target.value })} />
              </Campo>
              <Campo rotulo="Entrada hoje (R$)">
                <input type="number" step="0.01" min="0" className={inputCls} value={divisao.entrada} onChange={(e) => setDivisao({ ...divisao, entrada: e.target.value })} />
              </Campo>
              <Campo rotulo="Parcelas do restante">
                <input type="number" min="1" max="48" required className={inputCls} value={divisao.parcelas} onChange={(e) => setDivisao({ ...divisao, parcelas: e.target.value })} />
              </Campo>
              <Campo rotulo="Primeiro vencimento">
                <input type="date" required className={inputCls} value={divisao.primeiro} onChange={(e) => setDivisao({ ...divisao, primeiro: e.target.value })} />
              </Campo>
            </div>
            <p className="text-xs text-texto-suave">As parcelas são mensais, no mesmo dia. A última ajusta os centavos para a soma bater exatamente.</p>
            <div className="flex gap-3">
              <button type="submit" className={btnPrimario}>
                Criar parcelas
              </button>
              <button type="button" className={btnSecundario} onClick={() => setDivisao(null)}>
                Cancelar
              </button>
            </div>
          </form>
        </Cartao>
      )}

      {form && (
        <Cartao>
          <form onSubmit={salvar} className="space-y-4">
            <Titulo>{form.id ? 'Editar parcela' : 'Nova parcela'}</Titulo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Descrição">
                <input required className={inputCls} placeholder="Entrada, Parcela 2, Saldo..." value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </Campo>
              <Campo rotulo="Valor (R$)">
                <input type="number" step="0.01" min="0" required className={inputCls} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </Campo>
              <Campo rotulo="Vencimento">
                <input type="date" required className={inputCls} value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} />
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
      {itens?.length === 0 && <p className="text-texto-suave">Nenhuma parcela ainda.</p>}

      <ul className="divide-y divide-linha rounded-md border border-linha bg-superficie shadow-suave">
        {lista.map((p) => (
          <li key={p.id} className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-sm border px-1.5 py-0.5 text-xs ${SELO[p.status]}`}>{STATUS_COBRANCA_ROTULO[p.status]}</span>
              <div className="min-w-40 flex-1">
                <p>{p.descricao}</p>
                <p className="text-xs text-texto-suave">
                  vence {formatarData(p.vencimento)}
                  {p.status === 'pago' && p.pago_em && ` · pago em ${formatarData(p.pago_em)}`}
                  {p.forma_pagamento && ` · ${FORMA_ROTULO[p.forma_pagamento]}`}
                </p>
              </div>
              <strong className="text-lg font-medium tabular-nums">{reais(Number(p.valor))}</strong>
            </div>
            {pagando?.id === p.id ? (
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
                {p.status !== 'pago' ? (
                  <button className={btnPrimario} onClick={() => setPagando({ id: p.id, data: hoje, forma: p.forma_pagamento ?? 'pix' })}>
                    Marcar como paga
                  </button>
                ) : (
                  <button className={btnSecundario} onClick={() => void desfazer(p)}>
                    Desfazer pagamento
                  </button>
                )}
                <button className={btnSecundario} onClick={() => setForm({ id: p.id, descricao: p.descricao, vencimento: p.vencimento, valor: String(p.valor), forma: p.forma_pagamento ?? '' })}>
                  Editar
                </button>
                <button className={btnSecundario} onClick={() => void remover(p)}>
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
