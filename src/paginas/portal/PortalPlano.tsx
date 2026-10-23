import { useEffect, useState } from 'react'
import { Aviso, Cartao, formatarData, Titulo } from '../../componentes/ui'
import { usePortal } from '../../lib/portal'
import { supabase } from '../../lib/supabase'
import { STATUS_TAREFA_ROTULO, TIPO_TAREFA_ROTULO } from '../../lib/tipos'
import type { PortalTarefa } from '../../lib/tipos'

function Item({ t }: { t: PortalTarefa }) {
  const feito = t.status === 'feito'
  return (
    <li className="flex flex-wrap items-start justify-between gap-2 py-3">
      <div className="min-w-48 flex-1">
        <p className={feito ? 'text-texto-suave line-through' : 'text-texto'}>{t.titulo}</p>
        <p className="text-xs text-texto-suave">
          {TIPO_TAREFA_ROTULO[t.tipo]} · {t.responsavel === 'cliente' ? 'Com você' : 'Com a Sontag'}
          {t.data && ` · ${formatarData(t.data)}`}
        </p>
        {t.material && (
          <a href={t.material} target="_blank" rel="noreferrer noopener" className="inline-flex min-h-11 items-center text-sm text-musgo underline">
            Abrir material
          </a>
        )}
      </div>
      <span className={`rounded-sm border px-1.5 py-0.5 text-xs ${feito ? 'border-musgo bg-musgo text-superficie' : 'border-linha text-texto-suave'}`}>
        {STATUS_TAREFA_ROTULO[t.status]}
      </span>
    </li>
  )
}

export default function PortalPlano() {
  const { token } = usePortal()
  const [itens, setItens] = useState<PortalTarefa[] | null>(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    supabase.rpc('portal_tarefas', { p_token: token }).then(({ data, error }) => {
      if (error) setErro(true)
      else setItens((data as PortalTarefa[]) ?? [])
    })
  }, [token])

  const abertas = (itens ?? []).filter((t) => t.status !== 'feito')
  const feitas = (itens ?? []).filter((t) => t.status === 'feito')

  return (
    <div className="space-y-6">
      <h2 className="titulo-secao">Plano de ação</h2>
      {erro && <Aviso tipo="erro">Não foi possível carregar o plano de ação.</Aviso>}
      {itens?.length === 0 && <p className="text-texto-suave">Ainda não há itens no plano de ação.</p>}
      {abertas.length > 0 && (
        <Cartao>
          <Titulo>Em andamento</Titulo>
          <ul className="divide-y divide-linha">
            {abertas.map((t) => (
              <Item key={t.id} t={t} />
            ))}
          </ul>
        </Cartao>
      )}
      {feitas.length > 0 && (
        <Cartao>
          <Titulo>Concluídos</Titulo>
          <ul className="divide-y divide-linha">
            {feitas.map((t) => (
              <Item key={t.id} t={t} />
            ))}
          </ul>
        </Cartao>
      )}
    </div>
  )
}
