import { lazy, Suspense, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { LogoCompleta } from './Logo'
import { Esqueleto } from './ui'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { useContadores } from '../lib/contadores'
import type { Contadores } from '../lib/contadores'
import { antecipar } from '../lib/paginas'
import { travar } from '../lib/trava'
import {
  IconeBusca,
  IconeCalendario,
  IconeClientes,
  IconeEquipe,
  IconeEventos,
  IconeFechar,
  IconeFinanceiro,
  IconeIdeias,
  IconePrecificacao,
  IconeMais,
  IconeMenu,
  IconePainel,
  IconeTarefas,
} from './Icones'

// partes pesadas só baixam quando usadas
const Paleta = lazy(() => import('./Paleta'))
const LancamentoRapido = lazy(() => import('./LancamentoRapido'))
const AssistenteIA = lazy(() => import('./AssistenteIA'))
const ASSISTENTE_LIGADO = import.meta.env.VITE_ASSISTENTE_IA === 'sim'

function Numero({ n, rotulo }: { n: number; rotulo: string }) {
  if (n <= 0) return null
  return (
    <span className="anim-surgir ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-mostarda px-1.5 text-xs font-medium text-marrom-escuro" role="status" aria-label={`${n} ${rotulo}`}>
      {n > 99 ? '99+' : n}
    </span>
  )
}

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

function Navegacao({ contadores }: { contadores: Contadores }) {
  const { perfil } = useAuth()
  const dona = perfil?.papel === 'dona'
  return (
    <nav aria-label="Principal" className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
      <NavLink to="/app" end className={item}>
        <IconePainel />
        Painel
      </NavLink>
      <Grupo titulo="Trabalho">
        <NavLink to="/app/clientes" className={item} onMouseEnter={() => antecipar('/app/clientes')} onTouchStart={() => antecipar('/app/clientes')}>
          <IconeClientes />
          Clientes
          <Numero n={contadores.ajustes} rotulo="posts com ajuste pedido" />
        </NavLink>
        <NavLink to="/app/calendario" className={item} onMouseEnter={() => antecipar('/app/calendario')} onTouchStart={() => antecipar('/app/calendario')}>
          <IconeCalendario />
          Calendário
        </NavLink>
        <NavLink to="/app/tarefas" className={item} onMouseEnter={() => antecipar('/app/tarefas')} onTouchStart={() => antecipar('/app/tarefas')}>
          <IconeTarefas />
          Tarefas
          <Numero n={contadores.tarefas} rotulo="tarefas atrasadas" />
        </NavLink>
        <NavLink to="/app/ideias" className={item} onMouseEnter={() => antecipar('/app/ideias')} onTouchStart={() => antecipar('/app/ideias')}>
          <IconeIdeias />
          Ideias
        </NavLink>
        {dona && (
          <NavLink to="/app/precificacao" className={item} onMouseEnter={() => antecipar('/app/precificacao')} onTouchStart={() => antecipar('/app/precificacao')}>
            <IconePrecificacao />
            Precificação
          </NavLink>
        )}
      </Grupo>
      <Grupo titulo="Coberturas">
        <NavLink to="/app/eventos" className={item} onMouseEnter={() => antecipar('/app/eventos')} onTouchStart={() => antecipar('/app/eventos')}>
          <IconeEventos />
          Eventos
        </NavLink>
      </Grupo>
      {dona && (
        <Grupo titulo="Agência">
          <NavLink to="/app/financeiro" className={item} onMouseEnter={() => antecipar('/app/financeiro')} onTouchStart={() => antecipar('/app/financeiro')}>
            <IconeFinanceiro />
            Financeiro
            <Numero n={contadores.financeiro} rotulo="contas atrasadas" />
          </NavLink>
          <NavLink to="/app/equipe" className={item} onMouseEnter={() => antecipar('/app/equipe')} onTouchStart={() => antecipar('/app/equipe')}>
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
    <NavLink to="/app" end className="block px-6 pb-3 pt-8" aria-label="Sontag, início">
      <LogoCompleta />
      <span className="eyebrow mt-3 block !text-[0.55rem]">Agência de conteúdo</span>
    </NavLink>
  )
}

function BotaoBusca() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('abrir-paleta'))}
      className="mx-3 mb-2 flex min-h-11 cursor-pointer items-center gap-3 rounded-full border border-linha bg-fundo px-4 text-sm text-texto-suave transition-colors hover:bg-areia"
    >
      <IconeBusca />
      <span className="flex-1 text-left">Buscar</span>
      <kbd className="hidden rounded-md border border-linha bg-superficie px-1.5 text-[0.65rem] lg:inline">Ctrl K</kbd>
    </button>
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
  const { perfil } = useAuth()
  const dona = perfil?.papel === 'dona'
  const [aberto, setAberto] = useState(false)
  const [paleta, setPaleta] = useState(false)
  const [rapido, setRapido] = useState(false)
  const contadores = useContadores(dona, pathname)

  // Ctrl+K (ou Cmd+K, ou "/") abre a busca rápida
  useEffect(() => {
    const abrir = () => setPaleta(true)
    const aoApertar = (e: KeyboardEvent) => {
      const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? '') || (e.target as HTMLElement)?.isContentEditable
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        setPaleta(true)
      } else if (e.key === '/' && !digitando) {
        e.preventDefault()
        setPaleta(true)
      }
    }
    window.addEventListener('abrir-paleta', abrir)
    document.addEventListener('keydown', aoApertar)
    return () => {
      window.removeEventListener('abrir-paleta', abrir)
      document.removeEventListener('keydown', aoApertar)
    }
  }, [])

  // o menu do celular fecha sozinho ao trocar de página ou apertar Esc
  useEffect(() => setAberto(false), [pathname])
  useEffect(() => {
    if (!aberto) return
    const aoApertar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false)
    document.addEventListener('keydown', aoApertar)
    const liberar = travar()
    return () => {
      document.removeEventListener('keydown', aoApertar)
      liberar()
    }
  }, [aberto])

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      {/* computador: barra lateral fixa, com borda festonada */}
      <aside className="nao-imprimir festao-direita sticky top-0 z-30 hidden h-screen flex-col bg-superficie lg:flex">
        <Marca />
        <BotaoBusca />
        <Navegacao contadores={contadores} />
        <Rodape />
      </aside>

      {/* celular: barra de cima com botão de menu */}
      <header className="nao-imprimir festao-baixo sticky top-0 z-40 flex items-center justify-between bg-superficie px-4 lg:hidden">
        <NavLink to="/app" end className="py-3" aria-label="Sontag, início">
          <LogoCompleta />
        </NavLink>
        <div className="flex items-center">
        <button type="button" onClick={() => setPaleta(true)} aria-label="Buscar" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-azul-escuro transition-colors hover:bg-azul-pastel">
          <IconeBusca />
        </button>
        <button type="button" onClick={() => setAberto(true)} aria-label="Abrir menu" aria-expanded={aberto} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-azul-escuro transition-colors hover:bg-azul-pastel">
          <IconeMenu />
        </button>
        </div>
      </header>

      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" onClick={() => setAberto(false)} className="modal-fundo absolute inset-0 cursor-default bg-texto/50 backdrop-blur-[2px]" />
          <div className="anim-gaveta festao-direita relative flex h-full w-72 max-w-[85%] flex-col bg-superficie shadow-elevada">
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar menu" className="absolute right-2 top-3 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-texto-suave hover:bg-azul-pastel hover:text-azul-escuro">
              <IconeFechar />
            </button>
            <Marca />
            <BotaoBusca />
            <Navegacao contadores={contadores} />
            <Rodape />
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-10 sm:px-8 lg:px-14 lg:py-12">
        <div key={pathname} className="anim-entrar mx-auto max-w-6xl">
          <Suspense fallback={<div className="space-y-4"><Esqueleto className="h-24" /><Esqueleto className="h-48" /></div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>

      <button
        type="button"
        onClick={() => setRapido(true)}
        aria-label="Lançamento rápido"
        className="nao-imprimir fixed bottom-24 right-4 z-40 flex h-14 cursor-pointer items-center gap-2 rounded-full bg-azul px-5 text-sm font-medium text-superficie shadow-elevada transition-transform duration-300 hover:-translate-y-0.5 active:scale-95 lg:bottom-6 lg:right-6"
      >
        <IconeMais />
        Lançar
      </button>
      <Suspense fallback={null}>
        {paleta && <Paleta dona={dona} onFechar={() => setPaleta(false)} onLancar={() => setRapido(true)} />}
        {rapido && <LancamentoRapido dona={dona} onFechar={() => setRapido(false)} />}
        {ASSISTENTE_LIGADO && <AssistenteIA />}
      </Suspense>
    </div>
  )
}
