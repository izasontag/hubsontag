import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  IconeCalendario,
  IconeClientes,
  IconeEquipe,
  IconeEventos,
  IconeFechar,
  IconeFinanceiro,
  IconeIdeias,
  IconeMenu,
  IconePainel,
  IconeTarefas,
} from './Icones'

const item = ({ isActive }: { isActive: boolean }) =>
  `group relative flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm tracking-wide transition-colors duration-200 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:origin-center before:rounded-full before:bg-marrom before:transition-transform before:duration-300 ${
    isActive ? 'bg-marrom-claro font-medium text-marrom before:scale-y-100' : 'text-texto-suave before:scale-y-0 hover:bg-fundo hover:text-texto hover:before:scale-y-50'
  }`

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="eyebrow px-3 pb-1 pt-4">{titulo}</p>
      {children}
    </div>
  )
}

function Navegacao() {
  const { perfil } = useAuth()
  const dona = perfil?.papel === 'dona'
  return (
    <nav aria-label="Principal" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
      <NavLink to="/app" end className={item}>
        <IconePainel />
        Painel
      </NavLink>
      <Grupo titulo="Trabalho">
        <NavLink to="/app/clientes" className={item}>
          <IconeClientes />
          Clientes
        </NavLink>
        <NavLink to="/app/calendario" className={item}>
          <IconeCalendario />
          Calendário
        </NavLink>
        <NavLink to="/app/tarefas" className={item}>
          <IconeTarefas />
          Tarefas
        </NavLink>
        <NavLink to="/app/ideias" className={item}>
          <IconeIdeias />
          Ideias
        </NavLink>
      </Grupo>
      <Grupo titulo="Casamentos">
        <NavLink to="/app/eventos" className={item}>
          <IconeEventos />
          Eventos
        </NavLink>
      </Grupo>
      {dona && (
        <Grupo titulo="Agência">
          <NavLink to="/app/financeiro" className={item}>
            <IconeFinanceiro />
            Financeiro
          </NavLink>
          <NavLink to="/app/equipe" className={item}>
            <IconeEquipe />
            Equipe
          </NavLink>
        </Grupo>
      )}
    </nav>
  )
}

function Marca() {
  return (
    <NavLink to="/app" end className="block px-6 pb-2 pt-7 font-titulo text-4xl font-semibold leading-none text-marrom">
      Sontag <em className="font-medium">Media</em>
      <span className="eyebrow mt-2 block !text-[0.62rem]">Storymaker &amp; Marketing</span>
    </NavLink>
  )
}

function Rodape() {
  const { perfil, sair } = useAuth()
  return (
    <div className="flex items-center justify-between gap-3 border-t border-linha px-6 py-4 text-sm">
      <span className="min-w-0 truncate text-texto-suave">{perfil?.nome}</span>
      <button onClick={() => void sair()} className="inline-flex min-h-11 cursor-pointer items-center px-1 underline decoration-linha underline-offset-4 transition-colors hover:text-marrom">
        Sair
      </button>
    </div>
  )
}

export default function LayoutApp() {
  const { pathname } = useLocation()
  const [aberto, setAberto] = useState(false)

  // o menu do celular fecha sozinho ao trocar de página ou apertar Esc
  useEffect(() => setAberto(false), [pathname])
  useEffect(() => {
    if (!aberto) return
    const aoApertar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('keydown', aoApertar)
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', aoApertar)
      document.body.style.overflow = anterior
    }
  }, [aberto])

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      {/* computador: barra lateral fixa */}
      <aside className="nao-imprimir sticky top-0 hidden h-screen flex-col border-r border-linha bg-superficie lg:flex">
        <Marca />
        <Navegacao />
        <Rodape />
      </aside>

      {/* celular: barra de cima com botão de menu */}
      <header className="nao-imprimir sticky top-0 z-40 flex items-center justify-between border-b border-linha bg-superficie/90 px-4 backdrop-blur-md lg:hidden">
        <NavLink to="/app" end className="py-3 font-titulo text-3xl font-semibold leading-none text-marrom">
          Sontag <em className="font-medium">Media</em>
        </NavLink>
        <button type="button" onClick={() => setAberto(true)} aria-label="Abrir menu" aria-expanded={aberto} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm text-marrom transition-colors hover:bg-fundo">
          <IconeMenu />
        </button>
      </header>

      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" onClick={() => setAberto(false)} className="modal-fundo absolute inset-0 cursor-default bg-texto/50 backdrop-blur-[2px]" />
          <div className="anim-gaveta relative flex h-full w-72 max-w-[85%] flex-col bg-superficie shadow-elevada">
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="absolute right-2 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-sm text-texto-suave hover:text-marrom">
              <IconeFechar />
            </button>
            <Marca />
            <Navegacao />
            <Rodape />
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div key={pathname} className="anim-entrar mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
