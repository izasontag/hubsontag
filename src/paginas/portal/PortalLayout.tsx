import { NavLink, Outlet, useLocation, useParams } from 'react-router-dom'
import Aneis from '../../componentes/Aneis'
import { textoSobre } from '../../componentes/animacao'
import { Carimbo, Ticker } from '../../componentes/Decor'
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
          <p className="eyebrow mb-3">Sontag</p>
          <h1 className="titulo-pagina">
            Link <em>indisponível</em>
          </h1>
          <p className="mt-4 text-texto-suave">Este link não está ativo. Peça um novo link à Sontag.</p>
        </div>
      </main>
    )
  }

  const cor = dados.cor_destaque
  const aguardando = posts.filter((p) => p.status === 'em_aprovacao').length
  const base = `/portal/${token}`
  const link = ({ isActive }: { isActive: boolean }) =>
    `inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-sm tracking-wide transition duration-200 ${
      isActive ? 'bg-azul-claro font-medium text-azul-escuro' : 'text-texto-suave hover:bg-azul-pastel hover:text-texto'
    }`

  return (
    <div className="min-h-screen">
      <header className="nao-imprimir festao-baixo relative z-10" style={{ background: cor, color: textoSobre(cor), '--festao': cor } as React.CSSProperties}>
        <div className="relative overflow-hidden">
          <Aneis className="absolute -right-28 -top-32 h-[30rem] w-[30rem] opacity-15" />
          <div className="relative mx-auto flex max-w-4xl items-center justify-between gap-6 px-4 pb-10 pt-9">
            <div className="min-w-0">
              <p className="eyebrow anim-aparecer" style={{ color: 'inherit', opacity: 0.85 }}>
                Sontag · Para que todos vejam e saibam
              </p>
              <h1 className="titulo-pagina anim-entrar mt-3" style={{ color: 'inherit', '--i': 1 } as React.CSSProperties}>
                {dados.nome}
              </h1>
              {(dados.instagram || dados.nicho) && (
                <p className="anim-entrar mt-3" style={{ opacity: 0.92, '--i': 2 } as React.CSSProperties}>
                  {[dados.instagram, dados.nicho].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <Carimbo iniciais={dados.nome.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('')} className="anim-entrar hidden h-32 w-auto shrink-0 rotate-6 opacity-90 sm:block" />
          </div>
          <Ticker itens={['Portal do cliente', dados.nome, 'Aprovações e calendário']} className="border-t border-current/25 py-2 text-[0.68rem] tracking-[0.25em] opacity-85" />
        </div>
      </header>
      <nav className="nao-imprimir sticky top-0 z-30 bg-superficie/95 pt-4 backdrop-blur-md" aria-label="Portal">
        <div className="mx-auto flex max-w-4xl gap-2 overflow-x-auto px-4 pb-2">
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
