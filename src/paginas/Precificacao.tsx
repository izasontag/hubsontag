import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Aviso, btnPrimario, btnSecundario, Campo, Cartao, CabecalhoPagina, Titulo } from '../componentes/ui'
import NumInput from '../componentes/NumInput'
import { useAuth } from '../lib/auth'
import { reais, reaisInteiro } from '../lib/dinheiro'
import { valorDaHora } from '../lib/precificacao'
import { supabase } from '../lib/supabase'
import type { ConfigPrecificacao, Orcamento } from '../lib/tipos'
import { Navigate } from 'react-router-dom'

export const CONFIG_PADRAO: ConfigPrecificacao = {
  renda_desejada: 0,
  custos_fixos: 0,
  dias_mes: 20,
  horas_dia: 8,
  pct_faturavel: 60,
  valor_hora: 0,
  imposto_pct: 6,
  lucro_pct: 25,
  adicional_pct: 20,
  custo_km: 1.5,
}

const TIPO_ROTULO = { evento: 'Evento', mensal: 'Mensal', avulso: 'Avulso' } as const
const STATUS_ROTULO_ORC = { rascunho: 'Rascunho', enviado: 'Enviado', fechado: 'Fechado', perdido: 'Perdido' } as const

function MinhaHora({ config, onSalvo }: { config: ConfigPrecificacao; onSalvo: (c: ConfigPrecificacao) => void }) {
  const [c, setC] = useState(config)
  const [aberto, setAberto] = useState(config.valor_hora === 0)
  const [msg, setMsg] = useState('')
  const [erro, setErro] = useState('')
  const ideal = valorDaHora(c.renda_desejada, c.custos_fixos, c.dias_mes, c.horas_dia, c.pct_faturavel)
  const mudar = (campo: keyof ConfigPrecificacao) => (n: number) => setC((x) => ({ ...x, [campo]: n }))

  async function salvar() {
    setMsg('')
    setErro('')
    if (c.imposto_pct + c.lucro_pct >= 95) return setErro('Imposto mais lucro precisam somar menos de 95%.')
    const { error } = await supabase.from('precificacao_config').upsert({ id: 1, ...c })
    if (error) return setErro('Não foi possível salvar. Confira se o arquivo 013_precificacao.sql foi rodado no Supabase.')
    onSalvo(c)
    setMsg('Salvo. Os próximos orçamentos já usam estes valores.')
  }

  return (
    <Cartao className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Titulo>Minha hora</Titulo>
          <p className="numeros-grandes mt-1 text-4xl">{reais(config.valor_hora)}<span className="ml-2 text-base text-texto-suave">por hora</span></p>
        </div>
        <button className={btnSecundario} onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
          {aberto ? 'Fechar' : 'Ajustar minha hora'}
        </button>
      </div>
      {aberto && (
        <div className="space-y-5">
          <p className="text-sm text-texto-suave">
            Sua hora não é só o que você quer ganhar: ela precisa pagar os custos da agência e considerar que nem todo o seu tempo vira trabalho pago
            (reuniões, propostas, e-mails). Preencha e eu calculo.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo rotulo="Quanto quer ganhar por mês (R$)"><NumInput rotulo="Quanto quer ganhar por mês" valor={c.renda_desejada} onChange={mudar('renda_desejada')} /></Campo>
            <Campo rotulo="Custos fixos por mês (R$)"><NumInput rotulo="Custos fixos por mês" valor={c.custos_fixos} onChange={mudar('custos_fixos')} /></Campo>
            <Campo rotulo="Dias trabalhados por mês"><NumInput rotulo="Dias trabalhados por mês" valor={c.dias_mes} onChange={mudar('dias_mes')} /></Campo>
            <Campo rotulo="Horas de trabalho por dia"><NumInput rotulo="Horas de trabalho por dia" valor={c.horas_dia} onChange={mudar('horas_dia')} /></Campo>
            <Campo rotulo="% do tempo que vira trabalho pago"><NumInput rotulo="Percentual do tempo faturável" valor={c.pct_faturavel} onChange={mudar('pct_faturavel')} /></Campo>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-md bg-areia p-4">
            <p className="text-sm">
              Sua hora ideal: <strong className="numeros-grandes text-xl">{reais(ideal)}</strong>
            </p>
            <button className={btnSecundario} onClick={() => setC((x) => ({ ...x, valor_hora: ideal }))}>Usar este valor</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Campo rotulo="Valor da hora que vou usar (R$)"><NumInput key={c.valor_hora} rotulo="Valor da hora que vou usar" valor={c.valor_hora} onChange={mudar('valor_hora')} /></Campo>
            <Campo rotulo="Impostos (% do preço)"><NumInput rotulo="Impostos" valor={c.imposto_pct} onChange={mudar('imposto_pct')} /></Campo>
            <Campo rotulo="Lucro desejado (% do preço)"><NumInput rotulo="Lucro desejado" valor={c.lucro_pct} onChange={mudar('lucro_pct')} /></Campo>
            <Campo rotulo="Adicional fim de semana, feriado ou urgência (%)"><NumInput rotulo="Adicional" valor={c.adicional_pct} onChange={mudar('adicional_pct')} /></Campo>
            <Campo rotulo="Custo por km rodado (R$)"><NumInput rotulo="Custo por km" valor={c.custo_km} onChange={mudar('custo_km')} /></Campo>
          </div>
          <button className={btnPrimario} onClick={() => void salvar()}>Salvar minha hora e meus percentuais</button>
          {msg && <Aviso tipo="ok">{msg}</Aviso>}
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
        </div>
      )}
    </Cartao>
  )
}

