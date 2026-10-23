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
  `group relative flex min-h-11 items-center gap-3 rounded-full px-4 text-sm tracking-wide transition duration-200 ${
    isActive ? 'bg-azul-claro font-medium text-azul-escuro shadow-suave' : 'text-texto-suave hover:bg-azul-pastel hover:text-texto'
  }`

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="eyebrow px-4 pb-1 pt-5">{titulo}</p>
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
    <NavLink to="/app" end className="block px-6 pb-3 pt-8 text-marrom-escuro">
      <span className="block font-titulo text-3xl font-semibold leading-none">Sontag</span>
      <span className="script -mt-1 block text-4xl text-azul">Media</span>
      <span className="eyebrow mt-2 block !text-[0.6rem]">Storymaker &amp; Marketing</span>
    </NavLink>
  )
}

function Rodape() {
  const { perfil, sair } = useAuth()
  return (
    <div className="mx-3 mb-3 flex items-center justify-between gap-3 rounded-full bg-areia px-5 py-2 text-sm">
      <span className="min-w-0 truncate text-texto-suave">{perfil?.nome}</span>
      <button onClick={() => void sair()} className="inline-flex min-h-11 cursor-pointer items-center px-1 underline decoration-linha underline-offset-4 transition-colors hover:text-azul">
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
      {/* computador: barra lateral fixa, com borda festonada */}
      <aside className="nao-imprimir festao-direita sticky top-0 z-30 hidden h-screen flex-col bg-superficie lg:flex">
        <Marca />
        <Navegacao />
        <Rodape />
      </aside>

      {/* celular: barra de cima com botão de menu */}
      <header className="nao-imprimir festao-baixo sticky top-0 z-40 flex items-center justify-between bg-superficie px-4 lg:hidden">
        <NavLink to="/app" end className="py-3 text-marrom-escuro">
          <span className="font-titulo text-3xl font-semibold leading-none">Sontag</span> <span className="script text-4xl text-azul">Media</span>
        </NavLink>
        <button type="button" onClick={() => setAberto(true)} aria-label="Abrir menu" aria-expanded={aberto} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-azul-escuro transition-colors hover:bg-azul-pastel">
          <IconeMenu />
        </button>
      </header>

      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" onClick={() => setAberto(false)} className="modal-fundo absolute inset-0 cursor-default bg-texto/50 backdrop-blur-[2px]" />
          <div className="anim-gaveta festao-direita relative flex h-full w-72 max-w-[85%] flex-col bg-superficie shadow-elevada">
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="absolute right-2 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-texto-suave hover:bg-azul-pastel hover:text-azul-escuro">
              <IconeFechar />
            </button>
            <Marca />
            <Navegacao />
            <Rodape />
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-10 sm:px-8 lg:px-14 lg:py-12">
        <div key={pathname} className="anim-entrar mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
