import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { NavegacaoMes } from '../../componentes/CalendarioMensal'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import { dataDeHoje, limitesDoMes, mesDeHoje } from '../../lib/datas'
import { numero, reais, reaisInteiro, soma } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import { CATEGORIA_PESSOAL_ROTULO, CATEGORIAS_PESSOAL } from '../../lib/tipos'
import type { Lancamento, MetaPessoal } from '../../lib/tipos'

interface Rascunho {
  id: string | null
  data: string
  tipo: 'entrada' | 'saida'
  categoria: string
  descricao: string
  valor: string
}

const COR_ENTRADA = '#5b7a38'
const COR_SAIDA = '#c98b4f'

export default function Pessoal() {
  const [mes, setMes] = useState(mesDeHoje())
  const [itens, setItens] = useState<Lancamento[] | null>(null)
  const [metas, setMetas] = useState<MetaPessoal[]>([])
  const [form, setForm] = useState<Rascunho | null>(null)
  const [novaMeta, setNovaMeta] = useState<{ nome: string; valor_meta: string; prazo: string } | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const { inicio, fim } = limitesDoMes(mes)
    const [l, m] = await Promise.all([
      supabase.from('financas_pessoais').select('*').gte('data', inicio).lte('data', fim).order('data', { ascending: false }),
      supabase.from('metas_pessoais').select('*').order('criado_em'),
    ])
    if (l.error) return setErro('Não foi possível carregar os lançamentos.')
    setItens(l.data as Lancamento[])
    setMetas((m.data as MetaPessoal[]) ?? [])
  }, [mes])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (!form) return
    setErro('')
    const campos = { data: form.data, tipo: form.tipo, categoria: form.categoria, descricao: form.descricao.trim(), valor: numero(form.valor) }
    const { error } = form.id ? await supabase.from('financas_pessoais').update(campos).eq('id', form.id) : await supabase.from('financas_pessoais').insert(campos)
    if (error) return setErro('Não foi possível salvar o lançamento.')
    setForm(null)
    void carregar()
  }

  async function remover(l: Lancamento) {
    if (!window.confirm(`Apagar "${l.descricao}"?`)) return
    await supabase.from('financas_pessoais').delete().eq('id', l.id)
    void carregar()
  }

  async function criarMeta(e: FormEvent) {
    e.preventDefault()
    if (!novaMeta) return
    const { error } = await supabase.from('metas_pessoais').insert({ nome: novaMeta.nome.trim(), valor_meta: numero(novaMeta.valor_meta), prazo: novaMeta.prazo || null })
    if (error) return setErro('Não foi possível salvar a meta.')
    setNovaMeta(null)
    void carregar()
  }

  async function atualizarMeta(m: MetaPessoal, texto: string) {
    const valor = numero(texto)
    if (valor === Number(m.valor_atual)) return
    await supabase.from('metas_pessoais').update({ valor_atual: valor }).eq('id', m.id)
    void carregar()
  }

  async function removerMeta(m: MetaPessoal) {
    if (!window.confirm(`Apagar a meta "${m.nome}"?`)) return
    await supabase.from('metas_pessoais').delete().eq('id', m.id)
    void carregar()
  }

  const lista = itens ?? []
  const entradas = soma(lista.filter((l) => l.tipo === 'entrada'), (l) => Number(l.valor))
  const saidas = soma(lista.filter((l) => l.tipo === 'saida'), (l) => Number(l.valor))
  const saldo = entradas - saidas
  const porCategoria = CATEGORIAS_PESSOAL.map((c) => ({ c, v: soma(lista.filter((l) => l.tipo === 'saida' && l.categoria === c), (l) => Number(l.valor)) })).filter((x) => x.v > 0)
  const maior = Math.max(1, ...porCategoria.map((x) => x.v))

  return (
    <div className="space-y-6 rounded-md border border-linha bg-areia/40 p-4 sm:p-6">
      <p className="text-sm text-texto-suave">Área pessoal: o que está aqui não entra nas contas da agência.</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <NavegacaoMes mes={mes} onMes={setMes} />
        <button className={btnPrimario} onClick={() => setForm({ id: null, data: dataDeHoje().startsWith(mes) ? dataDeHoje() : `${mes}-01`, tipo: 'saida', categoria: 'outros', descricao: '', valor: '' })}>
          Novo lançamento
        </button>
      </div>

      <ul className="grid gap-4 sm:grid-cols-3">
        {[
          { r: 'Entradas', v: entradas, alerta: false },
          { r: 'Saídas', v: saidas, alerta: false },
          { r: 'Saldo do mês', v: saldo, alerta: saldo < 0 },
        ].map((t) => (
          <li key={t.r} className={`rounded-md border p-5 shadow-suave ${t.alerta ? 'border-marrom bg-marrom-claro' : 'border-linha bg-superficie'}`}>
            <p className="eyebrow">{t.r}</p>
            <p className="numeros-grandes mt-3 text-3xl font-medium leading-none">{reaisInteiro(t.v)}</p>
          </li>
        ))}
      </ul>

      {form && (
        <Cartao>
          <form onSubmit={salvar} className="space-y-4">
            <Titulo>{form.id ? 'Editar lançamento' : 'Novo lançamento'}</Titulo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Tipo">
                <select className={inputCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as 'entrada' | 'saida' })}>
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </Campo>
              <Campo rotulo="Categoria">
                <select className={inputCls} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {CATEGORIAS_PESSOAL.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORIA_PESSOAL_ROTULO[c]}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo rotulo="Descrição">
                <input required className={inputCls} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
              </Campo>
              <Campo rotulo="Valor (R$)">
                <input type="number" step="0.01" min="0" required className={inputCls} value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
              </Campo>
              <Campo rotulo="Data">
                <input type="date" required className={inputCls} value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
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

      {porCategoria.length > 0 && (
        <Cartao className="space-y-3">
          <Titulo>Para onde foi o dinheiro</Titulo>
          <ul className="space-y-2" aria-label="Saídas por categoria">
            {porCategoria.map((x) => (
              <li key={x.c} className="grid grid-cols-[7.5rem_1fr_6.5rem] items-center gap-3 text-sm">
                <span className="text-texto-suave">{CATEGORIA_PESSOAL_ROTULO[x.c]}</span>
                <span className="h-2 rounded-sm bg-areia" aria-hidden>
                  <span className="anim-crescer block h-2 rounded-sm" style={{ width: `${(x.v / maior) * 100}%`, background: COR_SAIDA }} />
                </span>
                <span className="text-right tabular-nums">{reais(x.v)}</span>
              </li>
            ))}
          </ul>
        </Cartao>
      )}

      {itens === null && !erro && <p className="anim-respirar text-texto-suave">Carregando...</p>}
      {itens?.length === 0 && <p className="text-texto-suave">Nenhum lançamento neste mês.</p>}
      <ul className="divide-y divide-linha rounded-md border border-linha bg-superficie shadow-suave">
        {lista.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-3 p-4">
            <span aria-hidden className="h-8 w-1 rounded-sm" style={{ background: l.tipo === 'entrada' ? COR_ENTRADA : COR_SAIDA }} />
            <div className="min-w-48 flex-1">
              <p>{l.descricao}</p>
              <p className="text-xs text-texto-suave">
                {l.tipo === 'entrada' ? 'Entrada' : 'Saída'} · {CATEGORIA_PESSOAL_ROTULO[l.categoria] ?? l.categoria} · {formatarData(l.data)}
              </p>
            </div>
            <strong className="font-medium tabular-nums">
              {l.tipo === 'saida' ? '− ' : '+ '}
              {reais(Number(l.valor))}
            </strong>
            <button className={btnSecundario} onClick={() => setForm({ id: l.id, data: l.data, tipo: l.tipo, categoria: l.categoria, descricao: l.descricao, valor: String(l.valor) })}>
              Editar
            </button>
            <button className={btnSecundario} onClick={() => void remover(l)}>
              Apagar
            </button>
          </li>
        ))}
      </ul>

      <Cartao className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Titulo>Metas pessoais</Titulo>
          <button className={btnSecundario} onClick={() => setNovaMeta({ nome: '', valor_meta: '', prazo: '' })}>
            Nova meta
          </button>
        </div>
        {novaMeta && (
          <form onSubmit={criarMeta} className="grid gap-3 rounded-sm bg-fundo p-3 sm:grid-cols-4 sm:items-end">
            <Campo rotulo="Meta">
              <input required className={inputCls} value={novaMeta.nome} onChange={(e) => setNovaMeta({ ...novaMeta, nome: e.target.value })} />
            </Campo>
            <Campo rotulo="Valor (R$)">
              <input type="number" step="0.01" min="0" required className={inputCls} value={novaMeta.valor_meta} onChange={(e) => setNovaMeta({ ...novaMeta, valor_meta: e.target.value })} />
            </Campo>
            <Campo rotulo="Prazo">
              <input type="date" className={inputCls} value={novaMeta.prazo} onChange={(e) => setNovaMeta({ ...novaMeta, prazo: e.target.value })} />
            </Campo>
            <button type="submit" className={btnPrimario}>
              Salvar meta
            </button>
          </form>
        )}
        {metas.length === 0 && !novaMeta && <p className="text-sm text-texto-suave">Nenhuma meta ainda.</p>}
        <ul className="space-y-5">
          {metas.map((m) => {
            const pct = Number(m.valor_meta) > 0 ? Math.min(100, Math.round((Number(m.valor_atual) / Number(m.valor_meta)) * 100)) : 0
            return (
              <li key={m.id} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">
                    {m.nome}
                    {m.prazo && <span className="text-sm font-normal text-texto-suave"> · até {formatarData(m.prazo)}</span>}
                  </p>
                  <button className={btnSecundario} onClick={() => void removerMeta(m)}>
                    Remover
                  </button>
                </div>
                <div className="h-2 rounded-sm bg-areia" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.nome}: ${pct}%`}>
                  <div className="anim-crescer h-2 rounded-sm bg-musgo" style={{ width: `${pct}%` }} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-texto-suave">
                  <label className="flex items-center gap-2">
                    Guardado até agora
                    <input type="number" step="0.01" min="0" defaultValue={m.valor_atual} key={`${m.id}-${m.valor_atual}`} onBlur={(e) => void atualizarMeta(m, e.target.value)} className={`${inputCls} w-36`} />
                  </label>
                  <span>
                    de {reais(Number(m.valor_meta))} ({pct}%)
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </Cartao>
    </div>
  )
}