export default function Precificacao() {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const [config, setConfig] = useState<ConfigPrecificacao | null>(null)
  const [lista, setLista] = useState<Orcamento[] | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    const [c, o] = await Promise.all([
      supabase.from('precificacao_config').select('*').maybeSingle(),
      supabase.from('orcamentos').select('*').order('atualizado_em', { ascending: false }),
    ])
    if (c.error || o.error) {
      setErro('Não foi possível carregar. Confira se o arquivo 013_precificacao.sql foi rodado no Supabase.')
      setConfig(CONFIG_PADRAO)
      setLista([])
      return
    }
    setConfig({ ...CONFIG_PADRAO, ...((c.data as ConfigPrecificacao | null) ?? {}) })
    setLista(o.data as Orcamento[])
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  if (perfil && perfil.papel !== 'dona') return <Navigate to="/app" replace />

  const aberto = (lista ?? []).filter((o) => o.status === 'enviado').reduce((t, o) => t + Number(o.preco_final), 0)
  const fechado = (lista ?? []).filter((o) => o.status === 'fechado').reduce((t, o) => t + Number(o.preco_final), 0)

  return (
    <div className="space-y-8">
      <CabecalhoPagina rotulo="Só você vê esta área" titulo={<>Precificação <em>inteligente</em></>} />
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {config && <MinhaHora config={config} onSalvo={setConfig} />}

      <section className="space-y-4" aria-label="Novo orçamento">
        <h2 className="titulo-secao">Novo <em>orçamento</em></h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(['evento', 'mensal', 'avulso'] as const).map((t) => (
            <button key={t} onClick={() => navegar(`/app/precificacao/novo?tipo=${t}`)} className="bilhete nota-papel cursor-pointer p-5 text-left transition-transform duration-300 hover:-translate-y-1">
              <span className="eyebrow">{TIPO_ROTULO[t]}</span>
              <span className="mt-1 block font-titulo text-xl font-semibold">
                {t === 'evento' ? 'Cobertura de evento' : t === 'mensal' ? 'Social media mensal' : 'Trabalho avulso'}
              </span>
              <span className="mt-1 block text-sm text-texto-suave">
                {t === 'evento' ? 'Dias, horas no local, deslocamento e edição' : t === 'mensal' ? 'Posts, reels, captação e atendimento do mês' : 'Qualquer projeto fora do mensal'}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-label="Orçamentos salvos">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="titulo-secao">Orçamentos <em>salvos</em></h2>
          {lista && lista.length > 0 && (
            <p className="text-sm text-texto-suave">
              Enviados, esperando resposta: <strong>{reaisInteiro(aberto)}</strong> · Fechados: <strong>{reaisInteiro(fechado)}</strong>
            </p>
          )}
        </div>
        {lista?.length === 0 && <p className="text-texto-suave">Nenhum orçamento ainda. Escolha um tipo acima para começar.</p>}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(lista ?? []).map((o) => (
            <li key={o.id}>
              <Link to={`/app/precificacao/${o.id}`} className="block h-full rounded-[18px] border border-linha bg-superficie p-5 shadow-suave transition-transform duration-300 hover:-translate-y-1">
                <p className="eyebrow">{TIPO_ROTULO[o.tipo]} · {STATUS_ROTULO_ORC[o.status]}</p>
                <p className="mt-1 truncate font-titulo text-xl font-semibold">{o.nome}</p>
                <p className="numeros-grandes mt-3 text-3xl">{reais(Number(o.preco_final))}</p>
                <p className="mt-1 text-sm text-texto-suave">{Number(o.horas_total).toLocaleString('pt-BR')} horas de trabalho</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
