import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { NavegacaoMes } from '../../componentes/CalendarioMensal'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import { dataDeHoje, limitesDoMes } from '../../lib/datas'
import { numero, reais, soma } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import { CATEGORIA_DESPESA_ROTULO, CATEGORIAS_DESPESA } from '../../lib/tipos'
import type { CategoriaDespesa, Despesa } from '../../lib/tipos'

interface Rascunho {
  id: string | null
  data: string
  categoria: CategoriaDespesa
  descricao: string
  valor: string
}

export default function Despesas({ mes, onMes }: { mes: string; onMes: (m: string) => void }) {
  const [itens, setItens] = useState<Despesa[] | null>(null)
  const [form, setForm] = useState<Rascunho | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { inicio, fim } = limitesDoMes(mes)
    const { data, error } = await supabase.from('despesas').select('*').gte('data', inicio).lte('data', fim).order('data', { ascending: false })
    if (error) return setErro('Não foi possível carregar as despesas.')
    setItens(data as Despesa[])
  }, [mes])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro('')
    const campos = { data: form.data, categoria: form.categoria, descricao: form.descricao.trim(), valor: numero(form.valor) }
    const { error } = form.id ? await supabase.from('despesas').update(campos).eq('id', form.id) : await supabase.from('despesas').insert(campos)
    if (error) return setErro('Não foi possível salvar a despesa.')
    setForm(null)
    void carregar()
  }

  async function remover(d: Despesa) {
    if (!window.confirm(`Apagar "${d.descricao}"?`)) return
    await supabase.from('despesas').delete().eq('id', d.id)
    void carregar()
  }

  const lista = itens ?? []
  const total = soma(lista, (d) => Number(d.valor))
  const porCategoria = CATEGORIAS_DESPESA.map((c) => ({ c, v: soma(lista.filter((d) => d.categoria === c), (d) => Number(d.valor)) })).filter((x) => x.v > 0)
  const maior = Math.max(1, ...porCategoria.map((x) => x.v))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NavegacaoMes mes={mes} onMes={onMes} />
        <button className={btnPrimario} onClick={() => setForm({ id: null, data: dataDeHoje().startsWith(mes) ? dataDeHoje() : `${mes}-01`, categoria: 'ferramentas', descricao: '', valor: '' })}>
          Nova despesa
        </button>
      </div>

      {form && (
        <Cartao>
          <form onSubmit={salvar} className="space-y-4">
            <Titulo>{form.id ? 'Editar despesa' : 'Nova despesa'}</Titulo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Descrição">
                <input required className={inputCls} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </Campo>
              <Campo rotulo="Categoria">
                <select className={inputCls} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value as CategoriaDespesa })}>
                  {CATEGORIAS_DESPESA.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIA_DESPESA_ROTULO[c]}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Data">
                <input type="date" required className={inputCls} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </Campo>
              <Campo rotulo="Valor (R$)">
                <input type="number" step="0.01" min="0" required className={inputCls} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
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

      <Cartao className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <Titulo>Total do mês</Titulo>
          <p className="numeros-grandes text-3xl font-medium">{reais(total)}</p>
        </div>
        {porCategoria.length > 0 && (
          <ul className="space-y-2" aria-label="Despesas por categoria">
            {porCategoria.map((x) => (
              <li key={x.c} className="grid grid-cols-[7rem_1fr_6.5rem] items-center gap-3 text-sm">
                <span className="text-texto-suave">{CATEGORIA_DESPESA_ROTULO[x.c]}</span>
                <span className="h-2 rounded-sm bg-areia" aria-hidden>
                  <span className="anim-crescer block h-2 rounded-sm" style={{ width: `${(x.v / maior) * 100}%`, background: '#c98b4f' }} />
                </span>
                <span className="text-right tabular-nums">{reais(x.v)}</span>
              </li>
            ))}
          </ul>
        )}
      </Cartao>

      {itens === null && !erro && <p className="anim-respirar text-texto-suave">Carregando...</p>}
      {itens?.length === 0 && <p className="text-texto-suave">Nenhuma despesa neste mês.</p>}
      <ul className="divide-y divide-linha rounded-md border border-linha bg-superficie shadow-suave">
        {lista.map((d) => (
          <li key={d.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-48 flex-1">
              <p>{d.descricao}</p>
              <p className="text-xs text-texto-suave">
                {CATEGORIA_DESPESA_ROTULO[d.categoria]} · {formatarData(d.data)}
              </p>
            </div>
            <strong className="font-medium tabular-nums">{reais(Number(d.valor))}</strong>
            <button className={btnSecundario} onClick={() => setForm({ id: d.id, data: d.data, categoria: d.categoria, descricao: d.descricao, valor: String(d.valor) })}>
              Editar
            </button>
            <button className={btnSecundario} onClick={() => void remover(d)}>
              Apagar
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
