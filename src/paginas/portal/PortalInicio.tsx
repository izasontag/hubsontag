import { Link } from 'react-router-dom'
import { Cartao, formatarData, Titulo } from '../../componentes/ui'
import { SeloStatus } from '../../componentes/Selos'
import { dataDeHoje } from '../../lib/datas'
import { usePortal } from '../../lib/portal'

const somarDias = (data: string, dias: number) => {
  const [a, m, d] = data.split('-').map(Number)
  const novo = new Date(a, m - 1, d + dias)
  return `${novo.getFullYear()}-${String(novo.getMonth() + 1).padStart(2, '0')}-${String(novo.getDate()).padStart(2, '0')}`
}

export default function PortalInicio() {
  const { token, dados, posts } = usePortal()
  const hoje = dataDeHoje()
  const aguardando = posts.filter((p) => p.status === 'em_aprovacao')
  const semana = posts.filter((p) => p.data_publicacao >= hoje && p.data_publicacao <= somarDias(hoje, 7))

  return (
    <div className="space-y-6">
      {(dados?.objetivo || dados?.suporte) && (
        <Cartao className="space-y-3">
          {dados.objetivo && (
            <div>
              <p className="text-sm text-texto-suave">Objetivo</p>
              <p className="whitespace-pre-wrap">{dados.objetivo}</p>
            </div>
          )}
          {dados.suporte && (
            <div>
              <p className="text-sm text-texto-suave">Suporte e atendimento</p>
              <p className="whitespace-pre-wrap">{dados.suporte}</p>
            </div>
          )}
        </Cartao>
      )}
      {dados?.recado && (
        <Cartao>
          <p className="text-sm text-texto-suave">Recado da Izadora</p>
          <p className="mt-1 whitespace-pre-wrap">{dados.recado}</p>
        </Cartao>
      )}
      <Cartao className="space-y-3">
        <Titulo>Esperando a sua aprovação</Titulo>
        {aguardando.length === 0 ? (
          <p className="text-texto-suave">Nenhum post esperando você no momento.</p>
        ) : (
          <>
            <ul className="divide-y divide-linha">
              {aguardando.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>{p.tema || 'Post'}</span>
                  <span className="text-sm text-texto-suave">{formatarData(p.data_publicacao)}</span>
                </li>
              ))}
            </ul>
            <Link to={`/portal/${token}/aprovacoes`} className="inline-flex min-h-11 items-center rounded-sm bg-marrom px-5 text-sm font-medium text-superficie">
              Ver e responder
            </Link>
          </>
        )}
      </Cartao>
      <Cartao className="space-y-3">
        <Titulo>Próximos posts da semana</Titulo>
        {semana.length === 0 ? (
          <p className="text-texto-suave">Nenhum post previsto para os próximos 7 dias.</p>
        ) : (
          <ul className="divide-y divide-linha">
            {semana.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="text-sm text-texto-suave">{formatarData(p.data_publicacao).slice(0, 5)} · </span>
                  {p.tema || 'Post'}
                </span>
                <SeloStatus status={p.status} />
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  )
}
