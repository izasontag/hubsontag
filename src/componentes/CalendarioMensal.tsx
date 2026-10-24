import { DIAS_SEMANA_CURTO, diaSemanaLongo, diasDoMes, dataDeHoje, nomeDoMes, somarMeses } from '../lib/datas'
import { Link } from 'react-router-dom'
import type { Evento, PostCompleto, Tag } from '../lib/tipos'
import CartaoPost from './CartaoPost'
import { btnSecundario } from './ui'

interface Props {
  mes: string
  posts: PostCompleto[]
  tags: Tag[]
  mostrarCliente?: boolean
  eventos?: Evento[]
  onNovo: (data: string) => void
  onAbrir: (post: PostCompleto) => void
}

export function NavegacaoMes({ mes, onMes }: { mes: string; onMes: (m: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button className={btnSecundario} onClick={() => onMes(somarMeses(mes, -1))} aria-label="Mês anterior">
        &larr;
      </button>
      <h2 className="min-w-44 text-center font-titulo text-2xl font-semibold text-marrom">{nomeDoMes(mes)}</h2>
      <button className={btnSecundario} onClick={() => onMes(somarMeses(mes, 1))} aria-label="Próximo mês">
        &rarr;
      </button>
    </div>
  )
}

function ChipEvento({ e }: { e: Evento }) {
  return (
    <Link
      to={`/app/eventos/${e.id}`}
      className="block min-h-11 rounded-md border border-dashed border-oliva bg-areia px-2 py-1.5 text-xs leading-snug text-marrom-escuro transition-transform duration-200 hover:-translate-y-0.5 lg:min-h-0"
    >
      <span className="eyebrow !text-[0.6rem]">{e.categoria ?? 'Evento'}{e.horario ? ` · ${e.horario.slice(0, 5)}` : ''}</span>
      <span className="block font-medium">{e.nome}</span>
    </Link>
  )
}

export default function CalendarioMensal({ mes, posts, tags, mostrarCliente, eventos = [], onNovo, onAbrir }: Props) {
  const dias = diasDoMes(mes)
  const hoje = dataDeHoje()
  const porDia = (data: string) => posts.filter((p) => p.data_publicacao === data)
  const eventosDoDia = (data: string) => eventos.filter((e) => e.data_evento === data)
  const cartao = (p: PostCompleto, vertical = false) => (
    <CartaoPost
      key={p.id}
      vertical={vertical}
      post={p}
      tags={tags}
      mostrarCliente={mostrarCliente}
      onAbrir={onAbrir}
    />
  )

  return (
    <>
      {/* Computador: grade do mês */}
      <div className="hidden lg:block">
        <div className="grid grid-cols-7 gap-px border border-linha bg-linha">
          {DIAS_SEMANA_CURTO.map((d) => (
            <div key={d} className="bg-fundo px-2 py-1 text-xs uppercase tracking-wide text-texto-suave">
              {d}
            </div>
          ))}
          {Array.from({ length: dias[0].diaSemana }, (_, i) => (
            <div key={`v${i}`} className="bg-fundo" />
          ))}
          {dias.map((d) => (
            <div
              key={d.data}
              className={`min-h-28 space-y-1 p-1.5 ${d.data === hoje ? 'bg-fundo ring-2 ring-inset ring-musgo' : 'bg-superficie'}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm ${d.data === hoje ? 'font-semibold text-musgo' : 'text-texto-suave'}`}>
                  {d.dia}
                </span>
                <button
                  type="button"
                  onClick={() => onNovo(d.data)}
                  aria-label={`Novo post em ${d.dia}`}
                  className="h-7 w-7 cursor-pointer rounded-sm text-texto-suave hover:bg-fundo hover:text-marrom"
                >
                  +
                </button>
              </div>
              {eventosDoDia(d.data).map((e) => <ChipEvento key={e.id} e={e} />)}
              {porDia(d.data).map((p) => cartao(p, true))}
            </div>
          ))}
        </div>
      </div>

      {/* Celular: lista por dia */}
      <div className="space-y-4 lg:hidden">
        {posts.length === 0 && eventos.length === 0 && <p className="text-texto-suave">Nenhum post neste mês.</p>}
        {dias
          .filter((d) => porDia(d.data).length > 0 || eventosDoDia(d.data).length > 0)
          .map((d) => (
            <section key={d.data} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium capitalize text-texto-suave">
                  {diaSemanaLongo(d.data)}, {d.dia}
                </h3>
                <button type="button" onClick={() => onNovo(d.data)} className="min-h-11 cursor-pointer px-2 text-sm text-musgo underline">
                  Novo neste dia
                </button>
              </div>
              {eventosDoDia(d.data).map((e) => <ChipEvento key={e.id} e={e} />)}
              {porDia(d.data).map((p) => cartao(p))}
            </section>
          ))}
      </div>
    </>
  )
}
