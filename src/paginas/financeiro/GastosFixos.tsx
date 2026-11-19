import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { NavegacaoMes } from '../../componentes/CalendarioMensal'
import NumInput from '../../componentes/NumInput'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, formatarData, inputCls, Titulo } from '../../componentes/ui'
import { dataDeHoje, mesDeHoje, somarMeses } from '../../lib/datas'
import { reais, soma } from '../../lib/dinheiro'
import { supabase } from '../../lib/supabase'
import { CATEGORIAS_GASTO_FIXO } from '../../lib/tipos'
import type { GastoFixo, GastoFixoMes } from '../../lib/tipos'

type Area = 'pessoal' | 'agencia'

interface Form {
  id: string | null
  nome: string
  categoria: string
  valor: number
  dia: number
  tipo: 'todo_mes' | 'parcelado'
  parcelas: number
  parcelaAtual: number
  observacao: string
}

const novoForm = (area: Area): Form => ({ id: null, nome: '', categoria: CATEGORIAS_GASTO_FIXO[area][0], valor: 0, dia: 5, tipo: 'todo_mes', parcelas: 10, parcelaAtual: 1, observacao: '' })

// Checklist de gastos fixos do mês: o que é todo mês ou parcelado, pago ou não pago.
// Se `mes` vier de fora, a tela do pai controla o mês e esta não mostra a navegação.
export default function GastosFixos({ area, mes: mesFora, onMes }: { area: Area; mes?: string; onMes?: (m: string) => void }) {
  const [mesLocal, setMesLocal] = useState(mesDeHoje())
  const mes = mesFora ?? mesLocal
  const trocarMes = onMes ?? setMesLocal
  const hoje = dataDeHoje()
  const [gastos, setGastos] = useState<GastoFixo[] | null>(null)
  const [linhas, setLinhas] = useState<GastoFixoMes[]>([])
  const [form, setForm] = useState<Form | null>(null)
  const [editandoValor, setEditandoValor] = useState<{ id: string; valor: number } | null>(null)
  const [gerenciar, setGerenciar] = useState(false)
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    // cria as linhas do mês que ainda não existem (recorrentes e parcelas)
    const gerou = await supabase.rpc('gerar_gastos_fixos', { p_area: area, p_mes: `${mes}-01` })
    if (gerou.error) return setErro('Não foi possível preparar os gastos do mês. Confira se o arquivo 016_gastos_fixos.sql foi rodado no Supabase.')
    const [g, l] = await Promise.all([
      supabase.from('gastos_fixos').select('*').eq('area', area).order('nome'),
      supabase.from('gastos_fixos_mes').select('*').eq('mes', `${mes}-01`).order('vencimento'),
    ])
    if (g.error || l.error) return setErro('Não foi possível carregar os gastos fixos.')
    const lista = g.data as GastoFixo[]
    const ids = new Set(lista.map((x) => x.id))
    setErro('')
    setGastos(lista)
    setLinhas((l.data as GastoFixoMes[]).filter((x) => ids.has(x.gasto_id)))
  }, [area, mes])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const porId = new Map((gastos ?? []).map((g) => [g.id, g]))

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

  async function salvarValorDoMes(e: FormEvent) {
    e.preventDefault()
    if (!editandoValor) return
    const { error } = await supabase.from('gastos_fixos_mes').update({ valor: editandoValor.valor }).eq('id', editandoValor.id)
    if (error) return setErro('Não foi possível mudar o valor.')
    setEditandoValor(null)
    void carregar()
  }

  async function salvarGasto(e: FormEvent) {
    e.preventDefault()
    if (!form || !form.nome.trim()) return
    setErro('')
    setMsg('')
    const parcelado = form.tipo === 'parcelado'
    // "este mês é a parcela X": o primeiro mês é X−1 meses antes do mês que está na tela
    const inicio = parcelado ? `${somarMeses(mes, -(Math.max(1, form.parcelaAtual) - 1))}-01` : `${mes}-01`
    const campos = {
      area,
      nome: form.nome.trim(),
      categoria: form.categoria,
      valor: form.valor,
      dia_vencimento: Math.min(31, Math.max(1, Math.round(form.dia) || 1)),
      parcelas_total: parcelado ? Math.max(2, Math.round(form.parcelas)) : null,
      observacao: form.observacao.trim() || null,
    }
    if (form.id) {
      const { error } = await supabase.from('gastos_fixos').update(campos).eq('id', form.id)
      if (error) return setErro('Não foi possível salvar.')
      // o novo valor vale também para os meses que ainda não foram pagos
      await supabase.from('gastos_fixos_mes').update({ valor: form.valor }).eq('gasto_id', form.id).eq('status', 'a_pagar').gte('mes', `${mes}-01`)
    } else {
      const { error } = await supabase.from('gastos_fixos').insert({ ...campos, mes_inicio: inicio })
      if (error) return setErro('Não foi possível salvar. Confira se o arquivo 016_gastos_fixos.sql foi rodado no Supabase.')
    }
    setForm(null)
    setMsg('Gasto salvo.')
    void carregar()
  }

  async function encerrar(g: GastoFixo) {
    if (!window.confirm(`Parar de cobrar "${g.nome}" nos próximos meses? Os meses já lançados continuam no histórico.`)) return
    await supabase.from('gastos_fixos').update({ ativo: false }).eq('id', g.id)
    // tira dos meses futuros que ainda não foram pagos
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

  const total = soma(linhas, (l) => Number(l.valor))
  const pago = soma(linhas.filter((l) => l.status === 'pago'), (l) => Number(l.valor))
  const falta = total - pago
  const atrasadas = linhas.filter((l) => l.status !== 'pago' && l.vencimento < hoje)
  const pct = total > 0 ? Math.round((pago / total) * 100) : 0
  const ordenadas = [...linhas].sort((a, b) => Number(a.status === 'pago') - Number(b.status === 'pago') || a.vencimento.localeCompare(b.vencimento))

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

      <Cartao className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Falta pagar</p>
            <p className="numeros-grandes mt-1 text-4xl">{reais(falta)}</p>
          </div>
          <p className="text-sm text-texto-suave">
            Pago: <strong>{reais(pago)}</strong> de <strong>{reais(total)}</strong> · {linhas.filter((l) => l.status === 'pago').length} de {linhas.length} itens
          </p>
        </div>
        {total > 0 && (
          <div className="h-2 rounded-full bg-areia" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Quanto dos gastos fixos do mês já foi pago">
            <div className="anim-crescer h-2 rounded-full bg-musgo" style={{ width: `${pct}%` }} />
          </div>
        )}
        {atrasadas.length > 0 && <Aviso tipo="erro">{atrasadas.length === 1 ? '1 gasto passou do vencimento e não foi pago.' : `${atrasadas.length} gastos passaram do vencimento e não foram pagos.`}</Aviso>}
      </Cartao>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {msg && <Aviso tipo="ok">{msg}</Aviso>}

      {form && (
        <Cartao>
          <form onSubmit={salvarGasto} className="space-y-4">
            <Titulo>{form.id ? 'Editar gasto fixo' : 'Novo gasto fixo'}</Titulo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome (ex.: Aluguel, Internet, Celular)"><input required maxLength={120} className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Campo>
              <Campo rotulo="Categoria">
                <select className={inputCls} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {CATEGORIAS_GASTO_FIXO[area].map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Valor (R$)"><NumInput rotulo="Valor do gasto" valor={form.valor} onChange={(n) => setForm({ ...form, valor: n })} /></Campo>
              <Campo rotulo="Dia do vencimento"><NumInput rotulo="Dia do vencimento" valor={form.dia} onChange={(n) => setForm({ ...form, dia: n })} /></Campo>
              {!form.id && (
                <Campo rotulo="Como é cobrado">
                  <select className={inputCls} value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as Form['tipo'] })}>
                    <option value="todo_mes">Todo mês, sem data para acabar</option>
                    <option value="parcelado">Parcelado (tem número de parcelas)</option>
                  </select>
                </Campo>
              )}
              {form.tipo === 'parcelado' && (
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

      <ul className="divide-y divide-linha rounded-[14px] border border-linha bg-superficie shadow-suave">
        {ordenadas.map((l) => {
          const g = porId.get(l.gasto_id)
          if (!g) return null
          const feito = l.status === 'pago'
          const atrasado = !feito && l.vencimento < hoje
          return (
            <li key={l.id} className="flex flex-wrap items-center gap-3 p-4">
              <label className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center">
                <input type="checkbox" className="h-6 w-6 cursor-pointer" checked={feito} onChange={() => void alternar(l)} aria-label={`${g.nome} pago`} />
              </label>
              <div className="min-w-48 flex-1">
                <p className={feito ? 'text-texto-suave line-through' : 'font-medium'}>{g.nome}</p>
                <p className="text-xs text-texto-suave">
                  {g.categoria}
                  {l.parcela_numero && g.parcelas_total ? ` · parcela ${l.parcela_numero} de ${g.parcelas_total}` : ' · todo mês'}
                  {` · vence ${formatarData(l.vencimento).slice(0, 5)}`}
                  {feito && l.pago_em && ` · pago em ${formatarData(l.pago_em).slice(0, 5)}`}
                  {atrasado && <strong className="text-red-800"> · atrasado</strong>}
                </p>
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
            </li>
          )
        })}
      </ul>

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
                  {g.categoria} · {reais(Number(g.valor))} · dia {g.dia_vencimento} · {g.parcelas_total ? `${g.parcelas_total} parcelas` : 'todo mês'}
                  {!g.ativo && ' · encerrado'}
                </p>
              </div>
              <button className={btnSecundario} onClick={() => setForm({ id: g.id, nome: g.nome, categoria: g.categoria, valor: Number(g.valor), dia: g.dia_vencimento, tipo: g.parcelas_total ? 'parcelado' : 'todo_mes', parcelas: g.parcelas_total ?? 10, parcelaAtual: 1, observacao: g.observacao ?? '' })}>Editar</button>
              {g.ativo ? <button className={btnSecundario} onClick={() => void encerrar(g)}>Encerrar</button> : <button className={btnSecundario} onClick={() => void reativar(g)}>Reativar</button>}
              <button className="min-h-11 cursor-pointer px-2 text-sm text-red-800 underline" onClick={() => void apagar(g)}>Apagar</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
