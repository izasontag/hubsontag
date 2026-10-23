import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { NumeroAnimado, Revelar } from '../componentes/animacao'
import AtalhosPainel from '../componentes/AtalhosPainel'
import { MiniaturaMidia } from '../componentes/Midias'
import { SeloStatus } from '../componentes/Selos'
import { btnPrimario, btnSecundario, CabecalhoPagina, Cartao, formatarData } from '../componentes/ui'
import VersiculoDoDia from '../componentes/VersiculoDoDia'
import { useAuth } from '../lib/auth'
import { contagem, dataDeHoje } from '../lib/datas'
import { paraVista } from '../lib/midias'
import { supabase } from '../lib/supabase'
import { TIPO_TAREFA_ROTULO } from '../lib/tipos'
import type { Evento, PostCompleto, TipoTarefa } from '../lib/tipos'

const somarDias = (data: string, dias: number) => {
  const [a, m, d] = data.split('-').map(Number)
  const n = new Date(a, m - 1, d + dias)
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function saudacao(agora: Date) {
  const h = agora.getHours()
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
}

interface TarefaResumo {
  id: string
  titulo: string
  data: string | null
  tipo: TipoTarefa
  cliente: { nome: string } | null
}

export default function Painel() {
  const { perfil } = useAuth()
  const dona = perfil?.papel === 'dona'
  const [ativos, setAtivos] = useState<number | null>(null)
  const [aguardando, setAguardando] = useState<number | null>(null)
  const [ajustes, setAjustes] = useState<number | null>(null)
  const [atrasadas, setAtrasadas] = useState<number | null>(null)
  const [cobrancasAtrasadas, setCobrancasAtrasadas] = useState<number | null>(null)
  const [contratosVencendo, setContratosVencendo] = useState<number | null>(null)
  const [proximos, setProximos] = useState<PostCompleto[] | null>(null)
  const [tarefas, setTarefas] = useState<TarefaResumo[] | null>(null)
  const [proximoEvento, setProximoEvento] = useState<Evento | null>(null)
  const [agora] = useState(() => new Date())

  useEffect(() => {
    const hoje = dataDeHoje()
    supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('status', 'ativo').then(({ count }) => setAtivos(count ?? 0))
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'em_aprovacao').then(({ count }) => setAguardando(count ?? 0))
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'ajuste_pedido').then(({ count }) => setAjustes(count ?? 0))
    supabase.from('tarefas').select('id', { count: 'exact', head: true }).neq('status', 'feito').lt('data', hoje).then(({ count }) => setAtrasadas(count ?? 0))
    supabase
      .from('tarefas')
      .select('id, titulo, data, tipo, cliente:clientes(nome)')
      .neq('status', 'feito')
      .not('data', 'is', null)
      .lte('data', somarDias(hoje, 7))
      .order('data')
      .limit(6)
      .then(({ data }) => setTarefas((data as unknown as TarefaResumo[]) ?? []))
    if (dona) {
      supabase.from('cobrancas').select('id', { count: 'exact', head: true }).neq('status', 'pago').lt('vencimento', hoje).then(({ count }) => setCobrancasAtrasadas(count ?? 0))
      supabase.from('contratos').select('id', { count: 'exact', head: true }).eq('status', 'ativo').lte('renovacao', somarDias(hoje, 30)).then(({ count }) => setContratosVencendo(count ?? 0))
    }
    supabase
      .from('eventos')
      .select('*')
      .gte('data_evento', hoje)
      .neq('status', 'cancelado')
      .order('data_evento')
      .limit(1)
      .then(({ data }) => setProximoEvento(((data as Evento[]) ?? [])[0] ?? null))
    supabase
      .from('posts')
      .select('*, cliente:clientes(nome, cor_destaque), post_tags(tag_id), post_midias(id, post_id, caminho_storage, ordem, tipo, link_externo, capa_storage)')
      .gte('data_publicacao', hoje)
      .lte('data_publicacao', somarDias(hoje, 7))
      .order('data_publicacao')
      .limit(8)
      .then(({ data }) => setProximos((data as PostCompleto[]) ?? []))
  }, [dona])

  const hoje = dataDeHoje()
  const dataLonga = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const primeiroNome = perfil?.nome.split(' ')[0] ?? ''

  const indicadores: { rotulo: string; valor: number | null; para: string; destaque?: boolean }[] = [
    { rotulo: 'Clientes ativos', valor: ativos, para: '/app/clientes' },
    { rotulo: 'Esperando aprovação do cliente', valor: aguardando, para: '/app/calendario' },
    { rotulo: 'Ajustes pedidos', valor: ajustes, para: '/app/calendario', destaque: (ajustes ?? 0) > 0 },
    { rotulo: 'Tarefas atrasadas', valor: atrasadas, para: '/app/tarefas', destaque: (atrasadas ?? 0) > 0 },
    ...(dona
      ? [
          { rotulo: 'Cobranças atrasadas', valor: cobrancasAtrasadas, para: '/app/financeiro?aba=cobrancas', destaque: (cobrancasAtrasadas ?? 0) > 0 },
          { rotulo: 'Contratos vencendo em 30 dias', valor: contratosVencendo, para: '/app/financeiro?aba=contratos', destaque: (contratosVencendo ?? 0) > 0 },
        ]
      : []),
  ]

  return (
    <div className="space-y-10">
      <CabecalhoPagina
        rotulo={`Storymaker & Marketing · ${dataLonga}`}
        titulo={
          <>
            {saudacao(agora)}, <em>{primeiroNome}</em>
          </>
        }
        acoes={
          <div className="flex flex-wrap gap-3">
            <Link to="/app/ideias" className={btnSecundario}>
              Anotar uma ideia
            </Link>
            <Link to="/app/clientes" className={btnPrimario}>
              Abrir clientes
            </Link>
          </div>
        }
      />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* coluna da direita no computador; no celular vem primeiro */}
        <aside className="space-y-6 xl:col-start-2 xl:row-start-1">
          <VersiculoDoDia />

          {proximoEvento && (
            <Link
              to={`/app/eventos/${proximoEvento.id}`}
              className="anim-entrar group block space-y-2 rounded-md border border-marrom bg-marrom-claro p-5 shadow-suave transition duration-300 hover:-translate-y-0.5 hover:shadow-elevada"
            >
              <span className="eyebrow block">Próximo evento</span>
              <span className="block font-titulo text-3xl font-semibold leading-tight">{proximoEvento.nome}</span>
              <span className="flex items-center justify-between gap-3 text-sm text-texto-suave">
                <span>
                  {formatarData(proximoEvento.data_evento)}
                  {proximoEvento.local && ` · ${proximoEvento.local}`}
                </span>
                <span className="flex items-center gap-2 text-base text-marrom">
                  {contagem(proximoEvento.data_evento)}
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                    &rarr;
                  </span>
                </span>
              </span>
            </Link>
          )}

          <Cartao className="space-y-3">
            <h2 className="titulo-sub">Tarefas da semana</h2>
            {tarefas === null && <p className="anim-respirar text-sm text-texto-suave">Carregando...</p>}
            {tarefas?.length === 0 && <p className="text-sm text-texto-suave">Nada pendente para os próximos 7 dias.</p>}
            <ul className="divide-y divide-linha">
              {tarefas?.map((t) => {
                const atrasada = t.data !== null && t.data < hoje
                return (
                  <li key={t.id} className="py-2.5 text-sm">
                    <p>{t.titulo}</p>
                    <p className="text-xs text-texto-suave">
                      {t.cliente?.nome ?? 'Agência'} · {TIPO_TAREFA_ROTULO[t.tipo]}
                      {t.data && ` · ${formatarData(t.data).slice(0, 5)}`}
                      {atrasada && <strong className="font-medium text-marrom"> · atrasada</strong>}
                    </p>
                  </li>
                )
              })}
            </ul>
            <Link to="/app/tarefas" className="inline-flex min-h-11 items-center text-sm text-musgo underline underline-offset-4">
              Ver todas as tarefas
            </Link>
          </Cartao>
        </aside>

        <div className="space-y-10 xl:col-start-1 xl:row-start-1">
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {indicadores.map((i, n) => (
              <li key={i.rotulo} className="anim-entrar" style={{ '--i': n + 1 } as CSSProperties}>
                <Link
                  to={i.para}
                  className={`group flex h-full flex-col justify-between gap-6 rounded-md border bg-superficie p-5 shadow-suave transition duration-300 hover:-translate-y-1 hover:shadow-elevada ${
                    i.destaque ? 'border-marrom bg-marrom-claro' : 'border-linha'
                  }`}
                >
                  <span className="eyebrow">{i.rotulo}</span>
                  <span className="flex items-end justify-between">
                    <span className="numeros-grandes text-6xl font-medium leading-none text-texto">
                      <NumeroAnimado valor={i.valor} />
                    </span>
                    <span aria-hidden className="pb-1 text-xl text-texto-suave transition-transform duration-300 group-hover:translate-x-1 group-hover:text-marrom">
                      &rarr;
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <section className="space-y-4">
            <h2 className="titulo-secao">
              Próximos <em>7 dias</em>
            </h2>
            {proximos === null && <p className="anim-respirar text-texto-suave">Carregando...</p>}
            {proximos?.length === 0 && (
              <Cartao>
                <p className="text-texto-suave">Nenhum post marcado para os próximos 7 dias.</p>
              </Cartao>
            )}
            <ul className="grid gap-3 md:grid-cols-2">
              {proximos?.map((p, n) => (
                <li key={p.id}>
                  <Revelar ordem={n}>
                    <Link
                      to={`/app/clientes/${p.cliente_id}?aba=calendario`}
                      className="flex items-center gap-4 rounded-md border border-linha bg-superficie p-3 shadow-suave transition duration-300 hover:-translate-y-0.5 hover:border-marrom hover:shadow-elevada"
                      style={{ borderLeft: `4px solid ${p.cliente?.cor_destaque ?? '#5C6B47'}` }}
                    >
                      <MiniaturaMidia midias={p.post_midias.map(paraVista)} alt="" className="h-16 w-16 shrink-0 rounded-sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs text-texto-suave">
                          {p.cliente?.nome} · {formatarData(p.data_publicacao).slice(0, 5)}
                        </span>
                        <span className="block truncate font-titulo text-xl font-semibold">{p.tema || 'Post sem título'}</span>
                        <SeloStatus status={p.status} />
                      </span>
                    </Link>
                  </Revelar>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {dona && <AtalhosPainel />}
    </div>
  )
}
