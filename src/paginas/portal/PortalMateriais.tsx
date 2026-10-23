import { useEffect, useState } from 'react'
import { Aviso } from '../../componentes/ui'
import { usePortal } from '../../lib/portal'
import { supabase } from '../../lib/supabase'

interface Material {
  titulo: string
  tipo: 'briefing' | 'contrato' | 'identidade' | 'documento'
  link: string
}

const ROTULO = { briefing: 'Briefing', contrato: 'Contrato', identidade: 'Identidade', documento: 'Documento' }

export default function PortalMateriais() {
  const { token } = usePortal()
  const [itens, setItens] = useState<Material[] | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    supabase.rpc('portal_materiais', { p_token: token }).then(({ data, error }) => {
      if (error) setErro(true)
      else setItens((data as Material[]) ?? [])
    })
  }, [token])

  return (
    <div className="space-y-4">
      <h2 className="titulo-secao">Materiais</h2>
      {erro && <Aviso tipo="erro">Não foi possível carregar os materiais.</Aviso>}
      {itens?.length === 0 && <p className="text-texto-suave">Nenhum material compartilhado ainda.</p>}
      <ul className="divide-y divide-linha rounded-md border border-linha bg-superficie">
        {itens?.map((m) => (
          <li key={m.link} className="flex flex-wrap items-center justify-between gap-2 p-4">
            <span>
              {m.titulo} <span className="text-sm text-texto-suave">· {ROTULO[m.tipo]}</span>
            </span>
            <a href={m.link} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center text-musgo underline">
              Abrir
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
