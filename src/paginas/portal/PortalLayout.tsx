import { NavLink, Outlet, useParams } from 'react-router-dom'
import { PortalProvider, usePortal } from '../../lib/portal'

function Estrutura() {
  const { token, dados, posts, carregando, invalido } = usePortal()

  if (carregando) return <p className="p-8 text-texto-suave">Carregando...</p>
  if (invalido || !dados) {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-titulo text-3xl font-semibold text-marrom">Link indisponível</h1>
        <p className="mt-3 text-texto-suave">
          Este link não está ativo. Peça um novo link à Sontag Media.
        </p>
      </main>
    )
  }

  const aguardando = posts.filter((p) => p.status === 'em_aprovacao').length
  const base = `/portal/${token}`
  const link = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-11 shrink-0 items-center border-b-2 px-1 text-sm ${
      isActive ? 'border-marrom text-marrom' : 'border-transparent text-texto-suave hover:text-texto'
    }`

  return (
    <div className="min-h-screen">
      <header className="nao-imprimir border-b border-linha bg-superficie" style={{ borderTop: `4px solid ${dados.cor_destaque}` }}>
        <div className="mx-auto max-w-4xl px-4">
          <div className="py-3">
            <p className="text-xs uppercase tracking-wide text-texto-suave">Sontag Media</p>
            <h1 className="font-titulo text-3xl font-semibold text-texto">{dados.nome}</h1>
          </div>
          <nav className="-mx-4 flex gap-5 overflow-x-auto px-4" aria-label="Portal">
            <NavLink to={base} end className={link}>
              Início
            </NavLink>
            <NavLink to={`${base}/aprovacoes`} className={link}>
              Aprovações{aguardando > 0 ? ` (${aguardando})` : ''}
            </NavLink>
            <NavLink to={`${base}/feed`} className={link}>
              Prévia do feed
            </NavLink>
            <NavLink to={`${base}/calendario`} className={link}>
              Calendário
            </NavLink>
            <NavLink to={`${base}/manual`} className={link}>
              Manual da marca
            </NavLink>
            <NavLink to={`${base}/materiais`} className={link}>
              Materiais
            </NavLink>
            <NavLink to={`${base}/relatorios`} className={link}>
              Relatórios
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}

export default function PortalLayout() {
  const { token } = useParams()
  if (!token) return null
  return (
    <PortalProvider token={token}>
      <Estrutura />
    </PortalProvider>
  )
}
