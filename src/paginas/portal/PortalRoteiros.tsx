import { useCallback, useEffect, useState } from 'react'
import RoteirosAprovacao from '../../componentes/portal/RoteirosAprovacao'
import { Aviso, Esqueleto } from '../../componentes/ui'
import { mensagemDeErro, usePortal } from '../../lib/portal'
import { supabase } from '../../lib/supabase'
import type { PortalRoteiro } from '../../lib/tipos'

export default function PortalRoteiros() {
  const { token, recarregar } = usePortal()
  const [lista, setLista] = useState<PortalRoteiro[] | null>(null)
  const [erro, setErro] = useState(false)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase.rpc('portal_roteiros', { p_token: token })
    if (error) return setErro(true)
    setLista((data as PortalRoteiro[]) ?? [])
  }, [token])

  useEffect(() => {
    void carregar()
  }, [carregar])

  async function decidir(id: string, decisao: 'aprovado' | 'ajuste_pedido', mensagem: string) {
    const { error } = await supabase.rpc('portal_roteiro_decidir', { p_token: token, p_roteiro: id, p_decisao: decisao, p_mensagem: mensagem })
    if (error) return error.message?.includes('roteiro_indisponivel') ? 'Este roteiro já foi respondido. Atualize a página.' : mensagemDeErro(error)
    await carregar()
    void recarregar()
    return null
  }

  if (erro) return <Aviso tipo="erro">Não foi possível carregar os roteiros.</Aviso>
  if (!lista) return <Esqueleto className="h-48" />
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="eyebrow">Para você aprovar</p>
        <h2 className="titulo-pagina">Roteiros</h2>
        <p className="max-w-2xl text-texto-suave">Leia cada roteiro e aprove, ou peça o ajuste que quiser. Os que você já respondeu ficam guardados aqui, por mês.</p>
      </header>
      {lista.length === 0 ? <p className="text-texto-suave">Quando a Sontag enviar um roteiro para a sua aprovação, ele aparece aqui.</p> : <RoteirosAprovacao roteiros={lista} decidir={decidir} />}
    </div>
  )
}
