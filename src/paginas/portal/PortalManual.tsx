import { useEffect, useState } from 'react'
import { Aviso, btnSecundario, formatarData } from '../../componentes/ui'
import { usePortal } from '../../lib/portal'
import { supabase } from '../../lib/supabase'
import { CAPITULOS } from '../../lib/tipos'
import type { ChaveCapitulo } from '../../lib/tipos'

interface MetaPortal {
  nome: string
  valor_atual: number
  valor_meta: number
  prazo: string | null
}

interface Resposta {
  manual: Record<ChaveCapitulo, string | null> | null
  metas: MetaPortal[]
}

export default function PortalManual() {
  const { token, dados } = usePortal()
  const [resp, setResp] = useState<Resposta | null>(null)
  const [erro, setErro] = useState(false)
  const cor = dados?.cor_destaque ?? '#5C6B47'

  useEffect(() => {
    supabase.rpc('portal_manual', { p_token: token }).then(({ data, error }) => {
      if (error || !data) setErro(true)
      else setResp(data as Resposta)
    })
  }, [token])

  const capitulos = CAPITULOS.filter((c) => resp?.manual?.[c.chave]?.trim())

  return (
    <div className="space-y-8">
      <div className="nao-imprimir flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-titulo text-3xl font-semibold text-marrom">Manual da marca</h2>
        <button type="button" className={btnSecundario} onClick={() => window.print()}>
          Exportar em PDF
        </button>
      </div>
      {erro && <Aviso tipo="erro">Não foi possível carregar o manual.</Aviso>}
      {resp && capitulos.length === 0 && resp.metas.length === 0 && (
        <p className="text-texto-suave">O manual da marca ainda está sendo preparado.</p>
      )}
      <article className="space-y-10">
        <header className="hidden border-b border-linha pb-4 print:block">
          <p className="text-xs uppercase tracking-wide text-texto-suave">Manual da marca · Sontag Media</p>
          <h1 className="font-titulo text-4xl font-semibold">{dados?.nome}</h1>
        </header>
        {capitulos.map((c, i) => (
          <section key={c.chave} className="break-inside-avoid-page border-l-4 pl-5" style={{ borderColor: cor }}>
            <p className="text-xs uppercase tracking-wide text-texto-suave">Capítulo {i + 1}</p>
            <h3 className="font-titulo text-3xl font-semibold text-texto">{c.titulo}</h3>
            <p className="mt-3 max-w-prose whitespace-pre-wrap leading-relaxed">{resp?.manual?.[c.chave]}</p>
          </section>
        ))}
        {resp && resp.metas.length > 0 && (
          <section className="break-inside-avoid-page border-l-4 pl-5" style={{ borderColor: cor }}>
            <p className="text-xs uppercase tracking-wide text-texto-suave">Acompanhamento</p>
            <h3 className="font-titulo text-3xl font-semibold text-texto">Metas</h3>
            <ul className="mt-3 space-y-4">
              {resp.metas.map((m) => {
                const pct = m.valor_meta > 0 ? Math.min(100, Math.round((m.valor_atual / m.valor_meta) * 100)) : 0
                return (
                  <li key={m.nome} className="space-y-1">
                    <p>
                      {m.nome}
                      {m.prazo && <span className="text-sm text-texto-suave"> · até {formatarData(m.prazo)}</span>}
                    </p>
                    <div className="h-2 rounded-sm bg-linha" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.nome}: ${pct}%`}>
                      <div className="h-2 rounded-sm" style={{ width: `${pct}%`, background: cor }} />
                    </div>
                    <p className="text-sm text-texto-suave">
                      {m.valor_atual.toLocaleString('pt-BR')} de {m.valor_meta.toLocaleString('pt-BR')} ({pct}%)
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </article>
    </div>
  )
}
