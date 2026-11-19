import { useEffect, useState } from 'react'
import EstrategiaVisao from '../../componentes/EstrategiaVisao'
import { Aviso, Esqueleto } from '../../componentes/ui'
import { mesDeHoje, nomeDoMes } from '../../lib/datas'
import { usePortal } from '../../lib/portal'
import { supabase } from '../../lib/supabase'
import type { EstrategiaMensal } from '../../lib/tipos'

export default function PortalEstrategia() {
  const { token, dados } = usePortal()
  const [lista, setLista] = useState<EstrategiaMensal[] | null>(null)
  const [mes, setMes] = useState<string | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    supabase.rpc('portal_estrategias', { p_token: token }).then(({ data, error }) => {
      if (error) return setErro(true)
      const itens = ((data as EstrategiaMensal[]) ?? []).map((e) => ({ ...e, mes: e.mes.slice(0, 7) }))
      setLista(itens)
      // abre no mês atual; se não houver, no mais recente
      setMes((itens.find((e) => e.mes === mesDeHoje()) ?? itens[0])?.mes ?? null)
    })
  }, [token])

  if (erro) return <Aviso tipo="erro">Não foi possível carregar a estratégia.</Aviso>
  if (!lista) return <Esqueleto className="h-48" />
  if (lista.length === 0) return <p className="text-texto-suave">A estratégia do mês ainda está sendo preparada. Em breve ela aparece aqui.</p>
  const atual = lista.find((e) => e.mes === mes) ?? lista[0]

  return (
    <div className="space-y-8">
      {lista.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Meses">
          {lista.map((e) => (
            <button key={e.mes} role="tab" aria-selected={e.mes === atual.mes} onClick={() => setMes(e.mes)} className={`min-h-11 cursor-pointer rounded-full border px-4 text-sm first-letter:uppercase transition-colors ${e.mes === atual.mes ? 'border-marrom bg-superficie font-medium text-marrom' : 'border-linha text-texto-suave hover:bg-areia'}`}>
              {nomeDoMes(e.mes)}
            </button>
          ))}
        </div>
      )}
      <EstrategiaVisao e={{ ...atual, mes: `${atual.mes}-01` }} cor={dados?.cor_destaque} />
    </div>
  )
}
