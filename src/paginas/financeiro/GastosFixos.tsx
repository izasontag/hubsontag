import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { NavegacaoMes } from '../../componentes/CalendarioMensal'
import NumInput from '../../componentes/NumInput'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import { dataDeHoje, mesDeHoje, somarMeses } from '../../lib/datas'
import { reais, soma } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import { CATEGORIAS_GASTO_FIXO, FORMA_ROTULO, FORMAS_PAGAMENTO } from '../../lib/tipos'
import type { FormaPagamento, GastoFixo, GastoFixoMes } from '../../lib/tipos'

type Area = 'pessoal' | 'agencia'
type Filtro = 'todos' | 'a_pagar' | 'atrasados' | 'pagos'
type Como = 'todo_mes' | 'parcelado' | 'unico'

interface Form {
  id: string | null
  nome: string
  categoria: string
  valor: number
  dia: number
  como: Como
  parcelas: number
  parcelaAtual: number
  observacao: string
}

export interface ResumoGastos {
  total: number
  pago: number
  falta: number
}

const novoForm = (area: Area): Form => ({ id: null, nome: '', categoria: CATEGORIAS_GASTO_FIXO[area][0], valor: 0, dia: 5, como: 'todo_mes', parcelas: 10, parcelaAtual: 1, observacao: '' })

const diasAte = (iso: string, hoje: string) => Math.round((new Date(`${iso}T12:00:00`).getTime() - new Date(`${hoje}T12:00:00`).getTime()) / 86400000)

