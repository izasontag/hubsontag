import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, Esqueleto, inputCls, Titulo } from '../componentes/ui'
import NumInput from '../componentes/NumInput'
import { useAuth } from '../lib/auth'
import { reais } from '../lib/dinheiro'
import { calcular, dadosDoModelo, MODELOS, novoId } from '../lib/precificacao'
import type { DadosOrcamento, LinhaCusto, LinhaTempo, Parametros, TipoOrcamento } from '../lib/precificacao'
import { supabase } from '../lib/supabase'
import type { ConfigPrecificacao, Orcamento } from '../lib/tipos'
import { CONFIG_PADRAO } from './Precificacao'

const STATUS = [['rascunho', 'Rascunho'], ['enviado', 'Enviado ao cliente'], ['fechado', 'Fechado'], ['perdido', 'Perdido']] as const

const parametrosDe = (c: ConfigPrecificacao): Parametros => ({
  valorHora: Number(c.valor_hora),
  impostoPct: Number(c.imposto_pct),
  lucroPct: Number(c.lucro_pct),
  adicionalPct: Number(c.adicional_pct),
  descontoPct: 0,
  cobrado: 0,
  aplicarAdicional: false,
})

function Mini({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-texto-suave">
      {rotulo}
      <span className="mt-1 block">{children}</span>
    </label>
  )
}

interface Opcao {
  id: string
  nome: string
}

