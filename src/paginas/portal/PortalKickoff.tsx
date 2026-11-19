import { useEffect, useState } from 'react'
import KickoffVisao from '../../componentes/KickoffVisao'
import { Aviso, Esqueleto } from '../../componentes/ui'
import { usePortal } from '../../lib/portal'
import { supabase } from '../../lib/supabase'
import type { Kickoff } from '../../lib/tipos'

export default function PortalKickoff() {
  const { token, dados } = usePortal()
  const [k, setK] = useState<Kickoff | null | undefined>(undefined)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    supabase.rpc('portal_kickoff', { p_token: token }).then(({ data, error }) => {
      if (error) setErro(true)
      else setK((data as Kickoff | null) ?? null)
    })
  }, [token])

  if (erro) return <Aviso tipo="erro">Não foi possível carregar o kick-off.</Aviso>
  if (k === undefined) return <Esqueleto className="h-48" />
  if (k === null) return <p className="text-texto-suave">O kick-off ainda está sendo preparado. Em breve ele aparece aqui.</p>
  return <KickoffVisao k={k} cor={dados?.cor_destaque} />
}
