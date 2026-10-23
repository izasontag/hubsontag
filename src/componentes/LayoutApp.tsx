import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const link = ({ isActive }: { isActive: boolean }) =>
  `relative inline-flex min-h-11 shrink-0 items-center px-1 text-sm tracking-wide transition-colors duration-200 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:bg-marrom after:transition-transform after:duration-300 ${
    isActive
      ? 'text-marrom after:scale-x-100'
      : 'text-texto-suave after:scale-x-0 hover:text-texto hover:after:scale-x-50'
  }`

export default function LayoutApp() {
  const { perfil, sair } = useAuth()
  const { pathname } = useLocation()
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-linha bg-superficie/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-4">
          <NavLink to="/app" end className="py-3 font-titulo text-3xl font-semibold leading-none text-marrom">
            Sontag <em className="font-medium">Media</em>
          </NavLink>
          <nav className="flex gap-5 overflow-x-auto" aria-label="Principal">
            <NavLink to="/app" end className={link}>
              Painel
            </NavLink>
            <NavLink to="/app/clientes" className={link}>
              Clientes
            </NavLink>
            <NavLink to="/app/calendario" className={link}>
              Calendário
            </NavLink>
            <NavLink to="/app/ideias" className={link}>
              Ideias
            </NavLink>
            <NavLink to="/app/tarefas" className={link}>
              Tarefas
            </NavLink>
            {perfil?.papel === 'dona' && (
              <NavLink to="/app/financeiro" className={link}>
                Financeiro
              </NavLink>
            )}
          </nav>
          <div className="flex items-center gap-3 py-2 text-sm text-texto-suave">
            <span>{perfil?.nome}</span>
            <button onClick={() => void sair()} className="inline-flex min-h-11 cursor-pointer items-center px-2 underline decoration-linha underline-offset-4 transition-colors hover:text-marrom">
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div key={pathname} className="anim-entrar">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