export default function OrcamentoPagina() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const novo = id === 'novo'
  const [carregando, setCarregando] = useState(true)
  const [config, setConfig] = useState<ConfigPrecificacao>(CONFIG_PADRAO)
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoOrcamento>('evento')
  const [status, setStatus] = useState<Orcamento['status']>('rascunho')
  const [eventoId, setEventoId] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [dados, setDados] = useState<DadosOrcamento | null>(null)
  const [eventos, setEventos] = useState<Opcao[]>([])
  const [clientes, setClientes] = useState<Opcao[]>([])
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    async function iniciar() {
      const [c, ev, cl] = await Promise.all([
        supabase.from('precificacao_config').select('*').maybeSingle(),
        supabase.from('eventos').select('id, nome').order('data_evento', { ascending: false }),
        supabase.from('clientes').select('id, nome').order('nome'),
      ])
      const cfg = { ...CONFIG_PADRAO, ...((c.data as ConfigPrecificacao | null) ?? {}) }
      setConfig(cfg)
      setEventos((ev.data as Opcao[]) ?? [])
      setClientes((cl.data as Opcao[]) ?? [])
      if (novo) {
        const t = (['evento', 'mensal', 'avulso'] as const).find((x) => x === params.get('tipo')) ?? 'evento'
        setTipo(t)
        setNome(MODELOS[t].rotulo)
        setDados(dadosDoModelo(t, { ...parametrosDe(cfg), aplicarAdicional: false }, Number(cfg.custo_km)))
      } else {
        const { data, error } = await supabase.from('orcamentos').select('*').eq('id', id).maybeSingle()
        if (error || !data) setErro('Orçamento não encontrado.')
        else {
          const o = data as Orcamento
          setNome(o.nome)
          setTipo(o.tipo)
          setStatus(o.status)
          setEventoId(o.evento_id ?? '')
          setClienteId(o.cliente_id ?? '')
          setDados(o.dados)
        }
      }
      setCarregando(false)
    }
    void iniciar()
  }, [id, novo, params])

  const r = useMemo(() => (dados ? calcular(dados) : null), [dados])

  if (perfil && perfil.papel !== 'dona') return <Navigate to="/app" replace />
  if (carregando || !dados || !r) {
    return (
      <div className="space-y-4">
        {erro ? <Aviso tipo="erro">{erro}</Aviso> : <Esqueleto className="h-48" />}
      </div>
    )
  }

  const p = dados.parametros
  const mudarP = (campo: keyof Parametros, valor: number | boolean) => setDados({ ...dados, parametros: { ...p, [campo]: valor } })
  const mudarTempo = (lid: string, campos: Partial<LinhaTempo>) => setDados({ ...dados, tempo: dados.tempo.map((l) => (l.id === lid ? { ...l, ...campos } : l)) })
  const mudarCusto = (lid: string, campos: Partial<LinhaCusto>) => setDados({ ...dados, custos: dados.custos.map((l) => (l.id === lid ? { ...l, ...campos } : l)) })
  const fases = [...new Set(dados.tempo.map((l) => l.fase))]

  async function salvar() {
    if (!dados || !r) return
    setSalvando(true)
    setMsg('')
    setErro('')
    const linha = {
      nome: nome.trim() || 'Orçamento',
      tipo,
      status,
      evento_id: eventoId || null,
      cliente_id: clienteId || null,
      dados,
      horas_total: r.horas,
      preco_sugerido: r.precoSugerido,
      preco_final: r.precoFinal,
    }
    if (novo) {
      const { data, error } = await supabase.from('orcamentos').insert(linha).select('id').single()
      setSalvando(false)
      if (error || !data) return setErro('Não foi possível salvar. Confira se o arquivo 013_precificacao.sql foi rodado no Supabase.')
      navegar(`/app/precificacao/${data.id as string}`, { replace: true })
    } else {
      const { error } = await supabase.from('orcamentos').update(linha).eq('id', id)
      setSalvando(false)
      if (error) return setErro('Não foi possível salvar.')
      setMsg('Orçamento salvo.')
    }
  }

  async function duplicar() {
    if (!dados || !r) return
    const { data, error } = await supabase
      .from('orcamentos')
      .insert({ nome: `${nome} (cópia)`, tipo, status: 'rascunho', evento_id: eventoId || null, cliente_id: clienteId || null, dados, horas_total: r.horas, preco_sugerido: r.precoSugerido, preco_final: r.precoFinal })
      .select('id')
      .single()
    if (error || !data) return setErro('Não foi possível duplicar.')
    navegar(`/app/precificacao/${data.id as string}`)
  }

  async function apagar() {
    if (!window.confirm('Apagar este orçamento?')) return
    const { error } = await supabase.from('orcamentos').delete().eq('id', id)
    if (error) return setErro('Não foi possível apagar.')
    navegar('/app/precificacao')
  }

  async function copiarProposta() {
    if (!dados || !r) return
    const escopo = fases.map((f) => `• ${f}: ${dados.tempo.filter((l) => l.fase === f).map((l) => l.descricao).filter(Boolean).join(', ')}`).join('\n')
    const texto = `Proposta: ${nome}\n\nO que está incluso:\n${escopo}\n\nInvestimento: ${reais(r.precoFinal)}\nSugestão de pagamento: 50% de entrada (${reais(r.precoFinal / 2)}) para reservar a data e 50% no fim.\n\nSontag · Para que todos vejam e saibam.`
    try {
      await navigator.clipboard.writeText(texto)
      setMsg('Proposta copiada. Cole no WhatsApp ou no e-mail. O texto não mostra horas nem custos.')
    } catch {
      setErro('Não deu para copiar sozinho.')
    }
  }

  const alertas: string[] = []
  if (!r.folga) alertas.push('Imposto mais lucro estão altos demais; o cálculo foi limitado.')
  if (p.valorHora <= 0) alertas.push('O valor da hora está zerado, por isso o tempo não entra no preço. Preencha "Valor da sua hora" acima.')
  if (r.precoFinal > 0 && r.lucroReal < 0) alertas.push('Atenção: com este valor você paga para trabalhar. Está abaixo do custo.')
  else if (r.precoFinal > 0 && r.lucroReal < r.custoTotal * 0.1) alertas.push('Margem baixa: sobra pouco depois dos custos e impostos.')

  const faixa = [
    { rotulo: 'Mínimo', valor: r.precoMinimo, nota: 'cobre custos e impostos, sem lucro' },
    { rotulo: 'Recomendado', valor: r.precoSugerido, nota: `com ${p.lucroPct}% de lucro` },
    { rotulo: 'Premium', valor: r.precoPremium, nota: 'lucro 10 pontos maior' },
  ]

  return (
    <div className="space-y-8 pb-24 lg:pb-0">
      <Link to="/app/precificacao" className="inline-flex min-h-11 items-center text-sm text-texto-suave underline decoration-linha underline-offset-4 hover:text-marrom">
        &larr; Voltar para precificação
      </Link>
      <header className="space-y-1">
        <p className="eyebrow">Só você vê</p>
        <h1 className="titulo-pagina">{novo ? 'Novo orçamento' : nome}</h1>
      </header>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Cartao className="space-y-4">
            <Titulo>Sobre o trabalho</Titulo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Nome do orçamento"><input className={inputCls} value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} /></Campo>
              <Campo rotulo="Situação">
                <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as Orcamento['status'])}>
                  {STATUS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Evento (opcional)">
                <select className={inputCls} value={eventoId} onChange={(e) => setEventoId(e.target.value)}>
                  <option value="">Nenhum</option>
                  {eventos.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Cliente (opcional)">
                <select className={inputCls} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Nenhum</option>
                  {clientes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </Campo>
            </div>
          </Cartao>

          <Cartao className={`space-y-3 ${p.valorHora <= 0 ? 'border-mostarda bg-mostarda/30' : ''}`}>
            <Titulo>Valor da sua hora</Titulo>
            <p className="text-sm text-texto-suave">
              É ele que transforma as horas em dinheiro. {p.valorHora <= 0 ? 'Está zerado, então o tempo ainda não entra no preço. Digite abaixo ou calcule a sua hora ideal.' : 'Para calcular a sua hora ideal, use "Minha hora" na tela de precificação.'}
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-40">
                <Campo rotulo="R$ por hora"><NumInput rotulo="Valor da hora" valor={p.valorHora} onChange={(n) => mudarP('valorHora', n)} /></Campo>
              </div>
              <Link to="/app/precificacao" className={btnSecundario}>Calcular minha hora ideal</Link>
            </div>
          </Cartao>

          <Cartao className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Titulo>Tempo de trabalho</Titulo>
              <p className="text-sm text-texto-suave">{r.horas.toLocaleString('pt-BR')} horas no total</p>
            </div>
            <p className="text-sm text-texto-suave">
              Cada linha é horas × quantidade. Para um dia inteiro de cobertura: 8 horas × 1. Para dois dias: 8 horas × 2.
            </p>
            {fases.map((f) => (
              <section key={f} className="space-y-2" aria-label={f}>
                <h3 className="eyebrow">{f}</h3>
                {dados.tempo.filter((l) => l.fase === f).map((l) => (
                  <div key={l.id} className="grid grid-cols-[1fr_1fr_2.75rem] items-end gap-2 rounded-md border border-linha bg-superficie p-3 sm:grid-cols-[1fr_5.5rem_5.5rem_2.75rem] sm:border-0 sm:bg-transparent sm:p-0">
                    <input className={`${inputCls} col-span-3 sm:col-span-1`} aria-label="Descrição" placeholder="O que será feito" value={l.descricao} onChange={(e) => mudarTempo(l.id, { descricao: e.target.value })} />
                    <Mini rotulo="Horas"><NumInput rotulo={`Horas de ${l.descricao}`} valor={l.horas} onChange={(n) => mudarTempo(l.id, { horas: n })} /></Mini>
                    <Mini rotulo="Vezes ou dias"><NumInput rotulo={`Quantidade de ${l.descricao}`} valor={l.qtd} onChange={(n) => mudarTempo(l.id, { qtd: n })} /></Mini>
                    <button className="min-h-11 cursor-pointer text-lg text-texto-suave hover:text-red-800" aria-label={`Remover ${l.descricao}`} onClick={() => setDados({ ...dados, tempo: dados.tempo.filter((x) => x.id !== l.id) })}>×</button>
                  </div>
                ))}
                <button className="min-h-11 cursor-pointer text-sm text-marrom underline" onClick={() => setDados({ ...dados, tempo: [...dados.tempo, { id: novoId(), fase: f, descricao: '', horas: 1, qtd: 1 }] })}>
                  + linha em {f}
                </button>
              </section>
            ))}
            <button className={btnSecundario} onClick={() => setDados({ ...dados, tempo: [...dados.tempo, { id: novoId(), fase: 'Nova fase', descricao: '', horas: 1, qtd: 1 }] })}>Nova fase</button>
            
          </Cartao>

          <Cartao className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Titulo>Custos diretos</Titulo>
              <p className="text-sm text-texto-suave">{reais(r.custosDiretos)}</p>
            </div>
            <p className="text-sm text-texto-suave">Gasta só por causa deste trabalho: deslocamento, alimentação, assistente, aluguel de equipamento.</p>
            {dados.custos.map((c) => (
              <div key={c.id} className="grid grid-cols-[1fr_1fr_2.75rem] items-end gap-2 rounded-md border border-linha bg-superficie p-3 sm:grid-cols-[1fr_6rem_5.5rem_2.75rem] sm:border-0 sm:bg-transparent sm:p-0">
                <input className={`${inputCls} col-span-3 sm:col-span-1`} aria-label="Descrição do custo" placeholder="Qual é o gasto" value={c.descricao} onChange={(e) => mudarCusto(c.id, { descricao: e.target.value })} />
                <Mini rotulo="Valor (R$)"><NumInput rotulo={`Valor de ${c.descricao}`} valor={c.valor} onChange={(n) => mudarCusto(c.id, { valor: n })} /></Mini>
                <Mini rotulo="Quantidade"><NumInput rotulo={`Quantidade de ${c.descricao}`} valor={c.qtd} onChange={(n) => mudarCusto(c.id, { qtd: n })} /></Mini>
                <button className="min-h-11 cursor-pointer text-lg text-texto-suave hover:text-red-800" aria-label={`Remover ${c.descricao}`} onClick={() => setDados({ ...dados, custos: dados.custos.filter((x) => x.id !== c.id) })}>×</button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button className={btnSecundario} onClick={() => setDados({ ...dados, custos: [...dados.custos, { id: novoId(), descricao: '', valor: 0, qtd: 1 }] })}>Novo custo</button>
              <button className={btnSecundario} onClick={() => setDados({ ...dados, custos: [...dados.custos, { id: novoId(), descricao: 'Deslocamento (km)', valor: Number(config.custo_km), qtd: 40 }] })}>Deslocamento por km</button>
              <button className={btnSecundario} onClick={() => setDados({ ...dados, custos: [...dados.custos, { id: novoId(), descricao: 'Assistente (diária)', valor: 200, qtd: 1 }] })}>Assistente</button>
            </div>
            
          </Cartao>

          <Cartao className="space-y-4">
            <Titulo>Ajustes deste orçamento</Titulo>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo rotulo="Lucro desejado (% do preço)"><NumInput rotulo="Lucro desejado" valor={p.lucroPct} onChange={(n) => mudarP('lucroPct', n)} /></Campo>
              <Campo rotulo="Impostos (% do preço)"><NumInput rotulo="Impostos" valor={p.impostoPct} onChange={(n) => mudarP('impostoPct', n)} /></Campo>
              <Campo rotulo="Desconto para o cliente (%)"><NumInput rotulo="Desconto" valor={p.descontoPct} onChange={(n) => mudarP('descontoPct', n)} /></Campo>
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" className="h-5 w-5" checked={p.aplicarAdicional} onChange={(e) => mudarP('aplicarAdicional', e.target.checked)} />
              É fim de semana, feriado ou urgente: somar {p.adicionalPct}% sobre o tempo
            </label>
            {p.aplicarAdicional && (
              <Campo rotulo="Adicional (%)"><NumInput rotulo="Adicional" valor={p.adicionalPct} onChange={(n) => mudarP('adicionalPct', n)} /></Campo>
            )}
          </Cartao>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start" aria-label="Resumo do orçamento">
          <div className="bilhete nota-papel space-y-5 p-6">
            <p className="eyebrow">Preço recomendado</p>
            <p className="numeros-grandes text-5xl" aria-live="polite">{reais(r.precoSugerido)}</p>
            <ul className="grid gap-2 text-sm">
              {faixa.map((f) => (
                <li key={f.rotulo} className="flex items-baseline justify-between gap-3 border-b border-linha pb-2">
                  <span><strong>{f.rotulo}</strong> <span className="text-texto-suave">· {f.nota}</span></span>
                  <span className="numeros-grandes">{reais(f.valor)}</span>
                </li>
              ))}
            </ul>
            <Campo rotulo="Quanto vou cobrar de verdade (R$, opcional)">
              <NumInput key="cobrado" rotulo="Valor cobrado" valor={p.cobrado} onChange={(n) => mudarP('cobrado', n)} />
            </Campo>
            <dl className="space-y-1.5 text-sm">
              {[
                ['Tempo de trabalho', r.custoTempo],
                ...(r.adicional > 0 ? ([['Adicional', r.adicional]] as const) : []),
                ['Custos diretos', r.custosDiretos],
                ['Custo total', r.custoTotal],
                ['Impostos', r.imposto],
                ['Lucro que sobra', r.lucroReal],
              ].map(([k, v]) => (
                <div key={k as string} className={`flex justify-between gap-3 ${k === 'Custo total' || k === 'Lucro que sobra' ? 'font-medium' : ''}`}>
                  <dt className="text-texto-suave">{k}</dt>
                  <dd className="numeros-grandes">{reais(v as number)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-linha pt-2 font-medium">
                <dt>Valor final</dt>
                <dd className="numeros-grandes text-lg">{reais(r.precoFinal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-texto-suave">Sobra por hora trabalhada</dt>
                <dd className="numeros-grandes">{reais(r.valorPorHora)}</dd>
              </div>
            </dl>
            {alertas.map((a) => <Aviso key={a} tipo="erro">{a}</Aviso>)}
          </div>
          <div className="flex flex-wrap gap-3">
            <button className={btnPrimario} disabled={salvando} onClick={() => void salvar()}>{salvando ? 'Salvando…' : 'Salvar orçamento'}</button>
            <button className={btnSecundario} onClick={() => void copiarProposta()}>Copiar proposta</button>
            {!novo && <button className={btnSecundario} onClick={() => void duplicar()}>Duplicar</button>}
            {!novo && <button className={`${btnSecundario} !text-red-800`} onClick={() => void apagar()}>Apagar</button>}
          </div>
          {msg && <Aviso tipo="ok">{msg}</Aviso>}
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-linha bg-superficie px-4 py-3 shadow-elevada lg:hidden">
        <div>
          <p className="eyebrow">Preço recomendado</p>
          <p className="numeros-grandes text-2xl">{reais(r.precoSugerido)}</p>
        </div>
        <button className={btnPrimario} disabled={salvando} onClick={() => void salvar()}>Salvar</button>
      </div>
    </div>
  )
}
