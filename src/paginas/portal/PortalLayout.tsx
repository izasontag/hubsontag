import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import Aneis from '../../componentes/Aneis'
import { textoSobre } from '../../componentes/animacao'
import { Esqueleto } from '../../componentes/ui'
import { PortalProvider, usePortal } from '../../lib/portal'

function Estrutura() {
  const { token, dados, posts, carregando, invalido } = usePortal()
  const { pathname } = useLocation()

  if (carregando) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-16" role="status" aria-label="Carregando">
        <Esqueleto className="h-40" />
        <Esqueleto className="h-24" />
      </div>
    )
  }
  if (invalido || !dados) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-center">
        <Aneis className="absolute h-[40rem] w-[40rem] text-linha opacity-60" />
        <div className="anim-entrar relative max-w-md">
          <p className="eyebrow mb-3">Sontag Media</p>
          <h1 className="titulo-pagina">
            Link <em>indisponível</em>
          </h1>
          <p className="mt-4 text-texto-suave">Este link não está ativo. Peça um novo link à Sontag Media.</p>
        </div>
      </main>
    )
  }

  const cor = dados.cor_destaque
  const aguardando = posts.filter((p) => p.status === 'em_aprovacao').length
  const base = `/portal/${token}`
  const link = ({ isActive }: { isActive: boolean }) =>
    `relative inline-flex min-h-11 shrink-0 items-center px-1 text-sm tracking-wide transition-colors duration-200 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:bg-marrom after:transition-transform after:duration-300 ${
      isActive ? 'text-marrom after:scale-x-100' : 'text-texto-suave after:scale-x-0 hover:text-texto hover:after:scale-x-50'
    }`

  return (
    <div className="min-h-screen">
      <header className="nao-imprimir relative overflow-hidden" style={{ background: cor, color: textoSobre(cor) }}>
        <Aneis className="absolute -right-24 -top-28 h-[30rem] w-[30rem] opacity-20" />
        <div className="relative mx-auto max-w-4xl px-4 pb-10 pt-9">
          <p className="eyebrow anim-aparecer" style={{ color: 'inherit', opacity: 0.85 }}>
            Sontag Media · Storymaker &amp; Marketing
          </p>
          <h1 className="titulo-pagina anim-entrar mt-3" style={{ color: 'inherit', '--i': 1 } as React.CSSProperties}>
            {dados.nome}
          </h1>
          {(dados.instagram || dados.nicho) && (
            <p className="anim-entrar mt-3" style={{ opacity: 0.9, '--i': 2 } as React.CSSProperties}>
              {[dados.instagram, dados.nicho].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      </header>
      <nav className="nao-imprimir sticky top-0 z-40 border-b border-linha bg-superficie/90 backdrop-blur-md" aria-label="Portal">
        <div className="mx-auto flex max-w-4xl gap-5 overflow-x-auto px-4">
          <NavLink to={base} end className={link}>
            Início
          </NavLink>
          <NavLink to={`${base}/aprovacoes`} className={link}>
            Aprovações{aguardando > 0 ? ` (${aguardando})` : ''}
          </NavLink>
          <NavLink to={`${base}/feed`} className={link}>
            Prévia do feed
          </NavLink>
          <NavLink to={`${base}/plano`} className={link}>
            Plano de ação
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
        </div>
      </nav>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div key={pathname} className="anim-entrar">
          <Outlet />
        </div>
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
