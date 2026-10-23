import { useEffect, useState } from 'react'
import { Aviso } from '../../componentes/ui'
import { urlImagem, usePortal } from '../../lib/portal'
import { supabase } from '../../lib/supabase'

export default function PortalFeed() {
  const { token, posts } = usePortal()
  const [prints, setPrints] = useState<string[] | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    supabase.rpc('portal_feed', { p_token: token }).then(({ data, error }) => {
      if (error) setErro(true)
      else setPrints((data as string[]) ?? [])
    })
  }, [token])

  // mais recente primeiro, como no Instagram
  const novos = posts
    .filter((p) => p.status === 'aprovado' || p.status === 'agendado')
    .sort((a, b) => b.data_publicacao.localeCompare(a.data_publicacao))

  return (
    <div className="space-y-4">
      <h2 className="font-titulo text-3xl font-semibold text-marrom">Prévia do feed</h2>
      <p className="text-sm text-texto-suave">
        Os posts aprovados e agendados aparecem no topo, com o selo. Abaixo ficam os posts que já estão publicados no perfil.
      </p>
      {erro && <Aviso tipo="erro">Não foi possível carregar o feed atual.</Aviso>}
      <ul className="mx-auto grid max-w-md grid-cols-3 gap-0.5 bg-linha" aria-label="Grade do feed">
        {novos.map((p) => (
          <li key={p.id} className="relative aspect-[4/5] overflow-hidden bg-superficie">
            {p.midias[0] ? (
              <img src={urlImagem(p.midias[0])} alt={p.tema || 'Post'} loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center p-1 text-center text-xs text-texto-suave">{p.tema || 'Post'}</span>
            )}
            <span className="absolute left-1 top-1 rounded-sm bg-musgo px-1 text-[11px] leading-tight text-superficie">
              {p.status === 'aprovado' ? 'Aprovado' : 'Agendado'}
            </span>
          </li>
        ))}
        {prints?.map((c) => (
          <li key={c} className="aspect-[4/5] overflow-hidden bg-superficie">
            <img src={urlImagem(c)} alt="Post já publicado" loading="lazy" className="h-full w-full object-cover" />
          </li>
        ))}
      </ul>
      {novos.length === 0 && (prints?.length ?? 0) === 0 && prints !== null && (
        <p className="text-center text-texto-suave">Ainda não há posts para mostrar no feed.</p>
      )}
    </div>
  )
}
