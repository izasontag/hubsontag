import type { Kickoff } from '../lib/tipos'
import { urlPublica } from '../lib/midias'
import { formatarData } from './ui'
import Texto from './Texto'

type Dados = Pick<Kickoff, 'data_inicio' | 'resumo' | 'diagnostico' | 'pontos_fortes' | 'oportunidades' | 'metricas' | 'prints'>

const numero = (t: string) => {
  const n = Number(t.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && /\d/.test(t) ? n : null
}

// "Ponto de partida": como o perfil estava no início do trabalho. `urlDe` deixa a dona ver as imagens antes de publicar.
export default function KickoffVisao({ k, cor, urlDe }: { k: Dados; cor?: string; urlDe?: (caminho: string) => string | undefined }) {
  const destaque = cor || 'var(--color-azul)'
  const url = urlDe ?? urlPublica
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <p className="eyebrow">Ponto de partida{k.data_inicio ? ` · ${formatarData(k.data_inicio)}` : ''}</p>
        <h2 className="titulo-pagina">Kick-off: <em>como começamos</em></h2>
      </header>

      {k.resumo && (
        <section className="rounded-[18px] border-l-4 bg-superficie p-5 shadow-suave" style={{ borderLeftColor: destaque }}>
          <p className="whitespace-pre-wrap font-titulo text-2xl leading-snug">{k.resumo}</p>
        </section>
      )}

      {k.metricas.length > 0 && (
        <section className="space-y-3" aria-label="Números do perfil">
          <h3 className="titulo-sub">Os números: <em>início e agora</em></h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {k.metricas.map((m, i) => {
              const a = numero(m.inicio)
              const b = numero(m.atual)
              const delta = a !== null && b !== null && a !== 0 ? Math.round(((b - a) / Math.abs(a)) * 100) : null
              return (
                <li key={`${m.nome}-${i}`} className="rounded-[14px] border border-linha bg-superficie p-4">
                  <p className="eyebrow">{m.nome}</p>
                  <p className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="numeros-grandes text-2xl text-texto-suave">{m.inicio || '-'}</span>
                    <span aria-hidden className="text-texto-suave">&rarr;</span>
                    <span className="numeros-grandes text-3xl">{m.atual || '-'}</span>
                    {delta !== null && delta !== 0 && (
                      <span className={`rounded-full px-2 text-xs ${delta > 0 ? 'bg-musgo-claro text-musgo' : 'bg-marrom-claro text-marrom'}`}>{delta > 0 ? '+' : ''}{delta}%</span>
                    )}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {k.diagnostico && (
        <section className="space-y-3" aria-label="Diagnóstico">
          <h3 className="titulo-sub">Diagnóstico <em>do perfil</em></h3>
          <div className="rounded-[18px] border border-linha bg-superficie p-5 sm:p-7"><Texto texto={k.diagnostico} /></div>
        </section>
      )}

      {(k.pontos_fortes || k.oportunidades) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {k.pontos_fortes && (
            <div className="rounded-[18px] border border-linha bg-musgo-claro p-5">
              <p className="eyebrow mb-2">O que já funcionava</p>
              <Texto texto={k.pontos_fortes} />
            </div>
          )}
          {k.oportunidades && (
            <div className="rounded-[18px] border border-linha bg-marrom-claro p-5">
              <p className="eyebrow mb-2">Onde vamos melhorar</p>
              <Texto texto={k.oportunidades} />
            </div>
          )}
        </section>
      )}

      {k.prints.length > 0 && (
        <section className="space-y-3" aria-label="Prints do perfil no início">
          <h3 className="titulo-sub">O perfil <em>no início</em></h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {k.prints.map((c) => {
              const u = url(c)
              return (
                <li key={c} className="overflow-hidden rounded-[14px] border border-linha bg-areia">
                  {u && (
                    <a href={u} target="_blank" rel="noreferrer noopener" aria-label="Abrir print em tamanho grande">
                      <img src={u} alt="Print do perfil no início do trabalho" loading="lazy" className="h-full w-full object-cover" />
                    </a>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </article>
  )
}
