import { useEffect, useState } from 'react'
import { Aviso, Cartao } from '../../componentes/ui'
import { nomeDoMes } from '../../lib/datas'
import { usePortal } from '../../lib/portal'
import { supabase } from '../../lib/supabase'

interface Relatorio {
  mes: string
  resumo: string | null
  destaques: string | null
  proximos_passos: string | null
}

export default function PortalRelatorios() {
  const { token } = usePortal()
  const [itens, setItens] = useState<Relatorio[] | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    supabase.rpc('portal_relatorios', { p_token: token }).then(({ data, error }) => {
      if (error) setErro(true)
      else setItens((data as Relatorio[]) ?? [])
    })
  }, [token])

  const blocos: [keyof Relatorio, string][] = [
    ['resumo', 'Resumo'],
    ['destaques', 'Destaques'],
    ['proximos_passos', 'Próximos passos'],
  ]

  return (
    <div className="space-y-4">
      <h2 className="titulo-secao">Relatórios</h2>
      {erro && <Aviso tipo="erro">Não foi possível carregar os relatórios.</Aviso>}
      {itens?.length === 0 && <p className="text-texto-suave">Os relatórios mensais aparecem aqui.</p>}
      {itens?.map((r) => (
        <Cartao key={r.mes} className="space-y-3">
          <h3 className="font-titulo text-2xl font-semibold">{nomeDoMes(r.mes.slice(0, 7))}</h3>
          {blocos.map(([campo, rotulo]) =>
            r[campo] ? (
              <div key={campo}>
                <h4 className="text-sm font-medium text-texto-suave">{rotulo}</h4>
                <p className="whitespace-pre-wrap">{r[campo]}</p>
              </div>
            ) : null,
          )}
        </Cartao>
      ))}
    </div>
  )
}
