import type { EstrategiaMensal } from '../lib/tipos'
import { nomeDoMes } from '../lib/datas'
import { formatarData } from './ui'
import Texto from './Texto'

type Dados = Pick<EstrategiaMensal, 'mes' | 'titulo' | 'objetivo' | 'texto' | 'pilares' | 'metas' | 'datas'>

// Como a página de estratégia do mês aparece para o cliente (a mesma tela serve de prévia para a dona).
export default function EstrategiaVisao({ e, cor }: { e: Dados; cor?: string }) {
  const destaque = cor || 'var(--color-azul)'
  const total = e.pilares.reduce((t, p) => t + (Number(p.percentual) || 0), 0)
  return (
    <article className="space-y-8">
      <header className="space-y-2">
        <p className="eyebrow first-letter:uppercase">Estratégia de {nomeDoMes(e.mes.slice(0, 7))}</p>
        <h2 className="titulo-pagina">{e.titulo || nomeDoMes(e.mes.slice(0, 7))}</h2>
      </header>

      {e.objetivo && (
        <section className="rounded-[18px] border-l-4 bg-superficie p-5 shadow-suave" style={{ borderLeftColor: destaque }} aria-label="Objetivo do mês">
          <p className="eyebrow mb-1">Objetivo do mês</p>
          <p className="whitespace-pre-wrap font-titulo text-2xl leading-snug">{e.objetivo}</p>
        </section>
      )}

      {e.pilares.length > 0 && (
        <section className="space-y-3" aria-label="Pilares de conteúdo">
          <h3 className="titulo-sub">Pilares de <em>conteúdo</em></h3>
          <ul className="space-y-4">
            {e.pilares.map((p, i) => (
              <li key={`${p.nome}-${i}`} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{p.nome}</span>
                  {total > 0 && <span className="tabular-nums text-sm text-texto-suave">{Number(p.percentual) || 0}%</span>}
                </div>
                {total > 0 && (
                  <div className="h-2 rounded-full bg-areia" aria-hidden>
                    <div className="anim-crescer h-2 rounded-full" style={{ width: `${Math.min(100, Number(p.percentual) || 0)}%`, background: destaque }} />
                  </div>
                )}
                {p.descricao && <p className="text-sm text-texto-suave">{p.descricao}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {e.metas.length > 0 && (
        <section className="space-y-3" aria-label="Metas do mês">
          <h3 className="titulo-sub">Metas <em>do mês</em></h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {e.metas.map((m, i) => (
              <li key={`${m.nome}-${i}`} className="rounded-[14px] border border-linha bg-superficie p-4">
                <p className="eyebrow">{m.nome}</p>
                <p className="numeros-grandes mt-1 text-3xl">{m.alvo}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {e.datas.length > 0 && (
        <section className="space-y-3" aria-label="Datas importantes">
          <h3 className="titulo-sub">Datas <em>importantes</em></h3>
          <ul className="divide-y divide-linha rounded-[14px] border border-linha bg-superficie">
            {[...e.datas].sort((a, b) => a.data.localeCompare(b.data)).map((d, i) => (
              <li key={`${d.data}-${i}`} className="flex items-center gap-4 px-4 py-3">
                <span className="w-14 shrink-0 text-center">
                  <span className="numeros-grandes block text-2xl leading-none">{d.data.slice(8, 10)}</span>
                  <span className="eyebrow !text-[0.6rem]">{formatarData(d.data).slice(3, 5)}/{d.data.slice(2, 4)}</span>
                </span>
                <span>{d.titulo}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {e.texto && (
        <section aria-label="Detalhes da estratégia" className="rounded-[18px] border border-linha bg-superficie p-5 sm:p-7">
          <Texto texto={e.texto} />
        </section>
      )}
    </article>
  )
}
