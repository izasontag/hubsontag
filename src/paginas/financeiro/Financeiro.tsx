import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { CabecalhoPagina } from '../../componentes/ui'
import { useAuth } from '../../lib/auth'

const aba = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-16 flex-1 flex-col justify-center rounded-md border px-5 py-3 text-left transition duration-300 ${
    isActive ? 'border-marrom bg-superficie shadow-elevada' : 'border-linha bg-fundo text-texto-suave hover:-translate-y-0.5 hover:border-marrom hover:shadow-suave'
  }`

// Casca do financeiro: Agência e Pessoal são áreas separadas. Só a dona entra.
export default function Financeiro() {
  const { perfil } = useAuth()
  if (perfil && perfil.papel !== 'dona') return <Navigate to="/app" replace />

  return (
    <div className="space-y-8">
      <CabecalhoPagina rotulo="Só você vê esta área" titulo={<>Finan<em>ceiro</em></>} />
      <nav className="flex flex-col gap-3 sm:flex-row" aria-label="Áreas do financeiro">
        <NavLink to="/app/financeiro" end className={aba}>
          <span className="font-titulo text-2xl font-semibold leading-tight">Agência</span>
          <span className="text-sm text-texto-suave">Contratos, cobranças, despesas e projetos avulsos</span>
        </NavLink>
        <NavLink to="/app/financeiro/pessoal" className={aba}>
          <span className="font-titulo text-2xl font-semibold leading-tight">Pessoal</span>
          <span className="text-sm text-texto-suave">Suas entradas, saídas e metas, separadas da agência</span>
        </NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
