import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'

const link = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center border-b-2 px-1 text-sm ${
    isActive ? 'border-marrom text-marrom' : 'border-transparent text-texto-suave hover:text-texto'
  }`

export default function LayoutApp() {
  const { perfil, sair } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="border-b border-linha bg-superficie">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 px-4">
          <span className="py-3 font-titulo text-2xl font-semibold text-marrom">Sontag Media</span>
          <nav className="flex gap-5" aria-label="Principal">
            <NavLink to="/app" end className={link}>
              Painel
            </NavLink>
            <NavLink to="/app/clientes" className={link}>
              Clientes
            </NavLink>
          </nav>
          <div className="flex items-center gap-3 py-2 text-sm text-texto-suave">
            <span>{perfil?.nome}</span>
            <button
              onClick={() => void sair()}
              className="inline-flex min-h-11 cursor-pointer items-center px-2 underline"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
