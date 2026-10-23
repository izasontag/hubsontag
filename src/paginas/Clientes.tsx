import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { textoSobre } from '../componentes/animacao'
import { Aviso, btnPrimario, CabecalhoPagina, Esqueleto, inputCls, STATUS_ROTULO } from '../componentes/ui'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { contagem } from '../lib/datas'
import type { Cliente, Evento } from '../lib/tipos'

export const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')

export default function Clientes() {
  const { perfil } = useAuth()
  const [clientes, setClientes] = useState<Cliente[] | null>(null)
  const [eventos, setEventos] = useState<Evento[]>([])
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')

  useEffect(() => {
    supabase
      .from('clientes')
      .select('*')
      .order('nome')
      .then(({ data, error }) => {
        if (error) setErro('Não foi possível carregar os clientes.')
        else setClientes(data as Cliente[])
      })
  }, [])

  // clientes de eventos contam como clientes normais da carteira
  useEffect(() => {
    supabase
      .from('eventos')
      .select('*')
      .neq('status', 'cancelado')
      .order('data_evento')
      .then(({ data }) => setEventos((data as Evento[]) ?? []))
  }, [])

  const termo = busca.trim().toLowerCase()
  const visiveis = (clientes ?? []).filter((c) => !termo || `${c.nome} ${c.instagram ?? ''} ${c.nicho ?? ''}`.toLowerCase().includes(termo))

  const eventosVisiveis = eventos.filter((e) => !termo || `${e.nome} ${e.categoria ?? ''}`.toLowerCase().includes(termo))
  const total = (clientes?.length ?? 0) + eventos.length

  return (
    <div className="space-y-8">
      <CabecalhoPagina
        rotulo={clientes ? `${total} ${total === 1 ? 'cliente' : 'clientes'}` : 'Carteira'}
        titulo="Clientes"
        acoes={
          perfil?.papel === 'dona' ? (
            <Link to="/app/clientes/novo" className={btnPrimario}>
              Novo cliente
            </Link>
          ) : undefined
        }
      />
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      {clientes && total > 4 && (
        <label className="block max-w-sm text-sm text-texto-suave">
          Buscar cliente
          <input className={`${inputCls} mt-1`} value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
      )}
      {clientes === null && !erro && (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Carregando clientes">
          {[0, 1, 2].map((n) => (
            <li key={n}>
              <Esqueleto className="h-44" />
            </li>
          ))}
        </ul>
      )}
      {clientes?.length === 0 && <p className="text-texto-suave">Nenhum cliente cadastrado ainda.</p>}
      <ul className="grid gap-x-6 gap-y-9 pt-4 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map((c, n) => (
          <li key={c.id} className="anim-entrar" style={{ '--i': n } as CSSProperties}>
            <Link
              to={`/app/clientes/${c.id}`}
              className="pasta group flex min-h-44 flex-col gap-4 p-5 pt-6"
              style={{ '--cor': c.cor_destaque } as CSSProperties}
            >
              <span className="flex items-center gap-4">
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-medium outline-[3px] outline-offset-[3px] outline-dotted transition-transform duration-300 group-hover:scale-105"
                  style={{ background: c.cor_destaque, color: textoSobre(c.cor_destaque), outlineColor: c.cor_destaque }}
                >
                  {iniciais(c.nome)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-titulo text-2xl font-semibold leading-tight text-texto">{c.nome}</span>
                  {c.instagram && <span className="block truncate text-sm text-texto-suave">{c.instagram}</span>}
                </span>
              </span>
              {c.nicho && <span className="text-sm text-texto-suave">{c.nicho}</span>}
              <span className="mt-auto flex items-center justify-between text-xs uppercase tracking-[0.16em] text-texto-suave">
                <span className="flex items-center gap-2">
                  <span aria-hidden className={`h-2 w-2 rounded-full ${c.status === 'ativo' ? 'bg-musgo' : c.status === 'pausado' ? 'bg-linha' : 'bg-marrom'}`} />
                  {STATUS_ROTULO[c.status]}
                </span>
                <span aria-hidden className="text-base transition-transform duration-300 group-hover:translate-x-1 group-hover:text-azul">
                  &rarr;
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {eventosVisiveis.length > 0 && (
        <section className="space-y-4" aria-label="Clientes de eventos">
          <h2 className="titulo-sub">
            Clientes de <em>eventos</em>
          </h2>
          <ul className="grid gap-x-6 gap-y-9 pt-2 sm:grid-cols-2 lg:grid-cols-3">
            {eventosVisiveis.map((e, n) => (
              <li key={e.id} className="anim-entrar" style={{ '--i': n } as CSSProperties}>
                <Link to={`/app/eventos/${e.id}`} className="pasta group flex min-h-36 flex-col gap-3 p-5 pt-6" style={{ '--cor': 'var(--color-oliva)' } as CSSProperties}>
                  <span className="flex items-center gap-4">
                    <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-areia text-base font-medium text-marrom-escuro outline-[3px] outline-offset-[3px] outline-dotted outline-oliva">
                      {iniciais(e.nome)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-titulo text-2xl font-semibold leading-tight text-texto">{e.nome}</span>
                      <span className="block truncate text-sm text-texto-suave">{e.categoria ?? 'Evento'}</span>
                    </span>
                  </span>
                  <span className="mt-auto flex items-center justify-between text-xs uppercase tracking-[0.16em] text-texto-suave">
                    <span>{contagem(e.data_evento)}</span>
                    <span aria-hidden className="text-base transition-transform duration-300 group-hover:translate-x-1">&rarr;</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
