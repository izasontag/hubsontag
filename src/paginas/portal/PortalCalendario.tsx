import { useEffect, useState } from 'react'
import { NavegacaoMes } from '../../componentes/CalendarioMensal'
import ConteudoPost, { FormComentario } from '../../componentes/portal/ConteudoPost'
import PainelDecisao from '../../componentes/portal/PainelDecisao'
import { ChipTag, SeloDesempenho, SeloStatus } from '../../componentes/Selos'
import { btnSecundario } from '../../componentes/ui'
import { DIAS_SEMANA_CURTO, dataDeHoje, diaSemanaLongo, diasDoMes, mesDeHoje } from '../../lib/datas'
import { MiniaturaMidia } from '../../componentes/Midias'
import { usePortal } from '../../lib/portal'
import { FORMATO_ROTULO } from '../../lib/tipos'
import type { PortalPost } from '../../lib/tipos'

function Cartao({ post, vertical, onAbrir }: { post: PortalPost; vertical?: boolean; onAbrir: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onAbrir(post.id)}
      className={`flex w-full cursor-pointer gap-2 rounded-sm border border-linha bg-superficie p-2 text-left hover:border-marrom ${vertical ? 'flex-col' : ''}`}
    >
      <MiniaturaMidia midias={post.midias} alt="" className={`shrink-0 rounded-sm ${vertical ? 'h-20 w-full' : 'h-12 w-12'}`} />
      <span className="w-full min-w-0 flex-1 space-y-1">
        <span className="block truncate text-sm text-texto">{post.tema || 'Post'}</span>
        <span className="block text-xs text-texto-suave">{FORMATO_ROTULO[post.formato]}</span>
        <span className="flex flex-wrap gap-1">
          <SeloStatus status={post.status} />
          {post.desempenho && <SeloDesempenho desempenho={post.desempenho} />}
          {post.tags.map((t) => (
            <ChipTag key={t.nome} tag={t} />
          ))}
        </span>
      </span>
    </button>
  )
}

export default function PortalCalendario() {
  const { posts } = usePortal()
  const [mes, setMes] = useState(mesDeHoje())
  const [aberto, setAberto] = useState<string | null>(null)
  const dias = diasDoMes(mes)
  const hoje = dataDeHoje()
  const doMes = posts.filter((p) => p.data_publicacao.startsWith(mes))
  const porDia = (d: string) => doMes.filter((p) => p.data_publicacao === d)
  const atual = posts.find((p) => p.id === aberto) ?? null

  useEffect(() => {
    if (!aberto) return
    const aoApertar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(null)
    document.addEventListener('keydown', aoApertar)
    return () => document.removeEventListener('keydown', aoApertar)
  }, [aberto])

  return (
    <div className="space-y-5">
      <h2 className="titulo-secao">Calendário</h2>
      <NavegacaoMes mes={mes} onMes={setMes} />

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
            <div key={d.data} className={`min-h-24 space-y-1 p-1.5 ${d.data === hoje ? 'bg-fundo ring-2 ring-inset ring-musgo' : 'bg-superficie'}`}>
              <span className={`text-sm ${d.data === hoje ? 'font-semibold text-musgo' : 'text-texto-suave'}`}>{d.dia}</span>
              {porDia(d.data).map((p) => (
                <Cartao key={p.id} post={p} vertical onAbrir={setAberto} />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        {doMes.length === 0 && <p className="text-texto-suave">Nenhum post neste mês.</p>}
        {dias
          .filter((d) => porDia(d.data).length > 0)
          .map((d) => (
            <section key={d.data} className="space-y-2">
              <h3 className="text-sm font-medium capitalize text-texto-suave">
                {diaSemanaLongo(d.data)}, {d.dia}
              </h3>
              {porDia(d.data).map((p) => (
                <Cartao key={p.id} post={p} onAbrir={setAberto} />
              ))}
            </section>
          ))}
      </div>

      {atual && (
        <div className="modal-fundo fixed inset-0 z-50 overflow-y-auto bg-texto/50 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-label={atual.tema || 'Post'}>
          <div className="modal-painel mx-auto min-h-full max-w-2xl bg-fundo p-4 sm:my-6 sm:min-h-0 sm:rounded-md sm:border sm:border-linha sm:p-6">
            <div className="mb-4 flex justify-end">
              <button type="button" className={btnSecundario} onClick={() => setAberto(null)}>
                Fechar
              </button>
            </div>
            <ConteudoPost post={atual}>
              {atual.status === 'em_aprovacao' ? <PainelDecisao post={atual} /> : <FormComentario post={atual} />}
            </ConteudoPost>
          </div>
        </div>
      )}
    </div>
  )
}