// Checklist de gastos fixos do mês: o que é todo mês, parcelado ou só deste mês, pago ou não pago.
// Se `mes` vier de fora, a tela do pai controla o mês e esta não mostra a navegação.
export default function GastosFixos({ area, mes: mesFora, onMes, onResumo }: { area: Area; mes?: string; onMes?: (m: string) => void; onResumo?: (r: ResumoGastos) => void }) {
  const [mesLocal, setMesLocal] = useState(mesDeHoje())
  const mes = mesFora ?? mesLocal
  const trocarMes = onMes ?? setMesLocal
  const hoje = dataDeHoje()
  const [gastos, setGastos] = useState<GastoFixo[] | null>(null)
  const [linhas, setLinhas] = useState<GastoFixoMes[]>([])
  const [anterior, setAnterior] = useState<number | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [editandoValor, setEditandoValor] = useState<{ id: string; valor: number } | null>(null)
  const [detalhe, setDetalhe] = useState<{ id: string; data: string; forma: FormaPagamento | ''; obs: string } | null>(null)
  const [gerenciar, setGerenciar] = useState(false)
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [agrupar, setAgrupar] = useState<'vencimento' | 'categoria'>('vencimento')
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    // cria as linhas do mês que ainda não existem (recorrentes e parcelas)
    const gerou = await supabase.rpc('gerar_gastos_fixos', { p_area: area, p_mes: `${mes}-01` })
    if (gerou.error) return setErro('Não foi possível preparar os gastos do mês. Confira se os arquivos 016 e 017 (gastos fixos) foram rodados no Supabase.')
    const [g, l, ant] = await Promise.all([
      supabase.from('gastos_fixos').select('*').eq('area', area).order('nome'),
      supabase.from('gastos_fixos_mes').select('*').eq('mes', `${mes}-01`).order('vencimento'),
      supabase.from('gastos_fixos_mes').select('gasto_id, valor').eq('mes', `${somarMeses(mes, -1)}-01`),
    ])
    if (g.error || l.error) return setErro('Não foi possível carregar os gastos fixos.')
    const lista = g.data as GastoFixo[]
    const ids = new Set(lista.map((x) => x.id))
    setErro('')
    setGastos(lista)
    setLinhas((l.data as GastoFixoMes[]).filter((x) => ids.has(x.gasto_id)))
    const doAnterior = ((ant.data as { gasto_id: string; valor: number }[]) ?? []).filter((x) => ids.has(x.gasto_id))
    setAnterior(doAnterior.length ? soma(doAnterior, (x) => Number(x.valor)) : null)
  }, [area, mes])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const porId = useMemo(() => new Map((gastos ?? []).map((g) => [g.id, g])), [gastos])
  const total = soma(linhas, (l) => Number(l.valor))
  const pago = soma(linhas.filter((l) => l.status === 'pago'), (l) => Number(l.valor))
  const falta = total - pago

  // avisa a tela de fora (o financeiro pessoal usa para o saldo do mês)
  useEffect(() => {
    onResumo?.({ total, pago, falta })
  }, [total, pago, falta, onResumo])

  const atrasadas = linhas.filter((l) => l.status !== 'pago' && l.vencimento < hoje)
  const estaSemana = linhas.filter((l) => l.status !== 'pago' && l.vencimento >= hoje && diasAte(l.vencimento, hoje) <= 7)
  const pct = total > 0 ? Math.round((pago / total) * 100) : 0

  async function alternar(l: GastoFixoMes) {
    setMsg('')
    const pagar = l.status !== 'pago'
    setLinhas((atual) => atual.map((x) => (x.id === l.id ? { ...x, status: pagar ? 'pago' : 'a_pagar', pago_em: pagar ? hoje : null } : x)))
    const { error } = await supabase.from('gastos_fixos_mes').update({ status: pagar ? 'pago' : 'a_pagar', pago_em: pagar ? hoje : null }).eq('id', l.id)
    if (error) {
      setErro('Não foi possível atualizar.')
      void carregar()
    }
  }

  async function marcarTodosDoDia() {
    const pendentes = linhas.filter((l) => l.status !== 'pago' && l.vencimento <= hoje)
    if (pendentes.length === 0) return
    if (!window.confirm(`Marcar ${pendentes.length} ${pendentes.length === 1 ? 'conta vencida ou que vence hoje' : 'contas vencidas ou que vencem hoje'} como paga${pendentes.length === 1 ? '' : 's'}?`)) return
    const { error } = await supabase.from('gastos_fixos_mes').update({ status: 'pago', pago_em: hoje }).in('id', pendentes.map((x) => x.id))
    if (error) setErro('Não foi possível atualizar.')
    void carregar()
  }

  async function salvarValorDoMes(e: FormEvent) {
    e.preventDefault()
    if (!editandoValor) return
    const { error } = await supabase.from('gastos_fixos_mes').update({ valor: editandoValor.valor }).eq('id', editandoValor.id)
    if (error) return setErro('Não foi possível mudar o valor.')
    setEditandoValor(null)
    void carregar()
  }

  async function salvarDetalhe(e: FormEvent) {
    e.preventDefault()
    if (!detalhe) return
    const campos: Record<string, unknown> = { forma_pagamento: detalhe.forma || null, observacao: detalhe.obs.trim() || null }
    if (detalhe.data) campos.pago_em = detalhe.data
    const { error } = await supabase.from('gastos_fixos_mes').update(campos).eq('id', detalhe.id)
    if (error) return setErro('Não foi possível salvar os detalhes. Confira se o arquivo 017_gastos_fixos_mais.sql foi rodado no Supabase.')
    setDetalhe(null)
    void carregar()
  }

  async function salvarGasto(e: FormEvent) {
    e.preventDefault()
    if (!form || !form.nome.trim()) return
    setErro('')
    setMsg('')
    const parcelado = form.como === 'parcelado'
    const unico = form.como === 'unico'
    // "este mês é a parcela X": o primeiro mês é X−1 meses antes do mês que está na tela
    const inicio = parcelado ? `${somarMeses(mes, -(Math.max(1, form.parcelaAtual) - 1))}-01` : `${mes}-01`
    const campos = {
      area,
      nome: form.nome.trim(),
      categoria: form.categoria,
      valor: form.valor,
      dia_vencimento: Math.min(31, Math.max(1, Math.round(form.dia) || 1)),
      parcelas_total: unico ? 1 : parcelado ? Math.max(2, Math.round(form.parcelas)) : null,
      observacao: form.observacao.trim() || null,
    }
    if (form.id) {
      const { error } = await supabase.from('gastos_fixos').update(campos).eq('id', form.id)
      if (error) return setErro('Não foi possível salvar.')
      // o novo valor vale também para os meses que ainda não foram pagos
      await supabase.from('gastos_fixos_mes').update({ valor: form.valor }).eq('gasto_id', form.id).eq('status', 'a_pagar').gte('mes', `${mes}-01`)
    } else {
      const { error } = await supabase.from('gastos_fixos').insert({ ...campos, mes_inicio: inicio })
      if (error) return setErro('Não foi possível salvar. Confira se os arquivos 016 e 017 (gastos fixos) foram rodados no Supabase.')
    }
    setForm(null)
    setMsg('Gasto salvo.')
    void carregar()
  }

  async function encerrar(g: GastoFixo) {
    if (!window.confirm(`Parar de cobrar "${g.nome}" nos próximos meses? Os meses já lançados continuam no histórico.`)) return
    await supabase.from('gastos_fixos').update({ ativo: false }).eq('id', g.id)
    await supabase.from('gastos_fixos_mes').delete().eq('gasto_id', g.id).eq('status', 'a_pagar').gt('mes', `${mes}-01`)
    void carregar()
  }

  async function reativar(g: GastoFixo) {
    await supabase.from('gastos_fixos').update({ ativo: true }).eq('id', g.id)
    void carregar()
  }

  async function apagar(g: GastoFixo) {
    if (!window.confirm(`Apagar "${g.nome}" e todo o histórico dele?`)) return
    await supabase.from('gastos_fixos').delete().eq('id', g.id)
    void carregar()
  }

  const visiveis = linhas
    .filter((l) => (filtro === 'a_pagar' ? l.status !== 'pago' : filtro === 'atrasados' ? l.status !== 'pago' && l.vencimento < hoje : filtro === 'pagos' ? l.status === 'pago' : true))
    .sort((a, b) => Number(a.status === 'pago') - Number(b.status === 'pago') || a.vencimento.localeCompare(b.vencimento))
  const porCategoria = useMemo(() => {
    const mapa = new Map<string, { total: number; pago: number }>()
    for (const l of linhas) {
      const c = porId.get(l.gasto_id)?.categoria ?? 'Outros'
      const atual = mapa.get(c) ?? { total: 0, pago: 0 }
      atual.total += Number(l.valor)
      if (l.status === 'pago') atual.pago += Number(l.valor)
      mapa.set(c, atual)
    }
    return [...mapa.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [linhas, porId])
  const maior = Math.max(1, ...porCategoria.map(([, v]) => v.total))
  const diferenca = anterior !== null ? total - anterior : null

  const chip = (chave: Filtro, rotulo: string, n: number) => (
    <button key={chave} type="button" aria-pressed={filtro === chave} onClick={() => setFiltro(chave)} className={`min-h-11 cursor-pointer rounded-full border px-4 text-sm transition-colors ${filtro === chave ? 'border-marrom bg-superficie font-medium text-marrom' : 'border-linha text-texto-suave hover:bg-areia'}`}>
      {rotulo} ({n})
    </button>
  )

  const itemLinha = (l: GastoFixoMes) => {
    const g = porId.get(l.gasto_id)
    if (!g) return null
    const feito = l.status === 'pago'
    const atrasado = !feito && l.vencimento < hoje
    const d = diasAte(l.vencimento, hoje)
    const quando = feito ? '' : atrasado ? ` · atrasado ${-d} ${-d === 1 ? 'dia' : 'dias'}` : d === 0 ? ' · vence hoje' : d <= 7 ? ` · vence em ${d} ${d === 1 ? 'dia' : 'dias'}` : ''
    const aberto = detalhe?.id === l.id
    return (
      <li key={l.id} className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
            <input type="checkbox" className="h-6 w-6 cursor-pointer" checked={feito} onChange={() => void alternar(l)} aria-label={`${g.nome} pago`} />
          </label>
          <div className="min-w-48 flex-1">
            <p className={feito ? 'text-texto-suave line-through' : 'font-medium'}>{g.nome}</p>
            <p className="text-xs text-texto-suave">
              {g.categoria}
              {g.parcelas_total === 1 ? ' · só neste mês' : l.parcela_numero && g.parcelas_total ? ` · parcela ${l.parcela_numero} de ${g.parcelas_total}` : ' · todo mês'}
              {` · vence ${formatarData(l.vencimento).slice(0, 5)}`}
              {feito && l.pago_em && ` · pago em ${formatarData(l.pago_em).slice(0, 5)}`}
              {feito && l.forma_pagamento && ` · ${FORMA_ROTULO[l.forma_pagamento]}`}
              {quando && <strong className={atrasado ? 'text-red-800' : 'text-marrom'}>{quando}</strong>}
            </p>
            {l.observacao && <p className="mt-0.5 text-xs italic text-texto-suave">{l.observacao}</p>}
          </div>
          {editandoValor?.id === l.id ? (
            <form onSubmit={salvarValorDoMes} className="flex items-center gap-2">
              <div className="w-28"><NumInput rotulo={`Valor de ${g.nome} neste mês`} valor={editandoValor.valor} onChange={(n) => setEditandoValor({ id: l.id, valor: n })} /></div>
              <button className={btnPrimario}>OK</button>
            </form>
          ) : (
            <button className="min-h-11 cursor-pointer text-right tabular-nums hover:underline" title="Mudar o valor só deste mês (ex.: conta de luz)" onClick={() => setEditandoValor({ id: l.id, valor: Number(l.valor) })}>
              <strong className="font-medium">{reais(Number(l.valor))}</strong>
            </button>
          )}
          <button className="min-h-11 cursor-pointer px-2 text-sm text-texto-suave underline" aria-expanded={aberto} onClick={() => setDetalhe(aberto ? null : { id: l.id, data: l.pago_em ?? hoje, forma: l.forma_pagamento ?? '', obs: l.observacao ?? '' })}>
            Detalhes
          </button>
        </div>
        {aberto && detalhe && (
          <form onSubmit={salvarDetalhe} className="mt-3 grid gap-3 rounded-md bg-areia p-3 sm:grid-cols-4 sm:items-end">
            {feito && <Campo rotulo="Pago em"><input type="date" className={inputCls} max={hoje} value={detalhe.data} onChange={(e) => setDetalhe({ ...detalhe, data: e.target.value })} /></Campo>}
            <Campo rotulo="Forma">
              <select className={inputCls} value={detalhe.forma} onChange={(e) => setDetalhe({ ...detalhe, forma: e.target.value as FormaPagamento | '' })}>
                <option value="">Não informar</option>
                {FORMAS_PAGAMENTO.map((f) => <option key={f} value={f}>{FORMA_ROTULO[f]}</option>)}
              </select>
            </Campo>
            <Campo rotulo="Observação"><input className={inputCls} maxLength={300} value={detalhe.obs} onChange={(e) => setDetalhe({ ...detalhe, obs: e.target.value })} /></Campo>
            <button className={btnPrimario}>Salvar</button>
          </form>
        )}
      </li>
    )
  }

  return (
    <section className="space-y-5" aria-label="Gastos fixos do mês">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="titulo-secao">Gastos fixos <em>do mês</em></h2>
          <p className="text-sm text-texto-suave">Marque o que já pagou. O que é todo mês e as parcelas aparecem sozinhos nos meses seguintes.</p>
        </div>
        <button className={btnPrimario} onClick={() => setForm(novoForm(area))}>Novo gasto fixo</button>
      </div>
      {mesFora === undefined && <NavegacaoMes mes={mes} onMes={trocarMes} />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Cartao className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Falta pagar</p>
              <p className="numeros-grandes mt-1 text-4xl">{reais(falta)}</p>
            </div>
            <p className="text-right text-sm text-texto-suave">
              Pago: <strong>{reais(pago)}</strong> de <strong>{reais(total)}</strong>
              <br />
              {linhas.filter((l) => l.status === 'pago').length} de {linhas.length} itens
            </p>
          </div>
          {total > 0 && (
            <div className="h-2.5 rounded-full bg-areia" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Quanto dos gastos fixos do mês já foi pago">
              <div className="anim-crescer h-2.5 rounded-full bg-musgo" style={{ width: `${pct}%` }} />
            </div>
          )}
          <p className="text-sm text-texto-suave">
            {diferenca === null ? 'Sem mês anterior para comparar.' : diferenca === 0 ? 'Igual ao mês passado.' : `${reais(Math.abs(diferenca))} ${diferenca > 0 ? 'a mais' : 'a menos'} que no mês passado.`}
          </p>
          {atrasadas.length > 0 && (
            <Aviso tipo="erro">
              {atrasadas.length === 1 ? '1 conta passou do vencimento e não foi paga.' : `${atrasadas.length} contas passaram do vencimento e não foram pagas.`} Total: {reais(soma(atrasadas, (x) => Number(x.valor)))}.
              {' '}
              <button className="cursor-pointer underline" onClick={() => void marcarTodosDoDia()}>Marcar vencidas como pagas</button>
            </Aviso>
          )}
          {atrasadas.length === 0 && estaSemana.length > 0 && <p className="text-sm text-marrom">Vencem nos próximos 7 dias: {estaSemana.map((x) => porId.get(x.gasto_id)?.nome).filter(Boolean).join(', ')}.</p>}
        </Cartao>

        {porCategoria.length > 0 && (
          <Cartao className="space-y-3">
            <Titulo>Para onde vai</Titulo>
            <ul className="space-y-2" aria-label="Gastos fixos por categoria">
              {porCategoria.map(([c, v]) => (
                <li key={c} className="grid grid-cols-[7rem_1fr_5.5rem] items-center gap-3 text-sm">
                  <span className="truncate text-texto-suave" title={c}>{c}</span>
                  <span className="h-2 rounded-full bg-areia" aria-hidden>
                    <span className="anim-crescer block h-2 rounded-full bg-oliva" style={{ width: `${(v.total / maior) * 100}%` }} />
                  </span>
                  <span className="text-right tabular-nums">{reais(v.total)}</span>
                </li>
              ))}
            </ul>
          </Cartao>
        )}
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}

      {form && (
        <Cartao>
          <form onSubmit={salvarGasto} className="space-y-4">
            <Titulo>{form.id ? 'Editar gasto fixo' : 'Novo gasto fixo'}</Titulo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome (ex.: Aluguel, Internet, Celular)"><input required autoFocus maxLength={120} className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Campo>
              <Campo rotulo="Categoria">
                <select className={inputCls} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {[...new Set([...CATEGORIAS_GASTO_FIXO[area], form.categoria])].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Valor (R$)"><NumInput rotulo="Valor do gasto" valor={form.valor} onChange={(n) => setForm({ ...form, valor: n })} /></Campo>
              <Campo rotulo="Dia do vencimento"><NumInput rotulo="Dia do vencimento" valor={form.dia} onChange={(n) => setForm({ ...form, dia: n })} /></Campo>
              {!form.id && (
                <Campo rotulo="Como é cobrado">
                  <select className={inputCls} value={form.como} onChange={(e) => setForm({ ...form, como: e.target.value as Como })}>
                    <option value="todo_mes">Todo mês, sem data para acabar</option>
                    <option value="parcelado">Parcelado (tem número de parcelas)</option>
                    <option value="unico">Só neste mês (conta avulsa)</option>
                  </select>
                </Campo>
              )}
              {form.como === 'parcelado' && (
                <>
                  <Campo rotulo="Quantas parcelas no total"><NumInput rotulo="Parcelas no total" valor={form.parcelas} onChange={(n) => setForm({ ...form, parcelas: n })} /></Campo>
                  {!form.id && <Campo rotulo="Este mês é a parcela número"><NumInput rotulo="Parcela deste mês" valor={form.parcelaAtual} onChange={(n) => setForm({ ...form, parcelaAtual: n })} /></Campo>}
                </>
              )}
            </div>
            <Campo rotulo="Observação (opcional)"><input maxLength={500} className={inputCls} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></Campo>
            {form.id && <p className="text-sm text-texto-suave">O novo valor vale também para este mês e os próximos que ainda não foram pagos.</p>}
            <div className="flex gap-3">
              <button className={btnPrimario}>Salvar</button>
              <button type="button" className={btnSecundario} onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </form>
        </Cartao>
      )}

      {gastos !== null && linhas.length === 0 && !form && (
        <p className="text-texto-suave">Nenhum gasto fixo neste mês. Clique em "Novo gasto fixo" para cadastrar o primeiro (aluguel, internet, assinaturas, parcelas...).</p>
      )}

      {linhas.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar gastos fixos">
            {chip('todos', 'Todos', linhas.length)}
            {chip('a_pagar', 'A pagar', linhas.filter((l) => l.status !== 'pago').length)}
            {chip('atrasados', 'Atrasados', atrasadas.length)}
            {chip('pagos', 'Pagos', linhas.filter((l) => l.status === 'pago').length)}
          </div>
          <label className="flex items-center gap-2 text-sm text-texto-suave">
            Agrupar por
            <select className={`${inputCls} !w-auto`} value={agrupar} onChange={(e) => setAgrupar(e.target.value as 'vencimento' | 'categoria')}>
              <option value="vencimento">Vencimento</option>
              <option value="categoria">Categoria</option>
            </select>
          </label>
        </div>
      )}

      {agrupar === 'vencimento' ? (
        <ul className="divide-y divide-linha rounded-[14px] border border-linha bg-superficie shadow-suave">{visiveis.map(itemLinha)}</ul>
      ) : (
        <div className="space-y-4">
          {porCategoria.map(([c, v]) => {
            const doGrupo = visiveis.filter((l) => (porId.get(l.gasto_id)?.categoria ?? 'Outros') === c)
            if (doGrupo.length === 0) return null
            return (
              <section key={c} aria-label={c} className="overflow-hidden rounded-[14px] border border-linha bg-superficie shadow-suave">
                <h3 className="flex items-center justify-between gap-3 bg-areia/60 px-4 py-2 text-sm font-medium">
                  <span>{c}</span>
                  <span className="tabular-nums text-texto-suave">{reais(v.pago)} de {reais(v.total)}</span>
                </h3>
                <ul className="divide-y divide-linha">{doGrupo.map(itemLinha)}</ul>
              </section>
            )
          })}
        </div>
      )}
      {linhas.length > 0 && visiveis.length === 0 && <p className="text-sm text-texto-suave">Nenhum item neste filtro.</p>}

      <div>
        <button className={btnSecundario} onClick={() => setGerenciar(!gerenciar)} aria-expanded={gerenciar}>
          {gerenciar ? 'Esconder os gastos cadastrados' : 'Ver e editar os gastos cadastrados'}
        </button>
      </div>
      {gerenciar && (
        <ul className="divide-y divide-linha rounded-[14px] border border-linha bg-superficie">
          {(gastos ?? []).length === 0 && <li className="p-4 text-sm text-texto-suave">Nenhum gasto cadastrado.</li>}
          {(gastos ?? []).map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-48 flex-1">
                <p className={g.ativo ? 'font-medium' : 'text-texto-suave line-through'}>{g.nome}</p>
                <p className="text-xs text-texto-suave">
                  {g.categoria} · {reais(Number(g.valor))} · dia {g.dia_vencimento} · {g.parcelas_total === 1 ? 'só um mês' : g.parcelas_total ? `${g.parcelas_total} parcelas` : 'todo mês'}
                  {!g.ativo && ' · encerrado'}
                </p>
              </div>
              <button className={btnSecundario} onClick={() => setForm({ id: g.id, nome: g.nome, categoria: g.categoria, valor: Number(g.valor), dia: g.dia_vencimento, como: g.parcelas_total === 1 ? 'unico' : g.parcelas_total ? 'parcelado' : 'todo_mes', parcelas: g.parcelas_total && g.parcelas_total > 1 ? g.parcelas_total : 10, parcelaAtual: 1, observacao: g.observacao ?? '' })}>Editar</button>
              {g.ativo ? <button className={btnSecundario} onClick={() => void encerrar(g)}>Encerrar</button> : <button className={btnSecundario} onClick={() => void reativar(g)}>Reativar</button>}
              <button className="min-h-11 cursor-pointer px-2 text-sm text-red-800 underline" onClick={() => void apagar(g)}>Apagar</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
