import { Link } from 'react-router-dom'
import { Revelar } from '../../componentes/animacao'
import { SeloStatus } from '../../componentes/Selos'
import { Cartao, formatarData, Titulo } from '../../componentes/ui'
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
      <div>
        <p className="eyebrow mb-2">Bem-vindo ao seu espaço</p>
        <h2 className="titulo-secao">
          Tudo o que você precisa, <em>em um só lugar</em>
        </h2>
      </div>
      {(dados?.objetivo || dados?.suporte) && (
        <Revelar>
          <Cartao className="space-y-4">
            {dados.objetivo && (
              <div>
                <p className="eyebrow mb-1">Objetivo</p>
                <p className="whitespace-pre-wrap font-titulo text-2xl leading-snug">{dados.objetivo}</p>
              </div>
            )}
            {dados.suporte && (
              <div>
                <p className="eyebrow mb-1">Suporte e atendimento</p>
                <p className="whitespace-pre-wrap">{dados.suporte}</p>
              </div>
            )}
          </Cartao>
        </Revelar>
      )}
      {dados?.recado && (
        <Revelar ordem={1}>
          <Cartao className="border-l-4 border-l-marrom bg-marrom-claro">
            <p className="eyebrow mb-1">Recado da Izadora</p>
            <p className="whitespace-pre-wrap">{dados.recado}</p>
          </Cartao>
        </Revelar>
      )}
      <Revelar ordem={2}>
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
              <Link
                to={`/portal/${token}/aprovacoes`}
                className="inline-flex min-h-11 items-center rounded-sm bg-marrom px-5 text-sm font-medium tracking-wide text-superficie shadow-suave transition duration-200 hover:-translate-y-px hover:shadow-elevada"
              >
                Ver e responder
              </Link>
            </>
          )}
        </Cartao>
      </Revelar>
      <Revelar ordem={3}>
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
      </Revelar>
    </div>
  )
}
